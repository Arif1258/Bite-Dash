import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  clearCart,
  addToCart,
  decrementCartItem,
  fetchMyCart,
  incrementCartItem,
  removeCartItem,
} from "../controllers/cart.js";

const router = express.Router();

router.post("/add", isAuth, addToCart);
router.get("/all", isAuth, fetchMyCart);
router.put("/inc", isAuth, incrementCartItem);
router.put("/dec", isAuth, decrementCartItem);
router.post("/remove", isAuth, removeCartItem);
router.delete("/remove", isAuth, removeCartItem);
router.delete("/clear", isAuth, clearCart);

export default router;
