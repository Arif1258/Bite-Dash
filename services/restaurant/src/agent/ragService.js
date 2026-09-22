/**
 * BiteDash RAG & Grounded Retrieval Service
 *
 * Provides authoritative data retrieval from MongoDB for dishes, restaurants,
 * cart state, live order telemetry, and coupons.
 *
 * Implements conversational multi-turn context resolution, semantic entity extraction,
 * and observability metadata generation for teacher demonstration.
 */

import mongoose from "mongoose";
import MenuItem from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import UserPreference from "../models/UserPreference.js";
import { getDetailedETA } from "../services/etaService.js";
import { getCouponsForSubtotal } from "./couponService.js";

// Helper: parse numbers from words or digits
export function parseQuantity(text) {
  if (!text) return 1;
  const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const numMatch = text.match(/\b(\d+)\b/);
  if (numMatch) return parseInt(numMatch[1], 10);

  for (const [word, val] of Object.entries(wordMap)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return val;
  }
  return 1;
}

// Helper: parse price bounds (e.g. "under 300", "below ₹250", "< 200", "around 500")
export function parsePriceConstraint(text) {
  if (!text) return { maxPrice: null, minPrice: null };
  const maxMatch = text.match(/(?:under|below|less than|<|around|within|up to)\s*₹?\s*(\d+)/i);
  const minMatch = text.match(/(?:above|more than|>|at least)\s*₹?\s*(\d+)/i);

  return {
    maxPrice: maxMatch ? parseInt(maxMatch[1], 10) : null,
    minPrice: minMatch ? parseInt(minMatch[1], 10) : null,
  };
}

// Helper: extract dietary / culinary tags
export function parseDietAndTaste(text) {
  const lower = (text || "").toLowerCase();
  const isVegetarian = /\b(veg|vegetarian|pure veg|plant based)\b/i.test(lower) && !/\b(non-veg|non veg)\b/i.test(lower);
  const isSpicy = /\b(spicy|hot|fiery|peri-peri|peri peri|masala|chilli|chili)\b/i.test(lower);
  const highlyRated = /\b(highly rated|top rated|best rated|popular|good rating|4\s*star|above 4)\b/i.test(lower);
  const cheapest = /\b(cheapest|lowest price|budget|cheap|most affordable)\b/i.test(lower);
  const fastest = /\b(fastest|quickest|speedy|early arrival|soonest)\b/i.test(lower);

  return { isVegetarian, isSpicy, highlyRated, cheapest, fastest };
}

/**
 * Extract intent and entities from user message and conversational history
 */
export function extractIntentAndEntities(message, history = []) {
  const q = (message || "").trim();
  const lower = q.toLowerCase();

  // Find most recent assistant message and cards for multi-turn context
  const recentModelMsgs = [...(history || [])].reverse().filter((h) => h.role === "model" || h.role === "assistant");
  const lastModelMsg = recentModelMsgs[0];
  const lastCards = Array.isArray(lastModelMsg?.cards) ? lastModelMsg.cards : [];
  const previousFoodCards = lastCards.filter((c) => c.type === "food");

  // Check explicit IDs in text
  const hex24Match = q.match(/[0-9a-fA-F]{24}/);
  const hex6Match = q.match(/\b([0-9a-fA-F]{6})\b/);
  const explicitOrderId = hex24Match ? hex24Match[0] : (hex6Match ? hex6Match[1] : null);

  // 1. Order tracking & ETA (Priority check before cart or general intents)
  if (
    /\b(where is my order|order status|track order|when will.*arrive|arrival time|delayed|how long|eta|is my order)\b/i.test(lower)
  ) {
    return {
      intent: "ORDER_ETA",
      tool: "getOrderETA",
      args: { orderId: explicitOrderId },
      filters: { orderId: explicitOrderId },
    };
  }

  // 2. Order history & Reorder
  if (/\b(reorder|order again|repeat order|reorder my last meal)\b/i.test(lower)) {
    return {
      intent: "REORDER",
      tool: "reorderPreviousOrder",
      args: { orderId: explicitOrderId },
      filters: {},
    };
  }

  if (/\b(show my latest order|what did i order|latest order|past orders|previous order|my orders|order history)\b/i.test(lower)) {
    return {
      intent: "ORDER_HISTORY",
      tool: "getOrderHistory",
      args: { limit: 5 },
      filters: {},
    };
  }

  // 3. Checkout confirmation
  const isAwaitingConfirmation = lastModelMsg?.text?.includes("Would you like me to place the order?");
  if (
    isAwaitingConfirmation &&
    /^(yes|confirm|place it|place order|proceed|do it|yes please)\b/i.test(lower)
  ) {
    return {
      intent: "CHECKOUT_CONFIRM",
      tool: "createOrder",
      args: { paymentMethod: "cod", confirmed: true },
      filters: {},
    };
  }

  // 4. Checkout request
  if (/\b(place order|place my order|checkout|order now)\b/i.test(lower)) {
    return {
      intent: "CHECKOUT_REQUEST",
      tool: "getCart",
      args: {},
      filters: {},
    };
  }

  // 5. Cart Clear
  if (/\b(clear cart|empty my cart|empty cart|remove all|remove everything)\b/i.test(lower)) {
    return {
      intent: "CART_CLEAR",
      tool: "clearCart",
      args: {},
      filters: {},
    };
  }

  // 6. Cart View (Specific phrases, avoid bare "my cart")
  if (
    /\b(what('?s| is) in my cart|whats in my cart|show cart|view cart|cart total|my cart total|items in cart)\b/i.test(lower)
  ) {
    return {
      intent: "CART_VIEW",
      tool: "getUserCart",
      args: {},
      filters: {},
    };
  }

  // 7. Cart Remove
  if (/\b(remove|delete)\b/i.test(lower)) {
    const cleanItem = lower
      .replace(/^(please\s+)?(remove|delete)\s+(the\s+)?/i, "")
      .replace(/\s+(from|out of)\s+(my\s+)?cart/i, "")
      .replace(/[.!]/g, "")
      .trim();

    return {
      intent: "CART_REMOVE",
      tool: "removeItemFromCart",
      args: { itemName: cleanItem },
      filters: { item: cleanItem },
    };
  }

  // 8. Cart Add / Multi-turn selection
  if (
    /\b(add|put)\b/i.test(lower) &&
    !/\b(address|coupon)\b/i.test(lower)
  ) {
    const qty = parseQuantity(lower);
    let targetCard = null;

    if (/\b(cheapest|lowest price)\b/i.test(lower)) {
      if (previousFoodCards.length > 0) {
        targetCard = [...previousFoodCards].sort((a, b) => (a.data?.price || 0) - (b.data?.price || 0))[0];
      }
    } else if (/\b(first|1st|first one)\b/i.test(lower)) {
      targetCard = previousFoodCards[0];
    } else if (/\b(second|2nd|second one)\b/i.test(lower)) {
      targetCard = previousFoodCards[1];
    } else if (/\b(third|3rd|third one)\b/i.test(lower)) {
      targetCard = previousFoodCards[2];
    } else if (/\b(those|that|it|both|two)\b/i.test(lower) && previousFoodCards.length > 0) {
      targetCard = previousFoodCards[0];
    }

    const cleanDish = lower
      .replace(/^(please\s+)?(add|put)\s+(\d+|two|one|three|four|a|an)?\s*/i, "")
      .replace(/\b(to|into)\s+(my\s+)?cart\b/i, "")
      .replace(/\b(of\s+those|of\s+that|the\s+first\s+one|the\s+cheapest\s+one|that\s+one|it)\b/i, "")
      .replace(/[.!]/g, "")
      .trim();

    return {
      intent: "CART_ADD",
      tool: "addItemToCart",
      args: {
        quantity: qty,
        itemId: targetCard?.data?.itemId || null,
        itemName: cleanDish || targetCard?.data?.name || null,
        restaurantId: targetCard?.data?.restaurantId || null,
      },
      filters: { quantity: qty, targetItem: targetCard?.data?.name || cleanDish },
    };
  }

  // 9. Coupons & Discounts
  if (/\b(coupon|coupons|discount|discounts|offer|offers|promo|promos)\b/i.test(lower)) {
    if (/\b(best|highest|apply|find me the best|cheapest)\b/i.test(lower)) {
      return {
        intent: "COUPON_APPLY",
        tool: "applyCoupon",
        args: { couponCode: "BEST" },
        filters: { strategy: "max_discount" },
      };
    }
    return {
      intent: "COUPONS_LIST",
      tool: "getAvailableCoupons",
      args: {},
      filters: {},
    };
  }

  // 10. Recommendations / Preferences
  if (/\b(what should i order|recommend|suggest|what's good|surprise me)\b/i.test(lower)) {
    return {
      intent: "RECOMMENDATION",
      tool: "getUserPreferences",
      args: {},
      filters: {},
    };
  }

  // 11. Multi-turn refinement on previous query (e.g. User said "Find biryani", now says "Under ₹300" or "Only chicken")
  const { maxPrice, minPrice } = parsePriceConstraint(lower);
  const { isVegetarian, isSpicy, highlyRated, cheapest, fastest } = parseDietAndTaste(lower);

  let detectedFood = "";
  const foodKeywords = [
    "biryani", "pizza", "burger", "sushi", "sub", "sandwich",
    "fries", "truffle", "wings", "coke", "coca-cola", "pasta",
    "salad", "curry", "paneer", "chicken", "mutton", "tikka",
  ];

  for (const kw of foodKeywords) {
    if (lower.includes(kw)) {
      detectedFood = kw;
      break;
    }
  }

  // If no food word in current turn, check if previous query had one
  if (!detectedFood && (maxPrice || isVegetarian || isSpicy || cheapest || fastest)) {
    const lastUserMsg = [...(history || [])].reverse().find((h) => h.role === "user");
    if (lastUserMsg) {
      for (const kw of foodKeywords) {
        if (lastUserMsg.text?.toLowerCase().includes(kw)) {
          detectedFood = kw;
          break;
        }
      }
    }
  }

  // Restaurant search vs Food search
  const isRestaurantQuery = /\b(restaurant|bistro|pizzeria|darbar|place|kitchen|outlet)\b/i.test(lower) && !detectedFood;

  if (isRestaurantQuery) {
    return {
      intent: "RESTAURANT_SEARCH",
      tool: "searchRestaurants",
      args: {
        query: q.replace(/\b(find|show|search|restaurants|near me)\b/gi, "").trim(),
        minRating: highlyRated ? 90 : null,
      },
      filters: { highlyRated },
    };
  }

  // Default to FOOD_SEARCH
  let cleanSearchQuery = detectedFood;
  if (!cleanSearchQuery) {
    const stripped = lower
      .replace(/\b(find|show|search|give|get|me|something|food|options|dishes|want|eat|i|hungry|under|below|less than|around|spicy|vegetarian|veg|hot|highly rated|top rated)\b/gi, "")
      .replace(/\b\d+\b/g, "")
      .replace(/[₹,.]/g, "")
      .trim();
    cleanSearchQuery = stripped || undefined;
  }

  let sortBy = "price_asc";
  if (highlyRated) sortBy = "rating";
  if (fastest) sortBy = "speed";
  if (cheapest) sortBy = "price_asc";

  return {
    intent: "FOOD_SEARCH",
    tool: "searchFoodItems",
    args: {
      query: cleanSearchQuery,
      maxPrice,
      minPrice,
      vegetarianOnly: isVegetarian,
      isSpicy,
      sortBy,
    },
    filters: {
      query: cleanSearchQuery,
      maxPrice,
      vegetarian: isVegetarian,
      spicy: isSpicy,
      highlyRated,
      cheapest,
      fastest,
    },
  };
}

/**
 * Execute authoritative RAG food retrieval from MongoDB
 */
export async function retrieveGroundedFoodItems({
  query,
  maxPrice,
  minPrice,
  vegetarianOnly,
  isSpicy,
  restaurantId,
  sortBy = "price_asc",
  limit = 6,
}) {
  const filter = { isAvailable: { $ne: false } };

  if (query && typeof query === "string" && query.trim()) {
    const clean = query.trim();
    filter.$or = [
      { name: { $regex: clean, $options: "i" } },
      { description: { $regex: clean, $options: "i" } },
      { category: { $regex: clean, $options: "i" } },
    ];
  }

  if (maxPrice && !isNaN(maxPrice)) {
    filter.price = { ...(filter.price || {}), $lte: Number(maxPrice) };
  }
  if (minPrice && !isNaN(minPrice)) {
    filter.price = { ...(filter.price || {}), $gte: Number(minPrice) };
  }
  if (vegetarianOnly) {
    filter.isVegetarian = true;
  }
  if (isSpicy) {
    filter.isSpicy = true;
  }
  if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
    filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
  }

  let sortOption = { price: 1 };
  if (sortBy === "price_desc") sortOption = { price: -1 };

  const items = await MenuItem.find(filter)
    .populate("restaurantId", "name isOpen averagePrepTime reliabilityScore autoLocation")
    .sort(sortOption)
    .limit(limit)
    .lean();

  const formatted = items.map((i) => {
    const rest = i.restaurantId || {};
    return {
      itemId: i._id.toString(),
      name: i.name,
      description: i.description || "",
      price: i.price,
      category: i.category || "General",
      isSpicy: !!i.isSpicy,
      isVegetarian: !!i.isVegetarian,
      isAvailable: i.isAvailable,
      restaurantId: rest._id?.toString() || "",
      restaurantName: rest.name || "BiteDash Kitchen",
      restaurantRating: rest.reliabilityScore ? (rest.reliabilityScore / 20).toFixed(1) : "4.5",
      reliabilityScore: rest.reliabilityScore || 90,
      prepTime: `${rest.averagePrepTime || 20} mins`,
      isOpen: rest.isOpen !== false,
      image: i.image,
    };
  });

  // Sort in-memory if rating or speed was requested
  if (sortBy === "rating") {
    formatted.sort((a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0));
  } else if (sortBy === "speed") {
    formatted.sort((a, b) => parseInt(a.prepTime, 10) - parseInt(b.prepTime, 10));
  }

  return {
    found: formatted.length > 0,
    count: formatted.length,
    items: formatted,
    cards: formatted.map((item) => ({ type: "food", data: item })),
  };
}
