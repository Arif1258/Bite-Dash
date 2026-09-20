import express from "express";
import { isAuth, optionalAuth } from "../middlewares/isAuth.js";
import {
  getRecommendations,
  trackSearchPreference,
} from "../controllers/recommendation.js";

const router = express.Router();

router.get("/get", optionalAuth, getRecommendations);
router.post("/track", isAuth, trackSearchPreference);

export default router;
