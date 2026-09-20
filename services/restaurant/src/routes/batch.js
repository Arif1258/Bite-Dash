import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  getRecommendedBatches,
  evaluateCustomBatch,
  acceptBatchedRoute,
} from "../controllers/batch.js";

const router = express.Router();

router.get("/recommendations", isAuth, getRecommendedBatches);
router.post("/evaluate", isAuth, evaluateCustomBatch);
router.post("/accept", isAuth, acceptBatchedRoute);

export default router;
