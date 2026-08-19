import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import TryCatch from "../middlewares/trycatch.js";

// Proximity calculation helper
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

// Generate Recommended Batches
export const getRecommendedBatches = TryCatch(async (req, res) => {
  // Find all active orders ready for rider or accepted/preparing
  const activeOrders = await Order.find({
    status: { $in: ["placed", "accepted", "preparing", "ready_for_rider"] },
    riderId: null,
    paymentStatus: "paid",
  });

  if (activeOrders.length < 2) {
    return res.json({ success: true, batches: [], message: "Not enough orders to form batches." });
  }

  const recommendations = [];

  // Group candidate pairs
  for (let i = 0; i < activeOrders.length; i++) {
    for (let j = i + 1; j < activeOrders.length; j++) {
      const orderA = activeOrders[i];
      const orderB = activeOrders[j];

      // Exclude if from same user
      if (orderA.userId === orderB.userId) continue;

      // Load restaurants
      const restA = await Restaurant.findById(orderA.restaurantId);
      const restB = await Restaurant.findById(orderB.restaurantId);

      if (!restA || !restB) continue;

      const [restALng, restALat] = restA.autoLocation.coordinates;
      const [restBLng, restBLat] = restB.autoLocation.coordinates;

      const restDistance = getDistanceKm(restALat, restALng, restBLat, restBLng);
      const custDistance = getDistanceKm(
        orderA.deliveryAddress.latitude,
        orderA.deliveryAddress.longitude,
        orderB.deliveryAddress.latitude,
        orderB.deliveryAddress.longitude
      );

      // Check threshold filters
      if (restDistance <= 2.0 && custDistance <= 3.0) {
        // Calculate similarity score (0 to 100)
        // Compatibility: Proximity of restaurants (40%), Proximity of customers (40%), route efficiency (20%)
        const restScore = Math.max(0, 100 - (restDistance * 50));
        const custScore = Math.max(0, 100 - (custDistance * 33.3));
        const routeEfficiency = 100 - (Math.abs(orderA.distance - orderB.distance) * 20);
        
        const score = Math.round(restScore * 0.4 + custScore * 0.4 + routeEfficiency * 0.2);

        if (score >= 50) {
          recommendations.push({
            score,
            restaurantProximity: `${restDistance} km`,
            customerProximity: `${custDistance} km`,
            orders: [
              {
                orderId: orderA._id,
                restaurantName: orderA.restaurantName,
                totalAmount: orderA.totalAmount,
                address: orderA.deliveryAddress.fromattedAddress,
              },
              {
                orderId: orderB._id,
                restaurantName: orderB.restaurantName,
                totalAmount: orderB.totalAmount,
                address: orderB.deliveryAddress.fromattedAddress,
              }
            ],
            suggestedRiderRoute: [
              `Pickup from ${orderA.restaurantName}`,
              `Pickup from ${orderB.restaurantName}`,
              `Deliver to Customer A (${orderA.deliveryAddress.fromattedAddress.slice(0, 20)}...)`,
              `Deliver to Customer B (${orderB.deliveryAddress.fromattedAddress.slice(0, 20)}...)`
            ]
          });
        }
      }
    }
  }

  // Sort batches by highest compatibility score first
  recommendations.sort((a, b) => b.score - a.score);

  res.json({
    success: true,
    batches: recommendations,
  });
});
