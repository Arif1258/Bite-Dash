/**
 * Intelligent ETA Engine
 *
 * Formula:
 * ETA = Food Preparation Time + Kitchen Queue Time + Rider Travel Time + Additional Delay
 *
 * Dynamically factors:
 * - Restaurant food preparation time (baseline per restaurant or default)
 * - Current kitchen/order queue (live count of pending orders in database)
 * - Rider availability (unassigned dispatch buffer, en route, picked up)
 * - Estimated travel time (distance-based with time-of-day traffic conditions)
 * - Additional restaurant / rider delay (buffer, batch detour delay if applicable)
 * - Elapsed time subtraction across order lifecycle
 */

import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";

/**
 * Returns traffic multiplier based on time of day (rush hours)
 * Lunch rush: 12:00 - 14:30 -> 1.25x
 * Dinner rush: 19:00 - 22:00 -> 1.30x
 * Late night / off-peak: 1.0x
 */
function getTrafficFactor() {
  const hour = new Date().getHours();
  if (hour >= 12 && hour <= 14) return 1.25;
  if (hour >= 19 && hour <= 22) return 1.3;
  return 1.0;
}

/**
 * Calculates detailed ETA breakdown for an order.
 * @param {Object} order - Mongoose order document or plain object
 * @returns {Promise<Object>} Detailed ETA report
 */
export async function getDetailedETA(order) {
  if (!order) {
    return {
      totalETA: 30,
      readable: "25-35 mins",
      status: "unknown",
      breakdown: {
        foodPreparationTime: 20,
        kitchenQueueTime: 5,
        riderTravelTime: 10,
        additionalDelay: 5,
        elapsedMinutes: 0,
      },
    };
  }

  // Terminal states
  if (order.status === "delivered") {
    return {
      totalETA: 0,
      readable: "Delivered",
      status: "delivered",
      breakdown: {
        foodPreparationTime: 0,
        kitchenQueueTime: 0,
        riderTravelTime: 0,
        additionalDelay: 0,
        elapsedMinutes: 0,
      },
    };
  }

  if (order.status === "cancelled") {
    return {
      totalETA: 0,
      readable: "Cancelled",
      status: "cancelled",
      breakdown: {
        foodPreparationTime: 0,
        kitchenQueueTime: 0,
        riderTravelTime: 0,
        additionalDelay: 0,
        elapsedMinutes: 0,
      },
    };
  }

  try {
    let restaurant = null;
    let restaurantId = order.restaurantId;

    if (restaurantId) {
      if (typeof restaurantId === "object" && restaurantId.name) {
        restaurant = restaurantId;
        restaurantId = restaurant._id;
      } else {
        restaurant = await Restaurant.findById(restaurantId).lean();
      }
    }

    // 1. Food Preparation Time (baseline)
    const foodPreparationTime = restaurant?.averagePrepTime || 20;

    // 2. Kitchen Queue Time based on real pending orders in DB
    let pendingOrdersCount = 0;
    try {
      if (restaurantId) {
        pendingOrdersCount = await Order.countDocuments({
          restaurantId: restaurantId.toString(),
          _id: { $ne: order._id },
          status: { $in: ["placed", "accepted", "preparing"] },
        });
      }
    } catch {
      pendingOrdersCount = restaurant?.activeOrdersCount || 0;
    }

    // ~2.5 mins per pending order in kitchen queue, capped at 25 mins
    const kitchenQueueTime = Math.min(Math.round(pendingOrdersCount * 2.5), 25);

    // 3. Rider Travel Time (Distance + Traffic multiplier)
    const distanceKm = Number(order.distance) || 3.0;
    const trafficMultiplier = getTrafficFactor();
    const baseTravelMinutes = distanceKm * 3.5; // ~3.5 min/km city speed
    const riderTravelTime = Math.max(4, Math.ceil(baseTravelMinutes * trafficMultiplier));

    // 4. Additional Delay (Rider dispatch assignment buffer, kitchen buffer, batch detour)
    let additionalDelay = 0;

    if (!order.riderId) {
      if (["placed", "accepted", "preparing"].includes(order.status)) {
        additionalDelay += 5; // buffer for assigning nearby rider
      } else if (order.status === "ready_for_rider") {
        additionalDelay += 6; // waiting for rider dispatch
      }
    } else if (order.status === "rider_assigned") {
      additionalDelay += 3; // rider en route to pickup
    }

    // If order is part of a batched delivery route, factor in detour / multi-stop delay
    if (order.isBatched) {
      additionalDelay += 4;
    }

    // Additional restaurant buffer if queue is large
    if (pendingOrdersCount > 5) {
      additionalDelay += 4;
    }

    // 5. Elapsed time tracking
    const orderCreatedAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - orderCreatedAt) / 60000));

    // Dynamic computation based on current delivery status
    let totalETA = 0;
    let remainingPrep = 0;

    switch (order.status) {
      case "placed":
      case "accepted":
        // Full prep + queue + travel + additional delay
        remainingPrep = foodPreparationTime + kitchenQueueTime;
        totalETA = remainingPrep + riderTravelTime + additionalDelay;
        break;

      case "preparing":
        // Actively cooking: subtract elapsed time from prep phase
        const totalEstimatedPrep = foodPreparationTime + kitchenQueueTime;
        remainingPrep = Math.max(3, totalEstimatedPrep - elapsedMinutes);
        totalETA = remainingPrep + riderTravelTime + Math.max(2, additionalDelay - 2);
        break;

      case "ready_for_rider":
        // Food is ready! Prep time is 0. Only awaiting rider dispatch & transit
        remainingPrep = 0;
        totalETA = (order.riderId ? 2 : 5) + riderTravelTime;
        break;

      case "rider_assigned":
        // Rider assigned, picking up food
        remainingPrep = Math.max(0, (foodPreparationTime + kitchenQueueTime) - elapsedMinutes);
        totalETA = remainingPrep + 3 + riderTravelTime;
        break;

      case "picked_up":
      case "out_for_delivery":
        // Food picked up and on route to customer
        remainingPrep = 0;
        const remainingTransit = Math.max(3, riderTravelTime - Math.floor(elapsedMinutes * 0.4));
        totalETA = remainingTransit + (order.isBatched ? 3 : 0);
        break;

      default:
        totalETA = foodPreparationTime + kitchenQueueTime + riderTravelTime + additionalDelay;
    }

    // Final safety bounds
    totalETA = Math.max(2, Math.round(totalETA));

    const targetDate = new Date(Date.now() + totalETA * 60000);

    return {
      totalETA,
      status: order.status,
      readable: `${Math.max(1, totalETA - 3)}-${totalETA + 3} mins`,
      targetDeliveryTime: targetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      trafficLevel: trafficMultiplier > 1.2 ? "Heavy" : trafficMultiplier > 1.0 ? "Moderate" : "Normal",
      pendingQueueOrders: pendingOrdersCount,
      breakdown: {
        foodPreparationTime,
        kitchenQueueTime,
        riderTravelTime,
        additionalDelay,
        elapsedMinutes,
      },
    };
  } catch (err) {
    console.error("Intelligent ETA Engine Error:", err);
    return {
      totalETA: 30,
      readable: "25-35 mins",
      status: order.status || "placed",
      breakdown: {
        foodPreparationTime: 20,
        kitchenQueueTime: 5,
        riderTravelTime: 10,
        additionalDelay: 5,
        elapsedMinutes: 0,
      },
    };
  }
}

/**
 * Returns integer minutes for backwards compatibility.
 * @param {Object} order
 * @returns {Promise<number>} ETA in minutes
 */
export async function calculateOrderETA(order) {
  if (!order) return 30;
  const result = await getDetailedETA(order);
  return result.totalETA;
}

export const calculateDynamicETA = calculateOrderETA;

export default {
  calculateOrderETA,
  calculateDynamicETA,
  getDetailedETA,
};

