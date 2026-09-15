import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  getDemandSuggestions,
  getDayOverview,
} from "../controllers/demandSuggestion.js";

const router = express.Router();

// GET /api/demand/suggestions - Rule-based AI demand recommendations for seller
router.get("/suggestions", isAuth, getDemandSuggestions);

// GET /api/demand/overview - Full 24-hour demand projection for seller
router.get("/overview", isAuth, getDayOverview);

export default router;
