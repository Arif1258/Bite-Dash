import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { getChannel } from "./rabbitmq.js";

// We can define internal metrics updates here
export const startOrderEventsConsumer = async () => {
  const channel = getChannel();
  if (!channel) {
    console.warn("⚠️ RabbitMQ channel not available for order events consumer.");
    return;
  }

  console.log("📥 Starting to consume from: order_events_queue");

  channel.consume("order_events_queue", async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const { type, data } = event;
      console.log(`📥 Received Order Event: ${type} for orderId: ${data.orderId}`);

      // Process async tasks according to event types
      switch (type) {
        case "ORDER_CREATED":
          await runAnomalyCheck(data.orderId);
          break;

        case "PAYMENT_COMPLETED":
          await updateRestaurantActiveCount(data.restaurantId, 1);
          await updateRestaurantOrderCount(data.restaurantId, 1);
          break;

        case "ORDER_PREPARING":
          break;

        case "ORDER_READY":
          await handleRestaurantPrepCompleted(data.orderId, data.restaurantId);
          break;

        case "DRIVER_ASSIGNED":
          break;

        case "ORDER_PICKED_UP":
          break;

        case "ORDER_DELIVERED":
          await updateRestaurantActiveCount(data.restaurantId, -1);
          await handleOrderDeliveredMetrics(data.orderId);
          break;

        case "ORDER_CANCELLED":
          await updateRestaurantActiveCount(data.restaurantId, -1);
          await handleRestaurantCancellation(data.restaurantId);
          break;

        default:
          break;
      }

      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error in order events consumer:", err);
      // Requeue or ack depending on error nature. For now, ack to prevent loop.
      channel.ack(msg);
    }
  });
};

async function updateRestaurantActiveCount(restaurantId, delta) {
  try {
    if (!restaurantId) return;
    await Restaurant.findByIdAndUpdate(restaurantId, {
      $inc: { activeOrdersCount: delta }
    });
  } catch (err) {
    console.error("Error updating active order count:", err);
  }
}

async function handleRestaurantPrepCompleted(orderId, restaurantId) {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;
    const acceptTime = order.timeline.find(t => t.status === "accepted")?.timestamp;
    const readyTime = order.timeline.find(t => t.status === "ready_for_rider")?.timestamp;
    if (acceptTime && readyTime) {
      const durationMs = readyTime - acceptTime;
      const durationMin = Math.round(durationMs / 60000);
      
      const rest = await Restaurant.findById(restaurantId);
      if (rest) {
        const currentAverage = rest.averagePrepTime || 20;
        const newAverage = Math.round((currentAverage * 9 + durationMin) / 10); // rolling average
        await Restaurant.findByIdAndUpdate(restaurantId, {
          $set: { averagePrepTime: newAverage }
        });
      }
    }
  } catch (err) {
    console.error("Error updating restaurant prep time:", err);
  }
}

async function handleOrderDeliveredMetrics(orderId) {
  try {
    const OrderModel = (await import("../models/Order.js")).default;
    const UserPreferenceModel = (await import("../models/UserPreference.js")).default;
    const RestaurantModel = (await import("../models/Restaurant.js")).default;
    const mongoose = (await import("mongoose")).default;

    const order = await OrderModel.findById(orderId);
    if (!order) return;
    
    const pref = await UserPreferenceModel.findOneAndUpdate(
      { userId: order.userId },
      { $setOnInsert: { userId: order.userId } },
      { new: true, upsert: true }
    );
    
    const itemNames = order.items.map(item => item.name);
    const uniqueDishes = Array.from(new Set([...pref.favoriteDishes, ...itemNames])).slice(-10);
    const uniqueRestaurants = Array.from(new Set([...pref.favoriteRestaurants, order.restaurantId])).slice(-5);
    
    const rest = await RestaurantModel.findById(order.restaurantId);
    let newCuisines = pref.cuisinePreferences;
    if (rest && rest.description) {
      const restCuisines = rest.description.split(",").map(c => c.trim());
      newCuisines = Array.from(new Set([...pref.cuisinePreferences, ...restCuisines])).slice(-10);
    }
    
    await UserPreferenceModel.findOneAndUpdate(
      { userId: order.userId },
      {
        $set: {
          favoriteDishes: uniqueDishes,
          favoriteRestaurants: uniqueRestaurants,
          cuisinePreferences: newCuisines,
          lastOrderedAt: new Date()
        }
      }
    );
    console.log(`📊 Successfully compiled preferences updates for user ${order.userId}`);

    // Update Rider Reliability Score
    if (order.riderId) {
      let RiderModel;
      try {
        RiderModel = mongoose.model("Rider");
      } catch (e) {
        const RiderSchema = new mongoose.Schema({
          userId: String,
          completedDeliveries: { type: Number, default: 0 },
          cancelledDeliveries: { type: Number, default: 0 },
          onTimeDeliveries: { type: Number, default: 0 },
          reliabilityScore: { type: Number, default: 95 }
        });
        RiderModel = mongoose.model("Rider", RiderSchema);
      }

      const riderProfile = await RiderModel.findById(order.riderId);
      if (riderProfile) {
        const completed = (riderProfile.completedDeliveries || 0) + 1;
        const durationMin = Math.round((new Date() - order.createdAt) / 60000);
        const etaVal = order.dynamicETA || 35;
        const isOnTime = durationMin <= etaVal;
        const onTime = (riderProfile.onTimeDeliveries || 0) + (isOnTime ? 1 : 0);
        const cancelled = riderProfile.cancelledDeliveries || 0;

        const completionRate = completed / (completed + cancelled);
        const onTimeRate = onTime / completed;
        const reliabilityScore = Math.round((onTimeRate * 60 + completionRate * 40));

        await RiderModel.findByIdAndUpdate(order.riderId, {
          $set: {
            completedDeliveries: completed,
            onTimeDeliveries: onTime,
            reliabilityScore: Math.min(100, Math.max(0, reliabilityScore))
          }
        });
        console.log(`🏍️ Recalculated rider reliability score: ${reliabilityScore}% for rider ${order.riderId}`);
      }
    }
  } catch (err) {
    console.error("Failed to update metrics from delivered order:", err);
  }
}

async function runAnomalyCheck(orderId) {
  try {
    const OrderModel = (await import("../models/Order.js")).default;
    const order = await OrderModel.findById(orderId);
    if (!order) return;

    const userOrders = await OrderModel.find({
      userId: order.userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const failedPaymentsCount = userOrders.filter(o => o.paymentStatus === "failed").length;
    const cancellationsCount = userOrders.filter(o => o.status === "cancelled").length;
    const recentHourOrders = userOrders.filter(o => o.createdAt >= new Date(Date.now() - 60 * 60 * 1000)).length;

    const reasons = [];
    if (cancellationsCount >= 3) {
      reasons.push("Frequent cancellations (3+ in 24 hours)");
    }
    if (recentHourOrders >= 5) {
      reasons.push("High frequency order volume (5+ in 1 hour)");
    }
    if (failedPaymentsCount >= 3) {
      reasons.push("Repeated payment failures");
    }

    if (reasons.length > 0) {
      const severity = reasons.length >= 2 ? "HIGH_RISK" : "REVIEW";
      await OrderModel.findByIdAndUpdate(orderId, {
        $set: {
          anomalyStatus: severity,
          anomalyReasons: reasons
        }
      });
      console.log(`⚠️ Anomaly detected [${severity}] for order ${orderId}: ${reasons.join(", ")}`);
      
      const axios = (await import("axios")).default;
      await axios.post(
        `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
        {
          event: "order:anomaly",
          room: "admin:alerts",
          payload: { orderId, severity, reasons },
        },
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      ).catch(() => {});
    }
  } catch (err) {
    console.error("Failed to execute anomaly check:", err);
  }
}

async function updateRestaurantOrderCount(restaurantId, delta) {
  try {
    if (!restaurantId) return;
    const RestaurantModel = (await import("../models/Restaurant.js")).default;
    await RestaurantModel.findByIdAndUpdate(restaurantId, {
      $inc: { totalOrdersCount: delta }
    });
  } catch (err) {
    console.error("Error updating restaurant order count:", err);
  }
}

async function handleRestaurantCancellation(restaurantId) {
  try {
    if (!restaurantId) return;
    const RestaurantModel = (await import("../models/Restaurant.js")).default;
    const rest = await RestaurantModel.findById(restaurantId);
    if (rest) {
      const cancels = (rest.cancellationCount || 0) + 1;
      const total = (rest.totalOrdersCount || 0) + 1;
      const cancelRate = cancels / total;
      const reliabilityScore = Math.max(0, Math.min(100, Math.round(100 - cancelRate * 200)));

      await RestaurantModel.findByIdAndUpdate(restaurantId, {
        $set: {
          cancellationCount: cancels,
          reliabilityScore: reliabilityScore
        }
      });
      console.log(`🏬 Recalculated restaurant reliability score: ${reliabilityScore}% for restaurant ${restaurantId}`);
    }
  } catch (err) {
    console.error("Error updating restaurant cancellation score:", err);
  }
}
