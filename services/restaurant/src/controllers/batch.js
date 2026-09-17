import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import TryCatch from "../middlewares/trycatch.js";
import {
  generateBatches,
  evaluatePairBatch,
  BATCH_CONFIG,
} from "../services/routeBatchingService.js";

// Generate Recommended Batches (Intelligent Route Batching)
export const getRecommendedBatches = TryCatch(async (req, res) => {
  if (!req.user || !["rider", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only riders and administrators can view delivery batches" });
  }

  const { riderLat, riderLng } = req.query;
  const riderLocation =
    riderLat && riderLng
      ? { latitude: parseFloat(riderLat), longitude: parseFloat(riderLng) }
      : null;

  // Find all active unassigned orders ready for delivery or preparing
  const activeOrders = await Order.find({
    status: { $in: ["placed", "accepted", "preparing", "ready_for_rider"] },
    riderId: null,
    paymentStatus: "paid",
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

// Evaluate Single Batch Pair
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
