import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoute from "./routes/auth.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

// `app.listen` is not used by Vercel's serverless runtime, so its callback is
// never a dependable place to establish the database connection. Ensure every
// request has a ready connection instead, while still keeping local startup
// simple.
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(503).json({ message: "Authentication is temporarily unavailable" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth" }));

app.use("/api/auth", authRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Auth service is running on port ${PORT}`);
  connectDB().catch((error) => console.error("Database connection failed:", error.message));
});

export default app;
