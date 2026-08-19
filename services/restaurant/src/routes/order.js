import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import {
  assignRiderToOrder,
  createOrder,
  fetchOrderForPayment,
  fetchRestaurantOrders,
  fetchSingleOrder,
  getCurrentOrderForRider,
  getMyOrders,
  updateOrderStatus,
  updateOrderStatusRider,
} from "../controllers/order.js";

const router = express.Router();

router.get("/myorder", isAuth, getMyOrders);
router.get("/:id", isAuth, fetchSingleOrder);
router.post(
  "/new",
  isAuth,
  rateLimiter({ limit: 10, windowSeconds: 60, type: "create-order" }),
  createOrder
);
router.get(
  "/payment/:id",
  rateLimiter({ limit: 5, windowSeconds: 60, type: "payment" }),
  fetchOrderForPayment
);
router.get(
  "/restaurant/:restaurantId",
  isAuth,
  isSeller,
  fetchRestaurantOrders,
);
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);
router.put("/assign/rider", assignRiderToOrder);
router.get("/current/rider", getCurrentOrderForRider);
router.put("/update/status/rider", updateOrderStatusRider);

export default router;
