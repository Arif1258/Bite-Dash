/**
 * ETA Calculation Engine
 *
 * Computes dynamic, realistic estimated delivery times based on:
 * - Restaurant baseline prep time
 * - Kitchen congestion / active order load (delay factor)
 * - Rider assignment status & proximity
 * - Travel distance approximation (~3.5 mins/km city speed)
 * - Order status lifecycle & elapsed time
 *
 * Edge cases handled:
 * - Cancelled or delivered orders (ETA = 0)
 * - Missing location / distance (sensible default)
 * - Orders already preparing, ready, or picked up (elapsed time subtracted)
 * - Rider unassigned delay buffer
 */

import Restaurant from "../models/Restaurant.js";

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
      breakdown: { prepTime: 20, prepDelay: 0, assignmentTime: 5, travelTime: 5, buffer: 0, elapsedMinutes: 0 },
    };
  }

  // Terminal states
  if (order.status === "delivered") {
    return {
      totalETA: 0,
      readable: "Delivered",
      status: "delivered",
      breakdown: { prepTime: 0, prepDelay: 0, assignmentTime: 0, travelTime: 0, buffer: 0, elapsedMinutes: 0 },
    };
  }

  if (order.status === "cancelled") {
    return {
      totalETA: 0,
      readable: "Cancelled",
      status: "cancelled",
      breakdown: { prepTime: 0, prepDelay: 0, assignmentTime: 0, travelTime: 0, buffer: 0, elapsedMinutes: 0 },
    };
  }

  try {
    let restaurant = null;
    if (order.restaurantId) {
      // Support if order.restaurantId is populated or an ID
      if (typeof order.restaurantId === "object" && order.restaurantId.name) {
        restaurant = order.restaurantId;
      } else {
        restaurant = await Restaurant.findById(order.restaurantId).lean();
      }
    }

    const basePrepTime = restaurant?.averagePrepTime || 20;
    const activeCount = restaurant?.activeOrdersCount || 0;

    // Congestion delay: 2 mins per concurrent active order at the restaurant
    const prepDelay = Math.min(activeCount * 2, 20);

    // Buffer for kitchen queue when load is heavy
    const buffer = activeCount > 5 ? 8 : (activeCount > 2 ? 5 : 2);

    // Distance travel time estimation (~3.5 min/km city transit)
    const distanceKm = order.distance || 3.0;
    const travelTime = Math.max(5, Math.ceil(distanceKm * 3.5));

    // Rider assignment delay
    let assignmentTime = 0;
    if (!order.riderId && !["ready_for_rider", "rider_assigned", "picked_up"].includes(order.status)) {
      assignmentTime = 5; // buffer to find and assign nearby rider
    } else if (order.status === "ready_for_rider" && !order.riderId) {
      assignmentTime = 6; // waiting for rider dispatch
    } else if (order.status === "rider_assigned") {
      assignmentTime = 3; // rider en route to pickup
    }

    // Elapsed time calculation
    const orderCreatedAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - orderCreatedAt) / 60000));

    let remainingPrep = 0;
    let totalETA = 0;

    switch (order.status) {
      case "placed":
      case "accepted":
        // Full prep + buffer + travel + assignment
        remainingPrep = basePrepTime + prepDelay;
        totalETA = remainingPrep + assignmentTime + travelTime + buffer;
        break;

      case "preparing":
        // Kitchen is actively cooking — subtract elapsed time from prep phase
        const totalEstimatedPrep = basePrepTime + prepDelay;
        remainingPrep = Math.max(4, totalEstimatedPrep - elapsedMinutes);
        totalETA = remainingPrep + assignmentTime + travelTime + Math.floor(buffer / 2);
        break;

      case "ready_for_rider":
        // Food is ready! Prep time is zero. Only awaiting rider pickup & transit.
        remainingPrep = 0;
        totalETA = (order.riderId ? 2 : 5) + travelTime;
        break;

      case "rider_assigned":
        // Rider assigned and proceeding to pickup
        remainingPrep = Math.max(0, (basePrepTime + prepDelay) - elapsedMinutes);
        totalETA = remainingPrep + 3 + travelTime;
        break;

      case "picked_up":
      case "out_for_delivery":
        // Food has been picked up by rider — only remaining transit time
        remainingPrep = 0;
        assignmentTime = 0;
        // If elapsed time since pickup exists, approximate remaining travel
        totalETA = Math.max(3, travelTime - Math.min(travelTime - 3, Math.floor(elapsedMinutes * 0.5)));
        break;

      default:
        totalETA = basePrepTime + travelTime + assignmentTime;
    }

    // Round and establish realistic floor
    totalETA = Math.max(2, Math.round(totalETA));

    const targetDate = new Date(Date.now() + totalETA * 60000);

    return {
      totalETA,
      status: order.status,
      readable: `${Math.max(1, totalETA - 3)}-${totalETA + 3} mins`,
      targetDeliveryTime: targetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      breakdown: {
        prepTime: basePrepTime,
        prepDelay,
        assignmentTime,
        travelTime,
        buffer,
        elapsedMinutes,
      },
    };
  } catch (err) {
    console.error("ETA Calculation Service Error:", err);
    return {
      totalETA: 30,
      readable: "25-35 mins",
      status: order.status || "placed",
      breakdown: { prepTime: 20, prepDelay: 0, assignmentTime: 5, travelTime: 5, buffer: 0, elapsedMinutes: 0 },
    };
  }
}

/**
 * Backwards compatible function returning integer minutes.
 * Matches existing call signature: calculateOrderETA(order)
 * @param {Object} order
 * @returns {Promise<number>} ETA in minutes
 */
export async function calculateOrderETA(order) {
  if (!order) return 30;
  const result = await getDetailedETA(order);
  return result.totalETA;
}

export default {
  calculateOrderETA,
  getDetailedETA,
};
