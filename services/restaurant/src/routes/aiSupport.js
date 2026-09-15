import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { aiSupportChat } from "../controllers/aiSupport.js";

const router = express.Router();

// POST /api/support/chat - AI customer support chat
// Requires authentication — user identity is used to scope all DB queries
router.post("/chat", isAuth, aiSupportChat);

export default router;
