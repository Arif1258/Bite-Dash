import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import riderRoutes from "./routes/rider.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startOrderReadyConsumer } from "./config/orderReady.consumer.js";

dotenv.config();

// RabbitMQ is optional — Vercel serverless has no persistent localhost broker.
// The service will still handle HTTP routes when RabbitMQ is unavailable.
try {
  await connectRabbitMQ();
  startOrderReadyConsumer();
} catch (err) {
  console.warn("⚠️ RabbitMQ init skipped:", err.message);
}

const app = express();
app.use(express.json());
app.use(cors());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "rider" }));

app.use("/api/rider", riderRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Rider service is running on port ${process.env.PORT}`);
  connectDB();
});

export default app;

