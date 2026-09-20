/**
 * AI Customer Support Controller
 *
 * Uses Google Gemini with function/tool calling to provide accurate,
 * real-data-backed responses to customer queries about their orders.
 *
 * Scoped strictly to authenticated customer (req.user._id).
 * No hardcoded responses.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import TryCatch from "../middlewares/trycatch.js";
import { getDetailedETA } from "../services/etaService.js";

// ─── Stage & Description Helpers ──────────────────────────────────────────

const STAGE_MAP = {
  placed: { stage: 1, label: "Order Placed", prepStatus: "Awaiting restaurant confirmation", riderStatus: "Not yet dispatched" },
  accepted: { stage: 2, label: "Restaurant Accepted", prepStatus: "Restaurant accepted, preparing queue", riderStatus: "Searching for nearby rider" },
  preparing: { stage: 3, label: "Kitchen Preparing Food", prepStatus: "Food is being cooked fresh in the kitchen", riderStatus: "Rider dispatch in progress" },
  ready_for_rider: { stage: 4, label: "Food Ready & Packed", prepStatus: "Cooking complete, packaged and waiting for pickup", riderStatus: "Awaiting rider arrival at restaurant" },
  rider_assigned: { stage: 4, label: "Rider En Route to Pickup", prepStatus: "Food packed and ready", riderStatus: "Rider assigned and heading to restaurant" },
  picked_up: { stage: 5, label: "Out for Delivery", prepStatus: "Completed", riderStatus: "Food picked up and riding to your delivery address" },
  delivered: { stage: 6, label: "Delivered", prepStatus: "Completed", riderStatus: "Delivered to customer" },
  cancelled: { stage: 0, label: "Cancelled", prepStatus: "Cancelled", riderStatus: "N/A" },
};

// ─── Tool Definitions (Gemini Function Declarations) ───────────────────────

const tools = [
  {
    functionDeclarations: [
      {
        name: "getMyOrders",
        description:
          "Fetch recent orders placed by the authenticated customer. Returns order ID, restaurant name, items, order status, total amount, and placement date.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: {
              type: "NUMBER",
              description: "Number of orders to retrieve (default 5, max 10)",
            },
          },
          required: [],
        },
      },
      {
        name: "getOrderDetails",
        description:
          "Fetch complete details of a specific order including items ordered, preparation status, rider status, delivery stage, and estimated delivery time.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: {
              type: "STRING",
              description: "The order ID or last 6 characters of order ID",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getOrderStatus",
        description:
          "Get the current delivery stage, preparation status, and rider status of an order. Use when customer asks 'where is my order' or 'what is the status'.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: {
              type: "STRING",
              description: "The order ID to check",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getDeliveryETA",
        description:
          "Calculate and return the estimated time of arrival (ETA) in minutes and target arrival clock time for an active order.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: {
              type: "STRING",
              description: "The order ID to check ETA for",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getLatestOrder",
        description:
          "Fetch the customer's latest order (active or recently placed). Use when the customer asks 'Where is my order', 'Show me my latest order', or 'When will my food arrive' without giving an ID.",
        parameters: {
          type: "OBJECT",
          properties: {},
          required: [],
        },
      },
    ],
  },
];

// ─── Database Order Resolver (Scoped to User) ──────────────────────────────

async function resolveUserOrder(userId, orderId) {
  if (!orderId) return null;
  const cleanId = orderId.trim();

  // 1. Try exact 24-character ObjectId match
  if (cleanId.length === 24) {
    const order = await Order.findOne({
      _id: cleanId,
      userId: userId.toString(),
    }).lean();
    if (order) return order;
  }

  // 2. Try shortcode match (last 6 characters)
  const orders = await Order.find({ userId: userId.toString() })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return orders.find(
    (o) => o._id.toString().slice(-6).toUpperCase() === cleanId.toUpperCase()
  ) || null;
}

// ─── Tool Executors ────────────────────────────────────────────────────────

async function executeGetMyOrders(userId, args = {}) {
  const limit = Math.min(Number(args.limit) || 5, 10);
  const orders = await Order.find({
    userId: userId.toString(),
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (!orders || orders.length === 0) {
    return { found: false, message: "You have no orders yet." };
  }

  const orderSummaries = await Promise.all(
    orders.map(async (o) => {
      const eta = await getDetailedETA(o);
      const stageInfo = STAGE_MAP[o.status] || STAGE_MAP.placed;
      return {
        orderId: o._id.toString(),
        shortId: o._id.toString().slice(-6).toUpperCase(),
        restaurant: o.restaurantName,
        orderStatus: o.status,
        currentStage: stageInfo.label,
        preparationStatus: stageInfo.prepStatus,
        riderStatus: o.riderName ? `Assigned to ${o.riderName}` : stageInfo.riderStatus,
        itemCount: (o.items || []).reduce((acc, i) => acc + (i.quauntity || 1), 0),
        totalAmount: o.totalAmount,
        estimatedDeliveryTime: o.status === "delivered" ? "Delivered" : `${eta.totalETA} mins`,
        createdAt: new Date(o.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      };
    })
  );

  return {
    found: true,
    count: orderSummaries.length,
    orders: orderSummaries,
  };
}

async function executeGetOrderDetails(userId, args) {
  const order = await resolveUserOrder(userId, args.orderId);
  if (!order) {
    return {
      found: false,
      message: `No order matching '${args.orderId}' found for your account.`,
    };
  }

  const eta = await getDetailedETA(order);
  const stageInfo = STAGE_MAP[order.status] || STAGE_MAP.placed;

  return {
    found: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    orderStatus: order.status,
    currentDeliveryStage: `Stage ${stageInfo.stage} of 5: ${stageInfo.label}`,
    preparationStatus: stageInfo.prepStatus,
    riderStatus: order.riderName
      ? `Rider: ${order.riderName} (${order.riderPhone || "In transit"})`
      : stageInfo.riderStatus,
    estimatedDeliveryTime:
      order.status === "delivered"
        ? "Delivered"
        : `${eta.totalETA} mins (Expected arrival around ${eta.targetDeliveryTime})`,
    isBatchedDelivery: !!order.isBatched,
    orderedItems: (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quauntity || 1,
      price: item.price,
      itemTotal: (item.price || 0) * (item.quauntity || 1),
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    deliveryAddress: order.deliveryAddress?.fromattedAddress || "Saved Delivery Address",
    createdAt: new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  };
}

async function executeGetOrderStatus(userId, args) {
  const order = await resolveUserOrder(userId, args.orderId);
  if (!order) {
    return {
      found: false,
      message: `No order matching '${args.orderId}' found under your account.`,
    };
  }

  const eta = await getDetailedETA(order);
  const stageInfo = STAGE_MAP[order.status] || STAGE_MAP.placed;

  return {
    found: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    orderStatus: order.status,
    currentDeliveryStage: `Stage ${stageInfo.stage} of 5: ${stageInfo.label}`,
    preparationStatus: stageInfo.prepStatus,
    riderStatus: order.riderName
      ? `Rider ${order.riderName} is handling your delivery.`
      : stageInfo.riderStatus,
    estimatedDeliveryTime:
      order.status === "delivered" ? "Delivered" : `${eta.totalETA} mins remaining`,
    isBatched: !!order.isBatched,
  };
}

async function executeGetDeliveryETA(userId, args) {
  const order = await resolveUserOrder(userId, args.orderId);
  if (!order) {
    return {
      found: false,
      message: `No order matching '${args.orderId}' found under your account.`,
    };
  }

  if (order.status === "delivered") {
    return {
      found: true,
      orderId: order._id.toString(),
      shortId: order._id.toString().slice(-6).toUpperCase(),
      orderStatus: "delivered",
      message: "This order has already been successfully delivered.",
      estimatedDeliveryTime: "Delivered",
    };
  }

  const eta = await getDetailedETA(order);

  return {
    found: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    orderStatus: order.status,
    estimatedDeliveryTime: `${eta.totalETA} mins`,
    expectedArrival: eta.targetDeliveryTime,
    breakdown: {
      foodPreparationTime: `${eta.breakdown.foodPreparationTime} mins`,
      kitchenQueueTime: `${eta.breakdown.kitchenQueueTime} mins`,
      riderTravelTime: `${eta.breakdown.riderTravelTime} mins`,
      additionalDelay: `${eta.breakdown.additionalDelay} mins`,
    },
    trafficCondition: eta.trafficLevel,
  };
}

async function executeGetLatestOrder(userId) {
  // First attempt: most recent active order
  let order = await Order.findOne({
    userId: userId.toString(),
    status: { $nin: ["delivered", "cancelled"] },
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  })
    .sort({ createdAt: -1 })
    .lean();

  // If no active order, fetch most recent order overall
  if (!order) {
    order = await Order.findOne({
      userId: userId.toString(),
      $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  if (!order) {
    return {
      found: false,
      message: "You have no order history yet. Browse restaurants to place an order!",
    };
  }

  return await executeGetOrderDetails(userId, { orderId: order._id.toString() });
}

// ─── Tool Dispatcher ────────────────────────────────────────────────────────

async function dispatchToolCall(functionName, args, userId) {
  switch (functionName) {
    case "getMyOrders":
      return await executeGetMyOrders(userId, args);
    case "getOrderDetails":
      return await executeGetOrderDetails(userId, args);
    case "getOrderStatus":
      return await executeGetOrderStatus(userId, args);
    case "getDeliveryETA":
      return await executeGetDeliveryETA(userId, args);
    case "getLatestOrder":
      return await executeGetLatestOrder(userId);
    default:
      return { error: `Unknown tool: ${functionName}` };
  }
}

// ─── Deterministic Backend Execution Engine ────────────────────────────────
// Parses natural customer queries and calls backend tools directly.
// Guarantees real database results when GEMINI_API_KEY is not configured or errors.
async function executeDeterministicSupport(userId, message) {
  const query = message.toLowerCase();

  // Extract explicit order ID from message (24-char ObjectId or 6-char hex)
  const hex24Match = message.match(/[0-9a-fA-F]{24}/);
  const hex6Match = message.match(/\b([0-9a-fA-F]{6})\b/);
  const orderId = hex24Match ? hex24Match[0] : (hex6Match ? hex6Match[1] : null);

  // Query Intent 1: "Show me my latest order" / "latest order" / "recent order"
  if (query.includes("latest") || query.includes("recent order") || query.includes("last order")) {
    const details = await executeGetLatestOrder(userId);
    if (!details.found) return details.message;

    const itemsText = details.orderedItems.map((i) => `• ${i.name} × ${i.quantity} (₹${i.itemTotal})`).join("\n");
    return `📦 **Latest Order #${details.shortId}** from **${details.restaurant}**\n\n` +
      `• **Status:** \`${details.orderStatus.toUpperCase()}\`\n` +
      `• **Stage:** ${details.currentDeliveryStage}\n` +
      `• **Kitchen Prep:** ${details.preparationStatus}\n` +
      `• **Delivery:** ${details.riderStatus}\n` +
      `• **ETA:** ${details.estimatedDeliveryTime}\n\n` +
      `**Ordered Items:**\n${itemsText}\n\n` +
      `**Total:** ₹${details.totalAmount} | Delivering to: ${details.deliveryAddress}`;
  }

  // Query Intent 2: "When will my food arrive?" / "ETA" / "arrival" / "how long"
  if (query.includes("arrive") || query.includes("when will") || query.includes("eta") || query.includes("how long")) {
    const etaData = orderId
      ? await executeGetDeliveryETA(userId, { orderId })
      : await executeGetDeliveryETA(userId, { orderId: (await executeGetLatestOrder(userId)).orderId });

    if (!etaData || !etaData.found) return etaData?.message || "No active order found to compute ETA.";
    if (etaData.orderStatus === "delivered") return `Order #${etaData.shortId} from ${etaData.restaurant} has already been delivered! 🎉`;

    return `🛵 **Estimated Arrival for Order #${etaData.shortId}**\n\n` +
      `• **Remaining Time:** **${etaData.estimatedDeliveryTime}**\n` +
      `• **Expected Around:** **${etaData.expectedArrival}**\n` +
      `• **Status:** \`${etaData.orderStatus}\` (${etaData.trafficCondition} traffic conditions)\n\n` +
      `**Breakdown:** Kitchen Prep: ${etaData.breakdown.foodPreparationTime} | Queue: ${etaData.breakdown.kitchenQueueTime} | Rider Transit: ${etaData.breakdown.riderTravelTime}`;
  }

  // Query Intent 3: "Where is my order?" / "What's the status of my order?" / "status"
  if (query.includes("where") || query.includes("status") || query.includes("track")) {
    const statusData = orderId
      ? await executeGetOrderStatus(userId, { orderId })
      : await executeGetOrderStatus(userId, { orderId: (await executeGetLatestOrder(userId)).orderId });

    if (!statusData || !statusData.found) return statusData?.message || "I couldn't find an order to check.";

    return `📍 **Order Status #${statusData.shortId}** (${statusData.restaurant})\n\n` +
      `• **Current Stage:** ${statusData.currentDeliveryStage}\n` +
      `• **Kitchen Status:** ${statusData.preparationStatus}\n` +
      `• **Rider Status:** ${statusData.riderStatus}\n` +
      `• **ETA:** ${statusData.estimatedDeliveryTime}` +
      (statusData.isBatched ? `\n• *Note: Order is in an optimized eco-batch delivery route.*` : "");
  }

  // Query Intent 4: "List orders" / "Show all my orders" / "order history"
  if (query.includes("all order") || query.includes("my orders") || query.includes("history") || query.includes("list")) {
    const ordersRes = await executeGetMyOrders(userId, { limit: 5 });
    if (!ordersRes.found) return ordersRes.message;

    const listText = ordersRes.orders
      .map((o, idx) => `${idx + 1}. **Order #${o.shortId}** from *${o.restaurant}* — \`${o.orderStatus}\` (₹${o.totalAmount}) — ETA: ${o.estimatedDeliveryTime}`)
      .join("\n");

    return `Here are your recent orders:\n\n${listText}\n\nAsk about any order (e.g. "Status of order #${ordersRes.orders[0]?.shortId}") for live details!`;
  }

  // Default fallback: check latest order
  const latest = await executeGetLatestOrder(userId);
  if (latest && latest.found) {
    return `Your order #${latest.shortId} from **${latest.restaurant}** is currently \`${latest.orderStatus.toUpperCase()}\`.\n\n` +
      `• Stage: ${latest.currentDeliveryStage}\n` +
      `• Kitchen: ${latest.preparationStatus}\n` +
      `• Rider: ${latest.riderStatus}\n` +
      `• ETA: ${latest.estimatedDeliveryTime}\n\n` +
      `Feel free to ask "When will my food arrive?", "What did I order?", or "Show my recent orders"!`;
  }

  return "Welcome to BiteDash Support! Ask me 'Where is my order?', 'What's the status of my order?', 'When will my food arrive?', or 'Show me my latest order'.";
}

// ─── Main AI Support Chat Handler ──────────────────────────────────────────

export const aiSupportChat = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const { message, history = [] } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ message: "Message is required" });
  }

  const userQuery = message.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini API key, use deterministic backend lookup
  if (!apiKey) {
    const reply = await executeDeterministicSupport(user._id, userQuery);
    return res.json({
      reply,
      success: true,
      mode: "deterministic_backend_lookup",
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools,
      systemInstruction: `You are the AI Customer Support Agent for BiteDash, a food delivery platform.
You assist customers with order inquiries.

CRITICAL INSTRUCTIONS:
1. NEVER fabricate order information, restaurant names, status, or delivery timings.
2. ALWAYS use the provided tools (getLatestOrder, getOrderStatus, getDeliveryETA, getOrderDetails, getMyOrders) to fetch real database data.
3. When asked "Where is my order?", "What's the status of my order?", "When will my food arrive?", or "Show me my latest order" without an ID, call getLatestOrder.
4. When an order ID or 6-character shortcode is provided, call getOrderDetails or getOrderStatus with that ID.
5. In your response, clearly state:
   - Order ID
   - Restaurant Name
   - Ordered items & quantities
   - Order status & preparation status
   - Rider/delivery status
   - Estimated delivery time (ETA)
   - Current delivery stage
6. Maintain a polite, professional, and helpful tone. Format amounts in ₹ (Indian Rupee).`,
    });

    const formattedHistory = (history || [])
      .filter((h) => h.role && h.text)
      .slice(-10)
      .map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));

    const chat = model.startChat({ history: formattedHistory });
    let result = await chat.sendMessage(userQuery);
    let response = result.response;

    // Handle tool calling loop
    let iterations = 0;
    while (
      response.candidates?.[0]?.content?.parts?.some((p) => p.functionCall) &&
      iterations < 5
    ) {
      iterations++;
      const functionCalls = response.candidates[0].content.parts.filter((p) => p.functionCall);
      const functionResponses = [];

      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        const toolOutput = await dispatchToolCall(name, args || {}, user._id);
        functionResponses.push({
          functionResponse: {
            name,
            response: toolOutput,
          },
        });
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const reply = response.text();
    return res.json({
      reply,
      success: true,
      mode: "gemini_tool_calling",
    });
  } catch (geminiError) {
    console.warn("Gemini tool calling fallback to deterministic lookup:", geminiError.message);
    const fallbackReply = await executeDeterministicSupport(user._id, userQuery);
    return res.json({
      reply: fallbackReply,
      success: true,
      mode: "deterministic_backend_lookup_fallback",
    });
  }
});
