/**
 * BiteDash AI Agent Controller
 *
 * Exposes the authenticated Agentic GenAI food assistant endpoint.
 * Powered by OpenAI Tool Calling with live backend database tools
 * and deterministic zero-downtime execution fallbacks.
 */

import TryCatch from "../middlewares/trycatch.js";
import { runAgentChat } from "../agent/agentService.js";

export const aiSupportChat = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const { message, history = [] } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ message: "A message string is required." });
  }

  const result = await runAgentChat({
    userId: user._id,
    message: message.trim(),
    history: Array.isArray(history) ? history : [],
  });

  return res.json({
    success: true,
    reply: result.reply,
    message: result.reply, // backwards compatibility
    cards: result.cards || [],
    actions: result.actions || (result.action ? [result.action] : []),
    cartUpdated: !!result.cartUpdated,
    mode: result.mode,
    metadata: result.metadata || null,
  });
});
