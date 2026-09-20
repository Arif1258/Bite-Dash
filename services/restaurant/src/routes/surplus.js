import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  createSurplusItem,
  getSurplusItems,
  deleteSurplusItem,
  getMySurplusItems,
  purchaseSurplusItem,
  getNearbySurplusAlerts,
} from "../controllers/surplus.js";

const router = express.Router();

router.post("/new", isAuth, createSurplusItem);
router.post("/order", isAuth, purchaseSurplusItem);
router.get("/active", getSurplusItems);
router.get("/nearby-alerts", getNearbySurplusAlerts);
router.get("/mine", isAuth, getMySurplusItems);
router.delete("/:id", isAuth, deleteSurplusItem);

export default router;
