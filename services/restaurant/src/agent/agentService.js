/**
 * BiteDash Agentic AI Service
 *
 * Coordinates OpenAI Tool Calling with strict schema validation, authenticated execution,
 * contextual conversation resolution, action state tracking, and deterministic fallbacks.
 */

import OpenAI from "openai";
import { agentTools } from "./agentTools.js";
import { dispatchAgentTool } from "./agentExecutors.js";
import { executeDeterministicAgent } from "./deterministicAgent.js";

const SYSTEM_INSTRUCTION = `You are BiteDash Copilot — an expert AI food-ordering agent for the BiteDash marketplace platform.
You can understand natural-language food requests, discover restaurants, inspect menus, manage the customer's real cart, apply verified promo coupons, explain dynamic ETAs, reorder past meals, and securely prepare orders for checkout.

CRITICAL OPERATIONAL RULES:
1. AUTHENTICATION & TRUTH:
   - You interact with real backend tools. Scoped strictly to the authenticated user.
   - NEVER fabricate restaurants, dishes, prices, ratings, or delivery times. Always call tools (searchRestaurants, searchMenuItems, getCart, getOrderETA, etc.) to get ground truth.
   - Prices are in ₹ (Indian Rupee).

2. CART CONTROL:
   - When a user asks to add or remove food, use addToCart or removeFromCart.
   - If user asks "What's in my cart?" or "What's my total?", use getCart or calculateCartTotal. Never guess the total.
   - BiteDash enforces a single-restaurant cart rule. If addToCart reports a restaurant conflict, explain politely and ask if they'd like to clear the cart first.

3. CONTEXTUAL RESOLUTION:
   - Understand references to previous messages: "the first one", "those", "add another", "remove it", "the second restaurant".
   - Map these to the corresponding item ID or restaurant ID from the conversation context.

4. CHECKOUT SAFETY & CONFIRMATION:
   - NEVER place an order or call createOrder merely because the user talked about ordering.
   - When the user says "Place my order" or "Checkout", first present the final order summary (items, subtotal, delivery fee, platform fee, coupon discount, and grand total) and ask:
     "Would you like me to place the order? Please reply 'Yes' or 'Confirm' to proceed."
   - ONLY after the user explicitly confirms ("Yes", "Confirm", "Place it") should you invoke createOrder with confirmed: true.

5. INTELLIGENT ORDER EXPLANATION:
   - BiteDash calculates dynamic ETAs factoring preparation history, kitchen load, rider travel, and traffic conditions.
   - When a customer asks "Where is my order?" or "Why is it delayed?", call getOrderETA or getOrderStatus and explain the live stage conversationally using the telemetry breakdown.

6. TONE:
   - Friendly, efficient, concise, and helpful. Use bold text for dish names and prices.`;

// Tool name to user-facing action text
const ACTION_MAP = {
  searchRestaurants: "🔎 Searching restaurants...",
  searchMenuItems: "🍔 Checking menu items...",
  getRestaurantDetails: "🏬 Fetching restaurant details...",
  getMenu: "📜 Reading menu...",
  getFoodItemDetails: "🍽️ Inspecting dish...",
  getCart: "🛒 Fetching your cart...",
  addToCart: "🛒 Adding to your cart...",
  removeFromCart: "🛒 Removing from cart...",
  updateCartQuantity: "🛒 Updating quantity...",
  clearCart: "🗑️ Clearing cart...",
  getAvailableCoupons: "🎟️ Checking available offers...",
  applyCoupon: "🎟️ Applying discount coupon...",
  calculateCartTotal: "💳 Calculating cart total...",
  getOrderHistory: "📦 Loading order history...",
  getOrderDetails: "📦 Fetching order details...",
  getOrderStatus: "📍 Checking order stage...",
  getOrderETA: "🛵 Calculating live arrival ETA...",
  reorderPreviousOrder: "🔁 Reordering previous meal...",
  createOrder: "✨ Creating order...",
  initiatePayment: "💳 Preparing secure checkout...",
  getUserPreferences: "💡 Checking your taste preferences...",
};

/**
 * Main chat handler for the agentic assistant
 */
export async function runAgentChat({ userId, message, history = [] }) {
  if (!userId) {
    return {
      reply: "Please log in to your BiteDash account to interact with your personal AI food copilot.",
      cards: [],
      mode: "unauthorized",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // If no OpenAI key, use Deterministic Backend Execution Engine
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    const result = await executeDeterministicAgent(userId, message, history);
    return {
      reply: result.reply,
      cards: result.cards || [],
      action: result.action || "Completed",
      cartUpdated: !!result.cartUpdated,
      mode: "deterministic_engine",
    };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // Format conversation messages
    const formattedMessages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
    ];

    // Append last 10 messages from history
    for (const h of (history || []).slice(-10)) {
      const role = h.role === "assistant" || h.role === "model" ? "assistant" : "user";
      if (h.text || h.content) {
        formattedMessages.push({
          role,
          content: h.text || h.content,
        });
      }
    }

    // Append current user prompt
    formattedMessages.push({
      role: "user",
      content: message.trim(),
    });

    const collectedCards = [];
    const actionsTaken = [];
    let cartUpdated = false;

    // OpenAI Tool Calling Loop (up to 5 iterations)
    let iterations = 0;
    let currentMessages = [...formattedMessages];

    while (iterations < 5) {
      iterations++;

      const completion = await openai.chat.completions.create({
        model,
        messages: currentMessages,
        tools: agentTools,
        tool_choice: "auto",
        temperature: 0.2,
      });

      const responseMessage = completion.choices[0].message;
      currentMessages.push(responseMessage);

      // Check if tool calls were requested
      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        // Final text response reached
        return {
          reply: responseMessage.content || "I have updated your request.",
          cards: collectedCards,
          actions: actionsTaken,
          cartUpdated,
          mode: "openai_agentic_tool_calling",
        };
      }

      // Execute requested tools
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          functionArgs = {};
        }

        const actionText = ACTION_MAP[functionName] || `Executing ${functionName}...`;
        actionsTaken.push(actionText);

        if (
          ["addToCart", "removeFromCart", "updateCartQuantity", "clearCart", "applyCoupon", "reorderPreviousOrder", "createOrder"].includes(
            functionName
          )
        ) {
          cartUpdated = true;
        }

        // Execute tool with authenticated userId
        const toolResult = await dispatchAgentTool(functionName, functionArgs, userId);

        // Collect cards if present in tool result
        if (Array.isArray(toolResult?.cards)) {
          collectedCards.push(...toolResult.cards);
        }

        // Send tool output back to model
        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // Fallback if loop exceeded max iterations
    return {
      reply: "I've processed your food request. Let me know if you'd like to make any changes!",
      cards: collectedCards,
      actions: actionsTaken,
      cartUpdated,
      mode: "openai_agentic_tool_calling",
    };
  } catch (err) {
    console.warn("⚠️ OpenAI Agent error, falling back to Deterministic Engine:", err.message);
    const fallbackResult = await executeDeterministicAgent(userId, message, history);
    return {
      reply: fallbackResult.reply,
      cards: fallbackResult.cards || [],
      action: fallbackResult.action || "Completed via fallback",
      cartUpdated: !!fallbackResult.cartUpdated,
      mode: "deterministic_fallback",
    };
  }
}
