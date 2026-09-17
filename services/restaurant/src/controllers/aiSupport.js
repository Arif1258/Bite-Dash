/**
 * AI Customer Support Controller
 * Uses Google Gemini with function calling to provide accurate,
 * real-data-backed responses to customer queries about their orders.
 *
 * Security guarantee: all DB lookups are scoped to req.user._id.
 * The AI cannot fabricate order data or access another user's orders.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import TryCatch from "../middlewares/trycatch.js";
import { calculateOrderETA } from "./order.js";

// ─── Tool Definitions (Gemini Function Declarations) ───────────────────────

const tools = [
  {
    functionDeclarations: [
      {
        name: "getMyOrders",
        description:
          "Get the list of recent orders placed by the authenticated customer. Returns order IDs, statuses, restaurant names, and total amounts. Use this when the customer asks about 'my orders', 'my recent orders', or asks generally about order status without a specific order ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: {
              type: "NUMBER",
              description: "Maximum number of orders to return (default 5)",
            },
          },
          required: [],
        },
      },
      {
        name: "getOrderDetails",
        description:
          "Get complete details of a specific order including items, delivery address, rider info, payment, and timeline. Use this when the customer mentions a specific order ID or asks detailed questions about a single order.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: {
              type: "STRING",
              description: "The MongoDB order ID (24-char hex) or last 6 chars shortcode",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getOrderStatus",
        description:
          "Get the current status and a human-readable description of what is happening with a specific order. Use this when the customer asks 'where is my order', 'what is the status', 'is my food on the way', etc.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: {
              type: "STRING",
              description: "The order ID to check status for",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getDeliveryETA",
        description:
          "Get the estimated time of arrival (ETA) in minutes for an active order. Returns calculated ETA based on restaurant prep time, distance, and current order status. Use this when the customer asks 'when will my food arrive', 'how long', 'ETA', etc.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: {
              type: "STRING",
              description: "The order ID to get ETA for",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "getLatestActiveOrder",
        description:
          "Get the most recent active (non-delivered, non-cancelled) order of the customer. Use this when the customer says 'my order' without specifying an ID — this fetches their current/latest pending order automatically.",
        parameters: {
          type: "OBJECT",
          properties: {},
          required: [],
        },
      },
    ],
  },
];

// ─── Tool Executors ────────────────────────────────────────────────────────
// All are SCOPED to userId — a customer cannot get another user's data

async function executeGetMyOrders(userId, args) {
  const limit = Math.min(args.limit || 5, 10);
  const orders = await Order.find({
    userId: userId.toString(),
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (orders.length === 0) {
    return { found: false, message: "No orders found for this customer." };
  }

  return {
    found: true,
    count: orders.length,
    orders: orders.map((o) => ({
      orderId: o._id.toString(),
      shortId: o._id.toString().slice(-6).toUpperCase(),
      restaurant: o.restaurantName,
      status: o.status,
      totalAmount: o.totalAmount,
      paymentStatus: o.paymentStatus,
      createdAt: new Date(o.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    })),
  };
}

async function resolveOrderForUser(userId, orderId) {
  // Try exact match first (full ID)
  let order = null;

  if (orderId && orderId.length === 24) {
    order = await Order.findOne({
      _id: orderId,
      userId: userId.toString(),
    }).lean();
  }

  // Try shortcode match (last 6 chars)
  if (!order && orderId && orderId.length === 6) {
    const allOrders = await Order.find({ userId: userId.toString() })
      .sort({ createdAt: -1 })
      .lean();
    order = allOrders.find(
      (o) => o._id.toString().slice(-6).toUpperCase() === orderId.toUpperCase()
    );
  }

  return order;
}

async function executeGetOrderDetails(userId, args) {
  const order = await resolveOrderForUser(userId, args.orderId);

  if (!order) {
    return {
      found: false,
      message: `No order found with ID ${args.orderId} for your account.`,
    };
  }

  return {
    found: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quauntity,
      price: i.price,
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    deliveryAddress: order.deliveryAddress?.fromattedAddress,
    rider: order.riderName
      ? { name: order.riderName, phone: order.riderPhone }
      : null,
    createdAt: new Date(order.createdAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }),
    timeline: (order.timeline || []).map((t) => ({
      status: t.status,
      time: new Date(t.timestamp).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      note: t.note,
    })),
  };
}

async function executeGetOrderStatus(userId, args) {
  const order = await resolveOrderForUser(userId, args.orderId);

  if (!order) {
    return {
      found: false,
      message: `No order found with ID ${args.orderId} for your account.`,
    };
  }

  const statusDescriptions = {
    placed: "Your order has been placed and is awaiting payment confirmation.",
    accepted: `${order.restaurantName} has accepted your order and will start preparing soon.`,
    preparing: `${order.restaurantName} is currently preparing your food.`,
    ready_for_rider: `Your food is ready and packed! We are assigning a delivery rider.`,
    rider_assigned: `A rider (${order.riderName || "assigned"}) has been assigned and is heading to the restaurant.`,
    picked_up: `Your food has been picked up and is on the way to you!`,
    delivered: "Your order has been delivered. Enjoy your meal!",
    cancelled: "This order has been cancelled.",
  };

  return {
    found: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    currentStatus: order.status,
    statusDescription:
      statusDescriptions[order.status] || `Order status: ${order.status}`,
    rider: order.riderName
      ? { name: order.riderName, phone: order.riderPhone }
      : null,
    lastUpdate:
      order.timeline?.length > 0
        ? new Date(
            order.timeline[order.timeline.length - 1].timestamp
          ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : null,
  };
}

async function executeGetDeliveryETA(userId, args) {
  const order = await resolveOrderForUser(userId, args.orderId);

  if (!order) {
    return {
      found: false,
      message: `No order found with ID ${args.orderId} for your account.`,
    };
  }

  if (order.status === "delivered") {
    return {
      found: true,
      status: "delivered",
      message: "This order has already been delivered.",
      eta: 0,
    };
  }

  if (order.status === "cancelled") {
    return {
      found: true,
      status: "cancelled",
      message: "This order has been cancelled.",
      eta: 0,
    };
  }

  const etaMinutes = await calculateOrderETA(order);

  // Subtract elapsed time for more realistic ETA
  const elapsedMinutes = Math.round(
    (Date.now() - new Date(order.createdAt).getTime()) / 60000
  );
  const remainingETA = Math.max(1, etaMinutes - elapsedMinutes);

  return {
    found: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    status: order.status,
    etaMinutes: remainingETA,
    message: `Estimated ${remainingETA} minutes remaining for delivery.`,
    riderAssigned: !!order.riderId,
  };
}

async function executeGetLatestActiveOrder(userId) {
  const order = await Order.findOne({
    userId: userId.toString(),
    status: { $nin: ["delivered", "cancelled"] },
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!order) {
    // Try to find the most recent order (including delivered)
    const lastOrder = await Order.findOne({
      userId: userId.toString(),
      $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastOrder) {
      return { found: false, message: "No orders found for your account." };
    }

    return {
      found: true,
      isActive: false,
      orderId: lastOrder._id.toString(),
      shortId: lastOrder._id.toString().slice(-6).toUpperCase(),
      restaurant: lastOrder.restaurantName,
      status: lastOrder.status,
      message: "Your most recent order is already delivered.",
    };
  }

  const etaMinutes = await calculateOrderETA(order);
  const elapsedMinutes = Math.round(
    (Date.now() - new Date(order.createdAt).getTime()) / 60000
  );
  const remainingETA = Math.max(1, etaMinutes - elapsedMinutes);

  return {
    found: true,
    isActive: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    status: order.status,
    etaMinutes: remainingETA,
    rider: order.riderName
      ? { name: order.riderName, phone: order.riderPhone }
      : null,
    deliveryAddress: order.deliveryAddress?.fromattedAddress,
    createdAt: new Date(order.createdAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }),
  };
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
    case "getLatestActiveOrder":
      return await executeGetLatestActiveOrder(userId);
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

// ─── Deterministic Rule-Based Fallback for Order Queries ────────────────────
// When GEMINI_API_KEY is not configured or throws an API error, this guarantees
// accurate, real-database-backed answers without failing or hallucinating.
async function executeDeterministicSupport(userId, message) {
  const query = message.toLowerCase();

  // Extract possible 24-char hex or 6-char hex order ID
  const hex24Match = message.match(/[0-9a-fA-F]{24}/);
  const hex6Match = message.match(/\b([0-9a-fA-F]{6})\b/);
  const detectedOrderId = hex24Match ? hex24Match[0] : (hex6Match ? hex6Match[1] : null);

  // 1. Check for "my orders" or "all orders" or "history"
  if (query.includes("all order") || query.includes("my orders") || query.includes("history") || query.includes("past order") || query.includes("list")) {
    const res = await executeGetMyOrders(userId, { limit: 5 });
    if (!res.found) return "You don't have any past orders yet. Browse our restaurants to place your first delicious order!";
    const lines = res.orders.map(
      (o, i) => `${i + 1}. **Order #${o.shortId}** from *${o.restaurant}* — Status: \`${o.status}\` (₹${o.totalAmount})`
    );
    return `Here are your recent orders:\n\n${lines.join("\n")}\n\nAsk me about any specific order for more details!`;
  }

  // 2. Check for ETA / Arrival questions
  if (query.includes("eta") || query.includes("when") || query.includes("arrive") || query.includes("how long") || query.includes("time")) {
    if (detectedOrderId) {
      const etaRes = await executeGetDeliveryETA(userId, { orderId: detectedOrderId });
      if (!etaRes.found) return etaRes.message;
      if (etaRes.status === "delivered") return `Order #${etaRes.shortId} has already been delivered. Enjoy your meal!`;
      if (etaRes.status === "cancelled") return `Order #${etaRes.shortId} was cancelled.`;
      return `Estimated delivery time for Order #${etaRes.shortId} is approximately **${etaRes.etaMinutes} minutes** (${etaRes.riderAssigned ? "Rider is assigned and on the way" : "Assigning nearby rider"}).`;
    }

    const latest = await executeGetLatestActiveOrder(userId);
    if (!latest.found) return "You don't have any active orders right now.";
    if (!latest.isActive) return `Your recent order #${latest.shortId} from ${latest.restaurant} is already delivered!`;
    return `Your order #${latest.shortId} from **${latest.restaurant}** is currently \`${latest.status}\`.\nEstimated time of arrival is **${latest.etaMinutes} minutes**.`;
  }

  // 3. Check for Items / Content questions ("what did I order", "details")
  if (query.includes("what did i") || query.includes("items") || query.includes("detail") || query.includes("item") || query.includes("price") || query.includes("total")) {
    let orderDetails;
    if (detectedOrderId) {
      orderDetails = await executeGetOrderDetails(userId, { orderId: detectedOrderId });
    } else {
      const latest = await executeGetLatestActiveOrder(userId);
      if (latest.found) {
        orderDetails = await executeGetOrderDetails(userId, { orderId: latest.orderId });
      }
    }

    if (!orderDetails || !orderDetails.found) {
      return "I couldn't find any details for that order under your account.";
    }

    const itemsList = orderDetails.items.map(i => `• ${i.name} × ${i.quantity} (₹${i.price * i.quantity})`).join("\n");
    return `**Order #${orderDetails.shortId}** from **${orderDetails.restaurant}**:\n\n${itemsList}\n\n**Subtotal:** ₹${orderDetails.subtotal}\n**Delivery Fee:** ₹${orderDetails.deliveryFee}\n**Total Amount:** ₹${orderDetails.totalAmount}\n**Status:** \`${orderDetails.status}\``;
  }

  // 4. Check for general status ("where is my order", "track", "status")
  if (detectedOrderId) {
    const statusRes = await executeGetOrderStatus(userId, { orderId: detectedOrderId });
    if (!statusRes.found) return statusRes.message;
    return `**Order #${statusRes.shortId}** (${statusRes.restaurant}):\n${statusRes.statusDescription}\n${statusRes.rider ? `\n🛵 **Rider:** ${statusRes.rider.name}` : ""}`;
  }

  const latest = await executeGetLatestActiveOrder(userId);
  if (!latest.found) {
    return "You do not have any active orders at the moment. You can view your past orders by asking 'Show my orders'!";
  }

  if (!latest.isActive) {
    return `Your most recent order #${latest.shortId} from **${latest.restaurant}** was delivered. If you need assistance with a past order, let me know!`;
  }

  return `Your active order #${latest.shortId} from **${latest.restaurant}** is currently **${latest.status.toUpperCase()}**.\n• Estimated ETA: **${latest.etaMinutes} mins**\n• Delivering to: ${latest.deliveryAddress || "Your saved address"}${latest.rider ? `\n• Rider: ${latest.rider.name}` : ""}`;
}

// ─── Main Chat Handler ─────────────────────────────────────────────────────

export const aiSupportChat = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ message: "Message is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Graceful, real data-backed fallback
    const reply = await executeDeterministicSupport(user._id, message.trim());
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
      systemInstruction: `You are a friendly and helpful customer support agent for BiteS, a food delivery app. 
Your job is to help customers with their order inquiries accurately and politely.

CRITICAL RULES:
1. NEVER make up order information. Always use the provided tools to fetch real data.
2. When a customer asks about "my order" without an ID, ALWAYS call getLatestActiveOrder first.
3. When a customer mentions an order ID (or last 6 chars like "ORD123"), use that ID with getOrderDetails or getOrderStatus.
4. Always be accurate with ETAs — they are calculated from real restaurant and delivery data.
5. If an order is delivered, say so clearly.
6. If no orders are found, say so clearly and suggest they check their order history.
7. Keep responses concise, friendly, and actionable.
8. Use Indian currency format (₹) when mentioning amounts.`,
    });

    // Build conversation history for context
    const formattedHistory = (history || [])
      .filter((h) => h.role && h.text)
      .slice(-10) // Keep last 10 turns for context
      .map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    // Send user message
    let result = await chat.sendMessage(message.trim());

    // Handle function calling loop (Gemini may call multiple tools)
    let response = result.response;
    let maxIterations = 5;
    let iterations = 0;

    while (
      response.candidates?.[0]?.content?.parts?.some(
        (p) => p.functionCall
      ) &&
      iterations < maxIterations
    ) {
      iterations++;
      const parts = response.candidates[0].content.parts;
      const functionCallParts = parts.filter((p) => p.functionCall);
      const functionResults = [];

      for (const part of functionCallParts) {
        const { name, args } = part.functionCall;
        const toolResult = await dispatchToolCall(name, args || {}, user._id);

        functionResults.push({
          functionResponse: {
            name,
            response: toolResult,
          },
        });
      }

      // Send function results back to Gemini
      result = await chat.sendMessage(functionResults);
      response = result.response;
    }

    const aiText = response.text();

    return res.json({
      reply: aiText,
      success: true,
    });
  } catch (aiErr) {
    console.warn("Gemini API error, falling back to deterministic backend lookup:", aiErr.message);
    const fallbackReply = await executeDeterministicSupport(user._id, message.trim());
    return res.json({
      reply: fallbackReply,
      success: true,
      mode: "deterministic_backend_lookup_fallback",
    });
  }
});
