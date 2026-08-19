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
import cors from "cors";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startPaymentConsumer } from "./config/payment.consumer.js";
import { startOrderEventsConsumer } from "./config/orderEvents.consumer.js";

dotenv.config();

await connectRabbitMQ();
startPaymentConsumer();
startOrderEventsConsumer();

const app = express();

app.use(cors());

app.use(express.json());

const PORT = process.env.PORT || 5001;

app.use("/api/restaurant", restaurantRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/surplus", surplusRoutes);
app.use("/api/recommendation", recommendationRoutes);
app.use("/api/batch", batchRoutes);

app.listen(PORT, () => {
  console.log(`Restaurant service is running on port ${PORT}`);
  connectDB();
});

export default app;
