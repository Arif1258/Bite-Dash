/**
 * Intelligent Route Batching Service
 *
 * Batches active delivery orders that can reasonably and efficiently
 * be delivered together without causing unreasonable customer delays.
 *
 * Configurable constraints:
 * - MAX_BATCH_SIZE (default 2, up to 3)
 * - MAX_RESTAURANT_DISTANCE_KM: 2.5 km
 * - MAX_CUSTOMER_DISTANCE_KM: 3.5 km
 * - MAX_ADDITIONAL_CUSTOMER_DELAY_MINS: 15 mins
 * - MAX_TOTAL_ROUTE_DISTANCE_KM: 14 km
 */

// ─── Configurable Batching Parameters ───────────────────────────────────────

export const BATCH_CONFIG = {
  MAX_BATCH_SIZE: 3,
  MAX_RESTAURANT_DISTANCE_KM: 2.5,
  MAX_CUSTOMER_DISTANCE_KM: 3.5,
  MAX_ADDITIONAL_DELAY_MINS: 15,
  MAX_TOTAL_ROUTE_DISTANCE_KM: 14.0,
  MIN_COMPATIBILITY_SCORE: 50,
  AVERAGE_CITY_SPEED_KMH: 20, // ~3 min per km
  STOP_SERVICE_TIME_MINS: 3,  // 3 mins spent at each pickup/dropoff stop
};

// ─── Geo Distance Helper (Modular approximation, easily swapped for OSRM/Google Maps) ─

export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // fallback conservative distance
  const R = 6371; // Earth radius in km
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

// ─── Readiness Synchronization Check ───────────────────────────────────────

const READY_SCORES = {
  ready_for_rider: 10,
  preparing: 7,
  accepted: 4,
  placed: 2,
};

function evaluateReadinessSync(orderA, orderB) {
  const scoreA = READY_SCORES[orderA.status] || 0;
  const scoreB = READY_SCORES[orderB.status] || 0;

  // Difference in readiness stage
  const stageDiff = Math.abs(scoreA - scoreB);

  // If one order is ready_for_rider and the other is just placed, batching would delay the ready food
  if (stageDiff > 5) {
    return { compatible: false, score: 0, reason: "Order preparation timelines differ too greatly" };
  }

  // 100 max, penalty for each stage of mismatch
  const syncScore = Math.max(20, 100 - stageDiff * 15);
  return { compatible: true, score: syncScore };
}

// ─── Single Pair Batch Evaluator ───────────────────────────────────────────

export function evaluatePairBatch(orderA, orderB, restaurantA, restaurantB, riderLocation = null) {
  // Disallow batching orders for same user ID
  if (orderA.userId === orderB.userId) {
    return null;
  }

  // Coordinates extraction
  const rALat = restaurantA.autoLocation?.coordinates?.[1] || 0;
  const rALng = restaurantA.autoLocation?.coordinates?.[0] || 0;
  const rBLat = restaurantB.autoLocation?.coordinates?.[1] || 0;
  const rBLng = restaurantB.autoLocation?.coordinates?.[0] || 0;

  const cALat = orderA.deliveryAddress?.latitude || 0;
  const cALng = orderA.deliveryAddress?.longitude || 0;
  const cBLat = orderB.deliveryAddress?.latitude || 0;
  const cBLng = orderB.deliveryAddress?.longitude || 0;

  // Distances
  const restDistance = calculateDistanceKm(rALat, rALng, rBLat, rBLng);
  const custDistance = calculateDistanceKm(cALat, cALng, cBLat, cBLng);

  // Constraint check: Restaurants & Customers proximity
  if (
    restDistance > BATCH_CONFIG.MAX_RESTAURANT_DISTANCE_KM ||
    custDistance > BATCH_CONFIG.MAX_CUSTOMER_DISTANCE_KM
  ) {
    return null;
  }

  // Readiness synchronization check
  const readiness = evaluateReadinessSync(orderA, orderB);
  if (!readiness.compatible) {
    return null;
  }

  // Rider proximity check if rider coordinates provided
  let riderToPickupDist = 0;
  if (riderLocation && riderLocation.latitude && riderLocation.longitude) {
    riderToPickupDist = calculateDistanceKm(riderLocation.latitude, riderLocation.longitude, rALat, rALng);
    if (riderToPickupDist > 6.0) {
      return null; // Rider is too far away from this batch
    }
  }

  // Calculate Route: Pickup A -> Pickup B -> Deliver closest customer -> Deliver second customer
  // Compare dist(Rest B -> Cust A) vs dist(Rest B -> Cust B)
  const distRestBtoCustA = calculateDistanceKm(rBLat, rBLng, cALat, cALng);
  const distRestBtoCustB = calculateDistanceKm(rBLat, rBLng, cBLat, cBLng);

  let firstCustomer, secondCustomer;
  let distRestToFirstCust, distFirstToSecondCust;

  if (distRestBtoCustA <= distRestBtoCustB) {
    firstCustomer = { order: orderA, label: "Customer A" };
    secondCustomer = { order: orderB, label: "Customer B" };
    distRestToFirstCust = distRestBtoCustA;
    distFirstToSecondCust = custDistance;
  } else {
    firstCustomer = { order: orderB, label: "Customer B" };
    secondCustomer = { order: orderA, label: "Customer A" };
    distRestToFirstCust = distRestBtoCustB;
    distFirstToSecondCust = custDistance;
  }

  const batchedRouteDistance = +(restDistance + distRestToFirstCust + distFirstToSecondCust).toFixed(2);
  const independentDistance = +((orderA.distance || 4.0) + (orderB.distance || 4.0)).toFixed(2);
  const distanceSaved = +(independentDistance - batchedRouteDistance).toFixed(2);

  if (batchedRouteDistance > BATCH_CONFIG.MAX_TOTAL_ROUTE_DISTANCE_KM) {
    return null;
  }

  // Estimated additional delay for second customer compared to direct delivery
  const travelMinsPerKm = 60 / BATCH_CONFIG.AVERAGE_CITY_SPEED_KMH;
  const extraTravelMinutes = Math.round((restDistance + distFirstToSecondCust) * travelMinsPerKm);
  const extraServiceMinutes = BATCH_CONFIG.STOP_SERVICE_TIME_MINS * 2; // Extra pickup + extra dropoff
  const additionalCustomerDelay = extraTravelMinutes + extraServiceMinutes;

  if (additionalCustomerDelay > BATCH_CONFIG.MAX_ADDITIONAL_DELAY_MINS) {
    return null; // Violates max customer delay constraint
  }

  // Compatibility Score (0 to 100)
  // Components:
  // - Restaurant Proximity (30%)
  // - Customer Proximity (30%)
  // - Readiness Synchronization (20%)
  // - Delay Penalty (20%)
  const restScore = Math.max(0, 100 - (restDistance / BATCH_CONFIG.MAX_RESTAURANT_DISTANCE_KM) * 100);
  const custScore = Math.max(0, 100 - (custDistance / BATCH_CONFIG.MAX_CUSTOMER_DISTANCE_KM) * 100);
  const delayScore = Math.max(0, 100 - (additionalCustomerDelay / BATCH_CONFIG.MAX_ADDITIONAL_DELAY_MINS) * 100);

  const finalScore = Math.round(
    restScore * 0.30 +
    custScore * 0.30 +
    readiness.score * 0.20 +
    delayScore * 0.20
  );

  if (finalScore < BATCH_CONFIG.MIN_COMPATIBILITY_SCORE) {
    return null;
  }

  return {
    batchId: `BATCH-${orderA._id.toString().slice(-4)}-${orderB._id.toString().slice(-4)}`,
    score: finalScore,
    metrics: {
      restaurantDistanceKm: restDistance,
      customerDistanceKm: custDistance,
      batchedRouteDistanceKm: batchedRouteDistance,
      distanceSavedKm: Math.max(0, distanceSaved),
      additionalDelayMinutes: additionalCustomerDelay,
      estimatedTotalDurationMinutes: Math.round(batchedRouteDistance * travelMinsPerKm + BATCH_CONFIG.STOP_SERVICE_TIME_MINS * 4),
    },
    orders: [
      {
        orderId: orderA._id,
        shortId: orderA._id.toString().slice(-6).toUpperCase(),
        restaurantName: orderA.restaurantName,
        status: orderA.status,
        totalAmount: orderA.totalAmount,
        address: orderA.deliveryAddress?.fromattedAddress || "Customer Address A",
      },
      {
        orderId: orderB._id,
        shortId: orderB._id.toString().slice(-6).toUpperCase(),
        restaurantName: orderB.restaurantName,
        status: orderB.status,
        totalAmount: orderB.totalAmount,
        address: orderB.deliveryAddress?.fromattedAddress || "Customer Address B",
      },
    ],
    routeWaypoints: [
      { step: 1, type: "PICKUP", locationName: restaurantA.name, address: restaurantA.address || "Restaurant A" },
      { step: 2, type: "PICKUP", locationName: restaurantB.name, address: restaurantB.address || "Restaurant B" },
      { step: 3, type: "DROPOFF", locationName: firstCustomer.order.restaurantName + " Order", address: firstCustomer.order.deliveryAddress?.fromattedAddress },
      { step: 4, type: "DROPOFF", locationName: secondCustomer.order.restaurantName + " Order", address: secondCustomer.order.deliveryAddress?.fromattedAddress },
    ],
    efficiencySavings: distanceSaved > 0 ? `${distanceSaved} km saved vs separate deliveries` : "High route density",
  };
}

/**
 * Evaluates candidate active orders to discover optimal delivery batches.
 * @param {Array} activeOrders
 * @param {Map|Object} restaurantMap - Map of restaurantId -> restaurant document
 * @param {Object} [riderLocation]
 * @returns {Array} List of evaluated batches sorted by highest compatibility score
 */
export function generateBatches(activeOrders, restaurantMap, riderLocation = null) {
  if (!activeOrders || activeOrders.length < 2) {
    return [];
  }

  const recommendations = [];

  for (let i = 0; i < activeOrders.length; i++) {
    for (let j = i + 1; j < activeOrders.length; j++) {
      const orderA = activeOrders[i];
      const orderB = activeOrders[j];

      const restA = restaurantMap.get
        ? restaurantMap.get(orderA.restaurantId.toString())
        : restaurantMap[orderA.restaurantId.toString()];
      const restB = restaurantMap.get
        ? restaurantMap.get(orderB.restaurantId.toString())
        : restaurantMap[orderB.restaurantId.toString()];

      if (!restA || !restB) continue;

      const batch = evaluatePairBatch(orderA, orderB, restA, restB, riderLocation);
      if (batch) {
        recommendations.push(batch);
      }
    }
  }

  // Sort descending by highest compatibility score
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations;
}

export default {
  BATCH_CONFIG,
  calculateDistanceKm,
  evaluatePairBatch,
  generateBatches,
};
