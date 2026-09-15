import axios from "axios";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { publishEvent } from "../config/order.publisher.js";

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

  const cartItems = await Cart.find({ userId: user._id })
    .populate("itemId")
    .populate("restaurantId");

  if (cartItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const firstCartItem = cartItems[0];

  if (!firstCartItem || !firstCartItem.restaurantId) {
    return res.status(400).json({
      message: "Invailid Cart Data",
    });
  }

  const restaurantId = firstCartItem.restaurantId._id;

  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      message: "No restaurant with this id",
    });
  }

  if (!restaurant.isOpen) {
    return res.status(404).json({
      message: "Sorry this restaurant is closed for now",
    });
  }

  const distance = getDistanceKm(
    address.location.coordinates[1],
    address.location.coordinates[0],
    restaurant.autoLocation.coordinates[1],
    restaurant.autoLocation.coordinates[0],
  );

  let subtotal = 0;

  const orderItems = cartItems.map((cart) => {
    const item = cart.itemId;

    if (!item) {
      throw new Error("Invalid cart item");
    }

    const itemTotal = item.price * cart.quauntity;

    subtotal += itemTotal;

    return {
      itemId: item._id.toString(),
      name: item.name,
      price: item.price,
      quauntity: cart.quauntity,
    };
  });

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
        note: "Order created successfully. Awaiting payment confirmation.",
      },
    ],
    expiresAt,
  });

  await Cart.deleteMany({ userId: user._id });

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

  const limit = req.query.limit ? Number(req.query.limit) : 0;

  const orders = await Order.find({
    restaurantId,
    paymentStatus: "paid",
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  return res.json({
    success: true,
    count: orders.length,
    orders,
  });
});

const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider"];

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

  if (order.paymentStatus !== "paid") {
    return res.status(404).json({
      message: "Order not completed",
    });
  }

  const restaurant = await Restaurant.findById(order.restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  if (restaurant.ownerId !== user._id.toString()) {
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

  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:update",
      room: `user:${order.userId}`,
      payload: {
        orderId: order._id,
        status: order.status,
      },
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    },
  );

  // now assign riders
  if (status === "ready_for_rider") {
    console.log("Publishing Order ready for rider event for order", order._id);

    await publishEvent("ORDER_READY_FOR_RIDER", {
      orderId: order._id.toString(),
      restaurantId: restaurant._id.toString(),
      location: restaurant.autoLocation,
    });

    console.log("Event Published successfully");
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

  const orders = await Order.find({
    userId: req.user._id.toString(),
    paymentStatus: "paid",
  }).sort({ createdAt: -1 });

  res.json({ orders });
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

  // Allow rider, admin or owner seller to view order as well
  const isAuthorized = 
    order.userId === req.user._id.toString() ||
    order.riderId === req.user._id.toString() ||
    req.user.role === "admin" ||
    req.user.role === "seller";

  if (!isAuthorized) {
    return res.status(401).json({
      message: "You are not allowed to view this order",
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
