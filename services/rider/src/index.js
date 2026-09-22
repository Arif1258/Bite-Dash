import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import riderRoutes from "./routes/rider.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(503).json({ message: "Rider service is temporarily unavailable" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "rider" }));

app.use("/api/rider", riderRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Rider service is running on port ${process.env.PORT}`);
  connectDB();
});

export default app;

