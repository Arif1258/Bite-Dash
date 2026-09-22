import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import restaurantRoutes from "./routes/restaraunt.js";
import itemRoutes from "./routes/menuitem.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/address.js";
import orderRoutes from "./routes/order.js";
import surplusRoutes from "./routes/surplus.js";
import recommendationRoutes from "./routes/recommendation.js";
import batchRoutes from "./routes/batch.js";
import aiSupportRoutes from "./routes/aiSupport.js";
import demandRoutes from "./routes/demandSuggestion.js";
import cors from "cors";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startPaymentConsumer } from "./config/payment.consumer.js";
import { startOrderEventsConsumer } from "./config/orderEvents.consumer.js";

dotenv.config();

// RabbitMQ is optional — Vercel serverless has no persistent localhost broker.
// The service will still handle HTTP routes when RabbitMQ is unavailable.
try {
  await connectRabbitMQ();
  startPaymentConsumer();
  startOrderEventsConsumer();
} catch (err) {
  console.warn("⚠️ RabbitMQ init skipped:", err.message);
}

const app = express();

app.use(cors());

app.use(express.json());

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(503).json({ message: "Restaurant service is temporarily unavailable" });
  }
});

const PORT = process.env.PORT || 5001;

app.get("/health", (_req, res) => res.json({ status: "ok", service: "restaurant" }));

app.use("/api/restaurant", restaurantRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/surplus", surplusRoutes);
app.use("/api/recommendation", recommendationRoutes);
app.use("/api/batch", batchRoutes);
app.use("/api/support", aiSupportRoutes);
app.use("/api/agent", aiSupportRoutes);
app.use("/api/demand", demandRoutes);

app.listen(PORT, () => {
  console.log(`Restaurant service is running on port ${PORT}`);
  connectDB();
});

export default app;
