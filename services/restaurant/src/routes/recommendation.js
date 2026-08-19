import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  getRecommendations,
  trackSearchPreference,
} from "../controllers/recommendation.js";

const router = express.Router();

router.get("/get", isAuth, getRecommendations);
router.post("/track", isAuth, trackSearchPreference);

export default router;
