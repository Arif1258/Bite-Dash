import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { getRecommendedBatches } from "../controllers/batch.js";

const router = express.Router();

router.get("/recommendations", isAuth, getRecommendedBatches);

export default router;
