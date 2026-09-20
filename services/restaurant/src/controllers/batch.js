import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import TryCatch from "../middlewares/trycatch.js";
import {
  generateBatches,
  evaluatePairBatch,
  BATCH_CONFIG,
} from "../services/routeBatchingService.js";
import { getDetailedETA } from "../services/etaService.js";
import axios from "axios";

// ─── 1. Generate Recommended Batches ────────────────────────────────────────

export const getRecommendedBatches = TryCatch(async (req, res) => {
  if (!req.user || !["rider", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only riders and administrators can view delivery batches" });
  }

  const { riderLat, riderLng } = req.query;
  const riderLocation =
    riderLat && riderLng
      ? { latitude: parseFloat(riderLat), longitude: parseFloat(riderLng) }
      : null;

  // Find all active unassigned orders (including COD)
  const activeOrders = await Order.find({
    status: { $in: ["placed", "accepted", "preparing", "ready_for_rider"] },
    riderId: null,
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  }).lean();

  if (activeOrders.length < 2) {
    return res.json({
      success: true,
      batches: [],
      config: BATCH_CONFIG,
      message: "Not enough active orders to form batches.",
    });
  }

  // Efficient batch load of restaurants
  const restaurantIds = [...new Set(activeOrders.map((o) => o.restaurantId.toString()))];
  const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).lean();

  const restaurantMap = new Map();
  restaurants.forEach((r) => restaurantMap.set(r._id.toString(), r));

  const batches = generateBatches(activeOrders, restaurantMap, riderLocation);

  res.json({
    success: true,
    count: batches.length,
    batches,
    config: {
      maxBatchSize: BATCH_CONFIG.MAX_BATCH_SIZE,
      maxAdditionalDelayMinutes: BATCH_CONFIG.MAX_ADDITIONAL_DELAY_MINS,
      maxRestaurantProximityKm: BATCH_CONFIG.MAX_RESTAURANT_DISTANCE_KM,
      maxCustomerProximityKm: BATCH_CONFIG.MAX_CUSTOMER_DISTANCE_KM,
    },
  });
});

// ─── 2. Evaluate Custom Batch Pair ──────────────────────────────────────────

export const evaluateCustomBatch = TryCatch(async (req, res) => {
  if (!req.user || !["rider", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only riders and administrators can evaluate delivery batches" });
  }

  const { orderIdA, orderIdB } = req.body;

  if (!orderIdA || !orderIdB) {
    return res.status(400).json({ message: "Both orderIdA and orderIdB are required" });
  }

  const [orderA, orderB] = await Promise.all([
    Order.findById(orderIdA).lean(),
    Order.findById(orderIdB).lean(),
  ]);

  if (!orderA || !orderB) {
    return res.status(404).json({ message: "One or both orders not found" });
  }

  const [restA, restB] = await Promise.all([
    Restaurant.findById(orderA.restaurantId).lean(),
    Restaurant.findById(orderB.restaurantId).lean(),
  ]);

  if (!restA || !restB) {
    return res.status(404).json({ message: "Restaurants not found for orders" });
  }

  const evaluation = evaluatePairBatch(orderA, orderB, restA, restB);

  if (!evaluation) {
    return res.json({
      success: false,
      compatible: false,
      message: "Orders cannot be safely batched without exceeding delay or distance limits.",
    });
  }

  res.json({
    success: true,
    compatible: true,
    batch: evaluation,
  });
});

// ─── 3. Accept Batched Route (Rider accepts 2 orders together) ───────────────

export const acceptBatchedRoute = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user || user.role !== "rider") {
    return res.status(403).json({ message: "Only riders can accept delivery batches" });
  }

  const { orderIdA, orderIdB, riderName, riderPhone } = req.body;

  if (!orderIdA || !orderIdB) {
    return res.status(400).json({ message: "Both orderIdA and orderIdB are required" });
  }

  const [orderA, orderB] = await Promise.all([
    Order.findById(orderIdA),
    Order.findById(orderIdB),
  ]);

  if (!orderA || !orderB) {
    return res.status(404).json({ message: "One or both orders not found" });
  }

  if (orderA.riderId || orderB.riderId) {
    return res.status(400).json({ message: "One or both orders have already been assigned to another rider" });
  }

  const batchId = `BATCH-${orderA._id.toString().slice(-4)}-${orderB._id.toString().slice(-4)}`;
  const riderDisplay = riderName || user.name || `Rider ${user._id.toString().slice(-4).toUpperCase()}`;
  const riderContact = riderPhone || user.phone || 9876543210;

  // Assign Order A
  orderA.riderId = user._id.toString();
  orderA.riderName = riderDisplay;
  orderA.riderPhone = riderContact;
  orderA.status = "rider_assigned";
  orderA.isBatched = true;
  orderA.batchedWith = orderB._id.toString();
  orderA.batchId = batchId;
  orderA.timeline.push({
    status: "rider_assigned",
    timestamp: new Date(),
    note: `Assigned to ${riderDisplay} in an optimized eco-batch delivery route (${batchId}).`,
  });
  await orderA.save();

  // Assign Order B
  orderB.riderId = user._id.toString();
  orderB.riderName = riderDisplay;
  orderB.riderPhone = riderContact;
  orderB.status = "rider_assigned";
  orderB.isBatched = true;
  orderB.batchedWith = orderA._id.toString();
  orderB.batchId = batchId;
  orderB.timeline.push({
    status: "rider_assigned",
    timestamp: new Date(),
    note: `Assigned to ${riderDisplay} in an optimized eco-batch delivery route (${batchId}).`,
  });
  await orderB.save();

  // Recalculate ETAs factoring batching
  const [etaA, etaB] = await Promise.all([
    getDetailedETA(orderA),
    getDetailedETA(orderB),
  ]);

  // Real-time broadcast
  if (process.env.REALTIME_SERVICE) {
    const notifyEvents = [
      { room: `user:${orderA.userId}`, payload: { ...orderA.toObject(), etaDetails: etaA } },
      { room: `user:${orderB.userId}`, payload: { ...orderB.toObject(), etaDetails: etaB } },
      { room: `restaurant:${orderA.restaurantId}`, payload: orderA },
      { room: `restaurant:${orderB.restaurantId}`, payload: orderB },
    ];

    for (const item of notifyEvents) {
      axios.post(
        `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
        {
          event: "order:rider_assigned",
          room: item.room,
          payload: item.payload,
        },
        { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
      ).catch((e) => console.warn("Socket notification warning:", e.message));
    }
  }

  res.json({
    success: true,
    message: "Batched delivery accepted successfully! Both orders assigned to you.",
    batchId,
    orders: [orderA, orderB],
  });
});
