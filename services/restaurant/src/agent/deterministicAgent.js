/**
 * BiteDash Deterministic Backend Execution Engine
 *
 * Provides a 100% reliable, zero-downtime conversational fallback when OpenAI is
 * unavailable, unconfigured, rate-limited, or experiencing timeouts.
 *
 * Executes the EXACT SAME authenticated backend tools as the LLM layer,
 * resolves contextual references (e.g. "add the first one", "those"), and returns
 * structured interactive cards.
 */

import {
  executeSearchMenuItems,
  executeSearchRestaurants,
  executeGetCart,
  executeAddToCart,
  executeRemoveFromCart,
  executeClearCart,
  executeGetAvailableCoupons,
  executeApplyCoupon,
  executeGetOrderHistory,
  executeGetOrderDetails,
  executeGetOrderStatus,
  executeGetOrderETA,
  executeReorderPreviousOrder,
  executeCreateOrder,
} from "./agentExecutors.js";
import MenuItem from "../models/MenuItems.js";

// Helper: parse numbers from words (e.g. "two" -> 2)
function parseQuantity(text) {
  const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const numMatch = text.match(/\b(\d+)\b/);
  if (numMatch) return parseInt(numMatch[1], 10);

  for (const [word, val] of Object.entries(wordMap)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return val;
  }
  return 1;
}

// Helper: extract price constraint (e.g. "under 300", "below 250", "< 400")
function parseMaxPrice(text) {
  const match = text.match(/(?:under|below|less than|<|around)\s*₹?\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

export async function executeDeterministicAgent(userId, message, history = []) {
  const q = message.trim().toLowerCase();
  const hex24Match = message.match(/[0-9a-fA-F]{24}/);
  const hex6Match = message.match(/\b([0-9a-fA-F]{6})\b/);
  const explicitOrderId = hex24Match ? hex24Match[0] : (hex6Match ? hex6Match[1] : null);

  // ─── Intent 1: Checkout Confirmation ("Yes", "Confirm", "Place it") ──────
  const lastBotMessage = [...history].reverse().find((h) => h.role === "model" || h.role === "assistant");
  const isAwaitingConfirmation = lastBotMessage?.text?.includes("Would you like me to place the order?");

  if (
    isAwaitingConfirmation &&
    (q === "yes" || q === "confirm" || q === "place it" || q === "yes please" || q === "proceed" || q === "do it")
  ) {
    const orderRes = await executeCreateOrder(userId, { paymentMethod: "cod", confirmed: true });
    if (!orderRes.success) {
      return {
        reply: `⚠️ ${orderRes.message}`,
        cards: orderRes.cards || [],
        action: "Placing order...",
        cartUpdated: true,
      };
    }

    return {
      reply: `${orderRes.message}\n\n• Delivery to your saved address\n• Payment: Cash on Delivery / Pay on Arrival\n\nYou can track the live preparation and delivery status anytime by asking "Where is my order?".`,
      cards: orderRes.cards,
      action: "Order placed 🎉",
      cartUpdated: true,
    };
  }

  // ─── Intent 2: Checkout Request ("Place order", "Checkout") ────────────────
  if (
    q.includes("place order") ||
    q.includes("place my order") ||
    q.includes("checkout") ||
    q.includes("order now")
  ) {
    const cart = await executeGetCart(userId);
    if (cart.isEmpty) {
      return {
        reply: "Your cart is currently empty! Search for delicious dishes like biryani or pizza to add items to your cart first.",
        cards: cart.cards,
      };
    }

    const itemsSummary = cart.items
      .map((i) => `• ${i.quantity} × **${i.name}** — ₹${i.itemTotal}`)
      .join("\n");

    const discountLine = cart.discount > 0 ? `\n• **Coupon Discount:** -₹${cart.discount}` : "";
    const deliveryLine = cart.deliveryFee > 0 ? `\n• **Delivery Fee:** ₹${cart.deliveryFee}` : "\n• **Delivery Fee:** FREE";

    const reply =
      `📋 **Order Checkout Summary** (${cart.restaurantName})\n\n` +
      `${itemsSummary}\n\n` +
      `• **Subtotal:** ₹${cart.subtotal}` +
      discountLine +
      deliveryLine +
      `\n• **Platform Fee:** ₹${cart.platformFee}\n` +
      `**Total Payable: ₹${cart.totalAmount}**\n\n` +
      `Would you like me to place the order? Please reply **"Yes"** or **"Confirm"** to proceed.`;

    return {
      reply,
      cards: cart.cards,
      action: "Reviewing checkout summary...",
    };
  }

  // ─── Intent 3: Cart Management (Add, View, Remove, Clear) ─────────────────
  // Add to cart
  if (q.startsWith("add ") || q.includes("add to cart") || q.includes("add another") || q.includes("add 2") || q.includes("add two")) {
    const qty = parseQuantity(q);

    // Case A: Contextual reference ("add the first one", "add two of those", "add that")
    let targetItem = null;
    if (q.includes("first one") || q.includes("first") || q.includes("those") || q.includes("that")) {
      // Look back for items mentioned in previous bot response
      const recentFoodCard = lastBotMessage?.cards?.find((c) => c.type === "food");
      if (recentFoodCard?.data?.itemId) {
        targetItem = await MenuItem.findById(recentFoodCard.data.itemId);
      }
    }

    // Case B: Explicit item search (e.g. "add 2 chicken biryani", "add a coke")
    if (!targetItem) {
      const cleanTerm = q
        .replace(/add\s+(to cart|two|one|three|four|\d+)?/gi, "")
        .replace(/\b(a|an|the|of|those|that)\b/gi, "")
        .trim();

      if (cleanTerm) {
        targetItem = await MenuItem.findOne({
          name: { $regex: cleanTerm, $options: "i" },
          isAvailable: true,
        }).populate("restaurantId");
      }
    }

    if (targetItem) {
      const addRes = await executeAddToCart(userId, {
        itemId: targetItem._id.toString(),
        quantity: qty,
      });

      if (!addRes.success) {
        return {
          reply: `⚠️ ${addRes.message}`,
          cards: addRes.cards || [],
          action: "Updating cart...",
        };
      }

      return {
        reply: `Done! I've added **${qty} × ${targetItem.name}** (₹${targetItem.price} each) to your cart. Total is now **₹${addRes.cart.totalAmount}**.`,
        cards: addRes.cards,
        action: "🛒 Updated your cart",
        cartUpdated: true,
      };
    }

    // If item could not be matched directly, search catalog
    const searchRes = await executeSearchMenuItems({ query: q.replace(/add/gi, "").trim(), limit: 4 });
    if (searchRes.found) {
      return {
        reply: "I found these matching items. Tap **Add to Cart** on your preferred choice or tell me which one:",
        cards: searchRes.cards,
        action: "Found matching dishes",
      };
    }
  }

  // Clear cart
  if (q.includes("clear cart") || q.includes("remove all") || q.includes("empty cart") || q.includes("remove everything")) {
    const clearRes = await executeClearCart(userId);
    return {
      reply: "🗑️ Your cart has been cleared. Let me know what you'd like to order instead!",
      cards: clearRes.cards,
      action: "Cart cleared",
      cartUpdated: true,
    };
  }

  // Remove specific item
  if (q.startsWith("remove ") || q.startsWith("delete ")) {
    const term = q.replace(/^(remove|delete)\s+/i, "").trim();
    const removeRes = await executeRemoveFromCart(userId, { itemId: term });
    return {
      reply: removeRes.success
        ? `Removed "${term}" from your cart. New total: ₹${removeRes.cart?.totalAmount || 0}.`
        : `⚠️ ${removeRes.message}`,
      cards: removeRes.cards || [],
      action: "Updating cart...",
      cartUpdated: true,
    };
  }

  // View cart
  if (
    q.includes("what's in my cart") ||
    q.includes("whats in my cart") ||
    q.includes("show cart") ||
    q.includes("my cart") ||
    q.includes("view cart") ||
    q.includes("cart total") ||
    q.includes("total")
  ) {
    const cart = await executeGetCart(userId);
    if (cart.isEmpty) {
      return {
        reply: "Your cart is currently empty. Tell me what you're craving (e.g. 'Show me biryani under ₹300')!",
        cards: cart.cards,
      };
    }

    const itemsSummary = cart.items
      .map((i) => `• ${i.quantity} × ${i.name} — ₹${i.itemTotal}`)
      .join("\n");

    const couponText = cart.discount > 0 ? `\n• Discount (${cart.appliedCoupon?.code}): -₹${cart.discount}` : "";
    const reply =
      `🛒 **Your BiteDash Cart** (${cart.restaurantName})\n\n` +
      `${itemsSummary}\n\n` +
      `• Subtotal: ₹${cart.subtotal}` +
      couponText +
      `\n• Delivery Fee: ₹${cart.deliveryFee}\n` +
      `• Platform Fee: ₹${cart.platformFee}\n` +
      `**Total: ₹${cart.totalAmount}**`;

    return {
      reply,
      cards: cart.cards,
      action: "Cart loaded",
    };
  }

  // ─── Intent 4: Coupons & Discounts ────────────────────────────────────────
  if (q.includes("coupon") || q.includes("discount") || q.includes("offer") || q.includes("promo")) {
    // Check if user named a specific coupon or asked for the best one
    if (q.includes("apply") || q.includes("best")) {
      const cart = await executeGetCart(userId);
      if (cart.isEmpty) {
        return {
          reply: "Add items to your cart first, and I will find and apply the highest discount offer for you!",
          cards: cart.cards,
        };
      }

      // Check for named code (e.g. WELCOME50, BITEDASH20)
      const codeMatch = q.match(/\b(WELCOME50|BITEDASH20|FEAST100|FREEDEL|SUPERCHEFS)\b/i);
      const targetCode = codeMatch ? codeMatch[1].toUpperCase() : (cart.subtotal >= 499 ? "FEAST100" : (cart.subtotal >= 249 ? "BITEDASH20" : "WELCOME50"));

      const applyRes = await executeApplyCoupon(userId, { couponCode: targetCode });
      return {
        reply: applyRes.message,
        cards: applyRes.cards || [],
        action: "Applied coupon 🎟️",
        cartUpdated: true,
      };
    }

    // List available coupons
    const couponsRes = await executeGetAvailableCoupons(userId);
    const list = couponsRes.coupons
      .map((c) => `• **${c.code}**: ${c.description} ${c.isEligible ? "✅ *(Eligible)*" : `*(Need ₹${c.shortfall} more)*`}`)
      .join("\n");

    return {
      reply: `🎟️ **Available BiteDash Offers**\n\n${list}\n\nSay **"Apply the best coupon"** or tap any coupon card to use it!`,
      cards: couponsRes.cards,
      action: "Checking available offers...",
    };
  }

  // ─── Intent 5: Order Tracking, Status & ETA ────────────────────────────────
  if (
    q.includes("where is my order") ||
    q.includes("order status") ||
    q.includes("track") ||
    q.includes("when will") ||
    q.includes("arrive") ||
    q.includes("eta") ||
    q.includes("how long")
  ) {
    const etaRes = await executeGetOrderETA(userId, { orderId: explicitOrderId });
    if (!etaRes.found) {
      return {
        reply: etaRes.message || "I couldn't find an active order for your account.",
        action: "Order check completed",
      };
    }

    if (etaRes.status === "delivered") {
      return {
        reply: `Order #${etaRes.shortId} from **${etaRes.restaurant}** has already been delivered! 🎉 Enjoy your meal.`,
        cards: etaRes.cards,
      };
    }

    const reply =
      `🛵 **Order #${etaRes.shortId} Tracking Update** (${etaRes.restaurant})\n\n` +
      `• **Status:** \`${etaRes.status.toUpperCase()}\`\n` +
      `• **Estimated Arrival:** **${etaRes.totalETA}** (Around ${etaRes.expectedArrival})\n` +
      `• **Traffic Condition:** ${etaRes.trafficCondition}\n\n` +
      `**Kitchen & Delivery Breakdown:**\n` +
      `• Kitchen Cooking: ${etaRes.breakdown.foodPreparationTime}\n` +
      `• Order Queue Load: ${etaRes.breakdown.kitchenQueueTime}\n` +
      `• Rider Travel Time: ${etaRes.breakdown.riderTravelTime}`;

    return {
      reply,
      cards: etaRes.cards,
      action: "Checked live order telemetry 📦",
    };
  }

  // ─── Intent 6: Order History & Reorder ─────────────────────────────────────
  if (q.includes("reorder") || q.includes("order again") || q.includes("repeat order")) {
    const reorderRes = await executeReorderPreviousOrder(userId, { orderId: explicitOrderId });
    return {
      reply: reorderRes.message,
      cards: reorderRes.cards || [],
      action: "Reordered previous meal 🔁",
      cartUpdated: true,
    };
  }

  if (q.includes("history") || q.includes("my orders") || q.includes("past orders") || q.includes("previous order")) {
    const historyRes = await executeGetOrderHistory(userId, { limit: 5 });
    if (!historyRes.found) {
      return { reply: historyRes.message };
    }

    const list = historyRes.orders
      .map((o, idx) => `${idx + 1}. **Order #${o.shortId}** from *${o.restaurant}* (₹${o.totalAmount}) — \`${o.status.toUpperCase()}\` — ${o.placedAt}`)
      .join("\n");

    return {
      reply: `📦 **Your Recent BiteDash Orders**\n\n${list}\n\nSay **"Reorder my last meal"** or ask for the status of any order!`,
      cards: historyRes.cards,
      action: "Loaded order history",
    };
  }

  // ─── Intent 7: Food / Menu Search & Recommendations ───────────────────────
  const maxPrice = parseMaxPrice(q);
  const cleanSearchQuery = q
    .replace(/\b(find|show|search|give|get|me|something|some|food|options|good|delicious|hungry|i'm|im|want|eat|under|below|less than)\b/gi, "")
    .replace(/\b\d+\b/g, "")
    .replace(/₹/g, "")
    .trim();

  const searchRes = await executeSearchMenuItems({
    query: cleanSearchQuery || undefined,
    maxPrice,
    limit: 6,
  });

  if (searchRes.found) {
    const priceText = maxPrice ? ` under ₹${maxPrice}` : "";
    const titleText = cleanSearchQuery ? `matching "${cleanSearchQuery}"` : "popular dishes";
    return {
      reply: `Here are ${titleText}${priceText} you can order right now:`,
      cards: searchRes.cards,
      action: "🍔 Checked menu items",
    };
  }

  // Restaurant search fallback
  const restRes = await executeSearchRestaurants({ query: cleanSearchQuery, limit: 4 });
  if (restRes.found) {
    return {
      reply: "I found these top-rated restaurants near you:",
      cards: restRes.cards,
      action: "🔎 Searched restaurants",
    };
  }

  return {
    reply: "Welcome to BiteDash AI Copilot! I can help you discover dishes, manage your cart, apply discount coupons, track live order ETAs, or reorder past favorites.\n\nTry asking:\n• *'Find me a chicken biryani under ₹300'*\n• *'What's in my cart?'*\n• *'Apply the best coupon'*\n• *'Where is my order?'*",
    action: "Ready to assist",
  };
}
