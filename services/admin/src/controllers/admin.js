import { ObjectId } from "mongodb";
import TryCatch from "../middlewares/trycatch.js";
import {
  getRestaurantCollection,
  getRiderCollection,
  getOrderCollection,
} from "../util/collection.js";

export const getPendingRestaurant = TryCatch(async (req, res) => {
  const restaurants = await (await getRestaurantCollection())
    .find({ isVerified: false })
    .toArray();

  res.json({
    count: restaurants.length,
    restaurants,
  });
});

export const getPendingRiders = TryCatch(async (req, res) => {
  const riders = await (await getRiderCollection())
    .find({ isVerified: false })
    .toArray();

  res.json({
    count: riders.length,
    riders,
  });
});

export const verifyRestaurant = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      message: "invalid restaurant id",
    });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid object id",
    });
  }

  const result = await (
    await getRestaurantCollection()
  ).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isVerified: true,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  res.json({
    message: "Restaurant verified successfully",
  });
});

export const verifyRider = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      message: "invalid rider id",
    });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid object id",
    });
  }

  const result = await (
    await getRiderCollection()
  ).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isVerified: true,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      message: "rider not found",
    });
  }

  res.json({
    message: "rider verified successfully",
  });
});

export const getHeatmapData = TryCatch(async (req, res) => {
  const orders = await (await getOrderCollection())
    .find({ status: { $ne: "delivered" } }, { projection: { "deliveryAddress.latitude": 1, "deliveryAddress.longitude": 1, totalAmount: 1, status: 1 } })
    .toArray();
  res.json(orders);
});

export const getSuspiciousOrders = TryCatch(async (req, res) => {
  const orders = await (await getOrderCollection())
    .find({ anomalyStatus: { $in: ["REVIEW", "HIGH_RISK"] } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(orders);
});

export const getIncidentSupportTimeline = TryCatch(async (req, res) => {
  const { id } = req.params;
  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid order ID" });
  }
  const order = await (await getOrderCollection()).findOne({ _id: new ObjectId(id) });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json({
    orderId: order._id,
    timeline: order.timeline || [],
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
});

export const getObservabilityMetrics = TryCatch(async (req, res) => {
  const ordersCol = await getOrderCollection();
  const restCol = await getRestaurantCollection();
  const riderCol = await getRiderCollection();

  const activeOrders = await ordersCol.countDocuments({ status: { $nin: ["delivered", "cancelled"] } });
  const totalOrders = await ordersCol.countDocuments({});
  const totalRestaurants = await restCol.countDocuments({});
  const totalRiders = await riderCol.countDocuments({});

  const averagePrepRecord = await restCol.aggregate([
    { $group: { _id: null, avgPrep: { $avg: "$averagePrepTime" } } }
  ]).toArray();
  
  res.json({
    activeOrders,
    totalOrders,
    totalRestaurants,
    totalRiders,
    averagePrepTime: Math.round(averagePrepRecord[0]?.avgPrep || 20),
  });
});
