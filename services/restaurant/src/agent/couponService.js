import { getRedisClient } from "../utils/redis.js";

// In-memory fallback if Redis is unavailable
const memoryCouponStore = new Map();

export const AVAILABLE_COUPONS = [
  {
    code: "WELCOME50",
    description: "Flat ₹50 OFF on orders above ₹199",
    type: "flat",
    value: 50,
    minOrder: 199,
    maxDiscount: 50,
  },
  {
    code: "BITEDASH20",
    description: "20% OFF up to ₹100 on orders above ₹249",
    type: "percentage",
    value: 20,
    minOrder: 249,
    maxDiscount: 100,
  },
  {
    code: "FEAST100",
    description: "Flat ₹100 OFF on party feasts above ₹499",
    type: "flat",
    value: 100,
    minOrder: 499,
    maxDiscount: 100,
  },
  {
    code: "FREEDEL",
    description: "Free delivery on orders above ₹199 (saves ₹49)",
    type: "delivery",
    value: 49,
    minOrder: 199,
    maxDiscount: 49,
  },
  {
    code: "SUPERCHEFS",
    description: "15% OFF up to ₹75 on orders above ₹150",
    type: "percentage",
    value: 15,
    minOrder: 150,
    maxDiscount: 75,
  },
];

/**
 * Returns available coupons with eligibility status against subtotal.
 */
export function getCouponsForSubtotal(subtotal = 0) {
  return AVAILABLE_COUPONS.map((c) => {
    const isEligible = subtotal >= c.minOrder;
    let potentialDiscount = 0;
    if (c.type === "flat") {
      potentialDiscount = c.value;
    } else if (c.type === "percentage") {
      potentialDiscount = Math.min(Math.round((subtotal * c.value) / 100), c.maxDiscount);
    } else if (c.type === "delivery") {
      potentialDiscount = c.value;
    }

    return {
      code: c.code,
      description: c.description,
      minOrder: c.minOrder,
      isEligible,
      potentialDiscount: isEligible ? potentialDiscount : 0,
      shortfall: isEligible ? 0 : c.minOrder - subtotal,
    };
  });
}

/**
 * Validates a coupon code and calculates discount against cart subtotal.
 */
export function validateCoupon(code, subtotal = 0) {
  if (!code || typeof code !== "string") {
    return { valid: false, discount: 0, message: "Coupon code is required." };
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = AVAILABLE_COUPONS.find((c) => c.code === cleanCode);

  if (!coupon) {
    return {
      valid: false,
      discount: 0,
      message: `Coupon code '${cleanCode}' is invalid or expired. Try WELCOME50 or BITEDASH20.`,
    };
  }

  if (subtotal < coupon.minOrder) {
    const shortfall = Math.round(coupon.minOrder - subtotal);
    return {
      valid: false,
      discount: 0,
      coupon,
      message: `Coupon '${coupon.code}' requires a minimum order of ₹${coupon.minOrder}. Add ₹${shortfall} more to your cart to use this offer!`,
    };
  }

  let discount = 0;
  if (coupon.type === "flat") {
    discount = coupon.value;
  } else if (coupon.type === "percentage") {
    discount = Math.min(Math.round((subtotal * coupon.value) / 100), coupon.maxDiscount);
  } else if (coupon.type === "delivery") {
    discount = coupon.value;
  }

  // Safety: discount cannot exceed subtotal
  discount = Math.min(discount, subtotal);

  return {
    valid: true,
    discount,
    coupon,
    message: `Coupon '${coupon.code}' applied successfully! You save ₹${discount}.`,
  };
}

/**
 * Gets currently applied coupon for user from Redis or fallback memory.
 */
export async function getUserAppliedCoupon(userId) {
  if (!userId) return null;
  const key = `bitedash:cart:coupon:${userId}`;

  try {
    const redis = getRedisClient();
    if (redis) {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (err) {
    console.warn("Redis coupon get warning:", err.message);
  }

  return memoryCouponStore.get(userId.toString()) || null;
}

/**
 * Stores applied coupon for user with 2-hour TTL.
 */
export async function setUserAppliedCoupon(userId, couponData) {
  if (!userId) return;
  const key = `bitedash:cart:coupon:${userId}`;

  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.set(key, JSON.stringify(couponData), "EX", 7200);
      return;
    }
  } catch (err) {
    console.warn("Redis coupon set warning:", err.message);
  }

  memoryCouponStore.set(userId.toString(), couponData);
}

/**
 * Removes applied coupon for user.
 */
export async function clearUserAppliedCoupon(userId) {
  if (!userId) return;
  const key = `bitedash:cart:coupon:${userId}`;

  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.del(key);
      return;
    }
  } catch (err) {
    console.warn("Redis coupon clear warning:", err.message);
  }

  memoryCouponStore.delete(userId.toString());
}
