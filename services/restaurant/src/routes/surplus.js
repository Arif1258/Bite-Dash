import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  createSurplusItem,
  getSurplusItems,
  deleteSurplusItem,
  getMySurplusItems,
} from "../controllers/surplus.js";

const router = express.Router();

router.post("/new", isAuth, createSurplusItem);
router.get("/active", getSurplusItems);
router.get("/mine", isAuth, getMySurplusItems);
router.delete("/:id", isAuth, deleteSurplusItem);

export default router;
