import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import {
  assignRiderToOrder,
  createOrder,
  fetchOrderForPayment,
  fetchRestaurantOrders,
  fetchSingleOrder,
  savePaymentReference,
  confirmRazorpayPayment,
  confirmStripePayment,
  getCurrentOrderForRider,
  getMyOrders,
  updateOrderStatus,
  updateOrderStatusRider,
  fetchAvailableOrdersForRiders,
} from "../controllers/order.js";

const router = express.Router();

// --- Specific routes MUST come before parameterized /:id routes ---

// Customer: get their orders
router.get("/myorder", isAuth, getMyOrders);

// Rider / Admin: get available orders ready for delivery pickup
router.get("/available/rider", isAuth, fetchAvailableOrdersForRiders);

// Internal: get order for payment (called by utils service)
router.get(
  "/payment/:id",
  rateLimiter({ limit: 5, windowSeconds: 60, type: "payment" }),
  fetchOrderForPayment
);

router.put("/payment/reference", savePaymentReference);
router.put("/payment/confirm", confirmRazorpayPayment);
router.put("/payment/confirm-stripe", confirmStripePayment);

// Seller: get orders for their restaurant
router.get(
  "/restaurant/:restaurantId",
  isAuth,
  isSeller,
  fetchRestaurantOrders,
);

// Internal: assign rider to order
router.put("/assign/rider", assignRiderToOrder);

// Internal: get current order assigned to rider
router.get("/current/rider", getCurrentOrderForRider);

// Internal: rider updates delivery status (picked_up / delivered)
router.put("/update/status/rider", updateOrderStatusRider);

// Customer: create new order
router.post(
  "/new",
  isAuth,
  rateLimiter({ limit: 10, windowSeconds: 60, type: "create-order" }),
  createOrder
);

// Seller: update order status (accepted, preparing, ready_for_rider)
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);

// Customer / Rider / Seller / Admin: view a single order
router.get("/:id", isAuth, fetchSingleOrder);

export default router;
