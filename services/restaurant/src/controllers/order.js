import axios from "axios";
import mongoose from "mongoose";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItems.js";
import { publishEvent } from "../config/order.publisher.js";

const getUserIdQuery = (userId) => {
  if (!userId) return { userId: null };
  const strId = userId.toString();
  const or = [{ userId: strId }];
  if (mongoose.Types.ObjectId.isValid(strId)) {
    or.push({ userId: new mongoose.Types.ObjectId(strId) });
  }
  return { $or: or };
};

export const emitRealtimeEvent = async (event, room, payload) => {
  if (!process.env.REALTIME_SERVICE) return;
  try {
    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      { event, room, payload },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
        timeout: 4000,
      }
    );
  } catch (err) {
    console.warn(`[Realtime] Failed to emit ${event} to ${room}:`, err.message);
  }
};

export const createOrder = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { paymentMethod, addressId } = req.body;

  if (!addressId) {
    return res.status(400).json({
      message: "Address is required",
    });
  }

  const address = await Address.findOne({
    _id: addressId,
    userId: user._id,
  });

  if (!address) {
    return res.status(404).json({
      message: "Address Not found",
    });
  }

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  const userIdQuery = getUserIdQuery(user._id);

  const cartItems = await Cart.find(userIdQuery)
    .populate("itemId")
    .populate("restaurantId");

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  // Multi-vendor validation: Verify all cart items belong to the same restaurant
  const restaurantIds = new Set(
    cartItems
      .map((c) => {
        const rest = c.restaurantId;
        return rest?._id ? rest._id.toString() : rest ? rest.toString() : null;
      })
      .filter(Boolean)
  );

  if (restaurantIds.size > 1) {
    return res.status(400).json({
      message:
        "You can order from only one restaurant at a time. Please clear your cart or remove items from other restaurants.",
    });
  }

  const firstCartItem = cartItems[0];

  if (!firstCartItem || !firstCartItem.restaurantId) {
    return res.status(400).json({
      message: "Invalid Cart Data",
    });
  }

  const restaurantId = firstCartItem.restaurantId._id || firstCartItem.restaurantId;

  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      message: "No restaurant with this id",
    });
  }

  if (!restaurant.isOpen) {
    return res.status(400).json({
      message: "Sorry this restaurant is closed for now",
    });
  }

  const distance = getDistanceKm(
    address.location.coordinates[1],
    address.location.coordinates[0],
    restaurant.autoLocation?.coordinates?.[1] ?? 19.076,
    restaurant.autoLocation?.coordinates?.[0] ?? 72.8777,
  );

  let subtotal = 0;
  const orderItems = [];

  // Stock / Availability validation & item calculations
  for (const cart of cartItems) {
    const item = cart.itemId;

    if (!item) {
      return res.status(400).json({
        message: "One or more items in your cart are no longer available. Please update your cart.",
      });
    }

    if (item.isAvailable === false) {
      return res.status(400).json({
        message: `"${item.name}" is currently out of stock or unavailable.`,
      });
    }

    const qty = cart.quauntity || 1;
    const itemTotal = (item.price || 0) * qty;

    subtotal += itemTotal;

    orderItems.push({
      itemId: item._id.toString(),
      name: item.name,
      price: item.price,
      quauntity: qty,
    });
  }

  const deliveryFee = subtotal < 250 ? 49 : 0;
  const platfromFee = 7;
  const totalAmount = subtotal + deliveryFee + platfromFee;

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const [longitude, latitude] = address.location.coordinates;

  const riderAmount = Math.ceil(distance) * 17;

  const order = await Order.create({
    userId: user._id.toString(),
    restaurantId: restaurantId.toString(),
    restaurantName: restaurant.name,
    riderId: null,
    distance,
    riderAmount,
    items: orderItems,
    subtotal,
    deliveryFee,
    platfromFee,
    totalAmount,
    addressId: address._id.toString(),
    deliveryAddress: {
      fromattedAddress: address.formattedAddress,
      mobile: address.mobile,
      latitude,
      longitude,
    },

    paymentMethod,
    paymentStatus: "pending",
    status: "placed",
    timeline: [
      {
        status: "placed",
        timestamp: new Date(),
        note:
          paymentMethod === "cod"
            ? "Order placed successfully with Cash on Delivery. Payment will be collected upon arrival."
            : "Order created successfully. Awaiting payment confirmation.",
      },
    ],
    expiresAt,
  });

  // Clear cart only after successful order creation
  await Cart.deleteMany(userIdQuery);

  // Directly notify restaurant and user via Realtime socket
  emitRealtimeEvent("order:new", `restaurant:${order.restaurantId}`, {
    orderId: order._id.toString(),
    restaurantId: order.restaurantId,
    status: order.status,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
  });
  emitRealtimeEvent("order:update", `user:${order.userId}`, {
    orderId: order._id.toString(),
    status: order.status,
  });

  // Publish event asynchronously
  try {
    const { publishOrderLifecycleEvent } = await import("../config/order.publisher.js");
    await publishOrderLifecycleEvent("ORDER_CREATED", {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      userId: order.userId,
    });
  } catch (err) {
    console.error("Failed to publish ORDER_CREATED event:", err);
  }

  res.json({
    message: "Order created successfully",
    orderId: order._id.toString(),
    amount: totalAmount,
  });
});

export const fetchOrderForPayment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.paymentStatus !== "pending") {
    return res.status(400).json({
      message: "Order already paid",
    });
  }

  res.json({
    orderId: order._id,
    amount: order.totalAmount,
    currency: "INR",
  });
});

export const savePaymentReference = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { orderId, paymentProviderOrderId } = req.body;
  if (!orderId || !paymentProviderOrderId) {
    return res.status(400).json({ message: "Order and provider payment IDs are required" });
  }

  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "pending", paymentProviderOrderId: null },
    { $set: { paymentProviderOrderId } },
    { new: true },
  );
  if (!order) return res.status(409).json({ message: "Order cannot accept a new payment reference" });
  return res.json({ success: true });
});

export const confirmRazorpayPayment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { orderId, razorpayOrderId, paymentId } = req.body;
  if (!orderId || !razorpayOrderId || !paymentId) {
    return res.status(400).json({ message: "Order, provider order, and payment IDs are required" });
  }

  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "pending", paymentProviderOrderId: razorpayOrderId },
    { $set: { paymentStatus: "paid", paymentId } },
    { new: true },
  );
  if (!order) return res.status(400).json({ message: "Payment does not match a pending order" });

  emitRealtimeEvent("order:new", `restaurant:${order.restaurantId}`, {
    orderId: order._id.toString(),
    status: order.status,
    paymentStatus: "paid",
  });
  emitRealtimeEvent("order:update", `user:${order.userId}`, {
    orderId: order._id.toString(),
    status: order.status,
    paymentStatus: "paid",
  });

  return res.json({ success: true, order });
});

export const fetchRestaurantOrders = TryCatch(async (req, res) => {
  const user = req.user;

  const { restaurantId } = req.params;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (!restaurantId) {
    return res.status(400).json({
      message: "Restaurant id is required",
    });
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  if (user.role !== "admin" && restaurant.ownerId.toString() !== user._id.toString()) {
    return res.status(403).json({
      message: "Forbidden: You do not own this restaurant",
    });
  }

  const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 50;

  const orders = await Order.find({
    restaurantId: { $in: [restaurantId, String(restaurantId)] },
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  return res.json({
    success: true,
    count: orders.length,
    orders,
  });
});

const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider", "cancelled"];

export const updateOrderStatus = TryCatch(async (req, res) => {
  const user = req.user;

  const { orderId } = req.params;
  const { status } = req.body;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      message: "Invalid order status",
    });
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.paymentStatus !== "paid" && order.paymentMethod !== "cod") {
    return res.status(400).json({
      message: "Order payment has not been completed",
    });
  }

  const restaurant = await Restaurant.findById(order.restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  if (user.role !== "admin" && restaurant.ownerId !== user._id.toString()) {
    return res.status(401).json({
      message: "You are not allowed to update this order",
    });
  }

  order.status = status;

  let note = "";
  let rabbitMQEvent = "";
  if (status === "accepted") {
    note = "Restaurant accepted your order.";
    rabbitMQEvent = "RESTAURANT_ACCEPTED";
  } else if (status === "preparing") {
    note = "Food is being prepared.";
    rabbitMQEvent = "ORDER_PREPARING";
  } else if (status === "ready_for_rider") {
    note = "Food is ready! Waiting for rider pickup.";
    rabbitMQEvent = "ORDER_READY";
  } else if (status === "cancelled") {
    note = "Order was rejected or cancelled by the restaurant.";
    rabbitMQEvent = "ORDER_CANCELLED";
  }

  order.timeline.push({
    status,
    timestamp: new Date(),
    note,
  });

  await order.save();

  if (rabbitMQEvent) {
    try {
      const { publishOrderLifecycleEvent } = await import("../config/order.publisher.js");
      await publishOrderLifecycleEvent(rabbitMQEvent, {
        orderId: order._id.toString(),
        restaurantId: order.restaurantId,
        userId: order.userId,
      });
    } catch (err) {
      console.error(`Failed to publish event ${rabbitMQEvent}:`, err);
    }
  }

  await emitRealtimeEvent("order:update", `user:${order.userId}`, {
    orderId: order._id.toString(),
    status: order.status,
  });
  await emitRealtimeEvent("order:update", `restaurant:${order.restaurantId}`, {
    orderId: order._id.toString(),
    status: order.status,
  });

  // Notify riders when order is ready for pickup
  if (status === "ready_for_rider") {
    console.log("Notifying riders for ready order", order._id);

    await emitRealtimeEvent("order:available", "riders", {
      orderId: order._id.toString(),
      restaurantId: restaurant._id.toString(),
      location: restaurant.autoLocation,
    });

    try {
      await publishEvent("ORDER_READY_FOR_RIDER", {
        orderId: order._id.toString(),
        restaurantId: restaurant._id.toString(),
        location: restaurant.autoLocation,
      });
    } catch (err) {
      console.warn("Publish ORDER_READY_FOR_RIDER warning:", err.message);
    }
  }

  res.json({
    message: "order status updated successfully",
    order,
  });
});

export const getMyOrders = TryCatch(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    userId: req.user._id.toString(),
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  const ordersWithETA = await Promise.all(
    orders.map(async (order) => {
      const orderObj = order.toObject();
      if (order.status !== "delivered" && order.status !== "cancelled") {
        try {
          const eta = await getDetailedETA(order);
          orderObj.dynamicETA = eta.totalETA;
          orderObj.etaDetails = eta;
        } catch {
          orderObj.dynamicETA = 30;
        }
      }
      return orderObj;
    })
  );

  res.json({
    orders: ordersWithETA,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

import { calculateOrderETA, getDetailedETA } from "../services/etaService.js";
export { calculateOrderETA, getDetailedETA };

export const fetchSingleOrder = TryCatch(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  let isAuthorized =
    order.userId === req.user._id.toString() ||
    order.riderId === req.user._id.toString() ||
    req.user.role === "admin";

  if (!isAuthorized && req.user.role === "seller") {
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (restaurant && restaurant.ownerId.toString() === req.user._id.toString()) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({
      message: "You are not authorized to view this order",
    });
  }

  const etaDetails = await getDetailedETA(order);
  const orderObj = order.toObject();
  orderObj.dynamicETA = etaDetails.totalETA;
  orderObj.etaDetails = etaDetails;

  res.json(orderObj);
});

export const assignRiderToOrder = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, riderId, riderName, riderPhone } = req.body;

  const orderAvailable = await Order.findOne({
    riderId,
    status: { $ne: "delivered" },
  });

  if (orderAvailable) {
    return res.status(400).json({
      message: "You already have an order",
    });
  }

  const order = await Order.findById(orderId);

  if (order?.riderId !== null) {
    return res.status(400).json({
      message: "Order Already taken",
    });
  }

  const orderUpdated = await Order.findOneAndUpdate(
    { _id: orderId, riderId: null },
    {
      $set: {
        riderId,
        riderName,
        riderPhone,
        status: "rider_assigned",
      },
      $push: {
        timeline: {
          status: "rider_assigned",
          timestamp: new Date(),
          note: `Rider has been assigned to deliver your order.`,
        },
      },
    },
    { new: true },
  );

  try {
    const { publishOrderLifecycleEvent } = await import("../config/order.publisher.js");
    await publishOrderLifecycleEvent("DRIVER_ASSIGNED", {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      userId: order.userId,
      riderId,
    });
  } catch (err) {
    console.error("Failed to publish DRIVER_ASSIGNED event:", err);
  }

  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:rider_assigned",
      room: `user:${order.userId}`,
      payload: order,
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    },
  );
  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:rider_assigned",
      room: `restaurant:${order.restaurantId}`,
      payload: order,
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    },
  );

  res.json({
    message: "Rider Assigned Successfully",
    success: true,
    order: orderUpdated,
  });
});

export const getCurrentOrderForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { riderId } = req.query;

  if (!riderId) {
    return res.status(400).json({
      message: "Rider id is required",
    });
  }

  const order = await Order.findOne({
    riderId,
    status: { $ne: "delivered" },
  }).populate("restaurantId");

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  res.json(order);
});

export const updateOrderStatusRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.status === "rider_assigned") {
    order.status = "picked_up";
    order.timeline.push({
      status: "picked_up",
      timestamp: new Date(),
      note: "Rider picked up your food and is on the way.",
    });

    await order.save();

    try {
      const { publishOrderLifecycleEvent } = await import("../config/order.publisher.js");
      await publishOrderLifecycleEvent("ORDER_PICKED_UP", {
        orderId: order._id.toString(),
        restaurantId: order.restaurantId,
        userId: order.userId,
        riderId: order.riderId,
      });
    } catch (err) {
      console.error("Failed to publish ORDER_PICKED_UP event:", err);
    }

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `restaurant:${order.restaurantId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      },
    );

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `user:${order.userId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      },
    );

    return res.json({
      message: "Order updated Successfully",
    });
  }

  if (order.status === "picked_up") {
    order.status = "delivered";
    order.timeline.push({
      status: "delivered",
      timestamp: new Date(),
      note: "Order delivered! Enjoy your food.",
    });

    await order.save();

    try {
      const { publishOrderLifecycleEvent } = await import("../config/order.publisher.js");
      await publishOrderLifecycleEvent("ORDER_DELIVERED", {
        orderId: order._id.toString(),
        restaurantId: order.restaurantId,
        userId: order.userId,
        riderId: order.riderId,
      });
    } catch (err) {
      console.error("Failed to publish ORDER_DELIVERED event:", err);
    }

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `restaurant:${order.restaurantId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      },
    );

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `user:${order.userId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      },
    );

    return res.json({
      message: "Order updated Successfully",
    });
  }
});

export const confirmStripePayment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { orderId, paymentId } = req.body;
  if (!orderId) {
    return res.status(400).json({ message: "OrderId is required" });
  }

  const order = await Order.findOneAndUpdate(
    { _id: orderId },
    { $set: { paymentStatus: "paid", paymentId: paymentId || "stripe_confirmed" } },
    { new: true }
  );

  if (!order) return res.status(404).json({ message: "Order not found" });

  emitRealtimeEvent("order:new", `restaurant:${order.restaurantId}`, {
    orderId: order._id.toString(),
    status: order.status,
    paymentStatus: "paid",
  });
  emitRealtimeEvent("order:update", `user:${order.userId}`, {
    orderId: order._id.toString(),
    status: order.status,
    paymentStatus: "paid",
  });

  try {
    const { publishOrderLifecycleEvent } = await import("../config/order.publisher.js");
    await publishOrderLifecycleEvent("ORDER_PAID", {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      userId: order.userId,
    });
  } catch (pubErr) {
    console.warn("Order paid publish warning:", pubErr.message);
  }

  return res.json({ success: true, order });
});

export const fetchAvailableOrdersForRiders = TryCatch(async (req, res) => {
  if (!req.user || !["rider", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: Rider access required" });
  }

  const orders = await Order.find({
    status: "ready_for_rider",
    riderId: null,
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  })
    .sort({ updatedAt: -1 })
    .limit(20);

  return res.json({
    success: true,
    count: orders.length,
    orders,
  });
});

