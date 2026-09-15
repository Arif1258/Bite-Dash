import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { getRecommendedBatches, evaluateCustomBatch } from "../controllers/batch.js";

const router = express.Router();

router.get("/recommendations", isAuth, getRecommendedBatches);
router.post("/evaluate", isAuth, evaluateCustomBatch);

export default router;
