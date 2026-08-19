import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import {
  getPendingRestaurant,
  getPendingRiders,
  verifyRestaurant,
  verifyRider,
  getHeatmapData,
  getSuspiciousOrders,
  getIncidentSupportTimeline,
  getObservabilityMetrics,
} from "../controllers/admin.js";

const router = express.Router();

router.get("/admin/restaurant/pending", isAuth, isAdmin, getPendingRestaurant);
router.get("/admin/rider/pending", isAuth, isAdmin, getPendingRiders);
router.patch("/verify/rider/:id", isAuth, isAdmin, verifyRider);
router.patch("/verify/restaurant/:id", isAuth, isAdmin, verifyRestaurant);

router.get("/admin/heatmap", isAuth, isAdmin, getHeatmapData);
router.get("/admin/anomalies", isAuth, isAdmin, getSuspiciousOrders);
router.get("/admin/incident/:id", isAuth, isAdmin, getIncidentSupportTimeline);
router.get("/admin/observability", isAuth, isAdmin, getObservabilityMetrics);

export default router;
