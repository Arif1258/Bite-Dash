/**
 * BiteDash Agent Tool Executors
 *
 * Implements real backend logic for every tool called by the GenAI Agent.
 *
 * SAFETY & SECURITY:
 * 1. User identity is ALWAYS extracted from the authenticated JWT session (userId).
 *    The LLM has zero authority to supply or modify user IDs.
 * 2. All cart, order, address, and coupon operations are strictly scoped to userId.
 * 3. Never touches raw payment secrets or card numbers.
 * 4. Reuses existing BiteDash models, services, and ETA algorithms.
 */

import mongoose from "mongoose";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItems.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js";
import UserPreference from "../models/UserPreference.js";
import { getDetailedETA } from "../services/etaService.js";
import {
  getCouponsForSubtotal,
  validateCoupon,
  getUserAppliedCoupon,
  setUserAppliedCoupon,
  clearUserAppliedCoupon,
} from "./couponService.js";

// Helper: normalize user ID query for MongoDB
const getUserIdQuery = (userId) => {
  if (!userId) return { userId: null };
  const strId = userId.toString();
  const or = [{ userId: strId }];
  if (mongoose.Types.ObjectId.isValid(strId)) {
    or.push({ userId: new mongoose.Types.ObjectId(strId) });
  }
  return { $or: or };
};

// ─── 1. RESTAURANT & DISCOVERY EXECUTORS ────────────────────────────────────

export async function executeSearchRestaurants({ query, cuisine, vegetarianOnly, minRating, limit = 5 }) {
  const filter = { isVerified: true };
  const maxLimit = Math.min(Number(limit) || 5, 10);

  if (query && typeof query === "string" && query.trim()) {
    filter.$or = [
      { name: { $regex: query.trim(), $options: "i" } },
      { description: { $regex: query.trim(), $options: "i" } },
    ];
  }

  if (cuisine && typeof cuisine === "string") {
    const cuisineRegex = { $regex: cuisine.trim(), $options: "i" };
    if (!filter.$or) {
      filter.$or = [{ name: cuisineRegex }, { description: cuisineRegex }];
    }
  }

  if (minRating && !isNaN(minRating)) {
    filter.reliabilityScore = { $gte: Number(minRating) };
  }

  const restaurants = await Restaurant.find(filter)
    .sort({ isOpen: -1, reliabilityScore: -1, createdAt: -1 })
    .limit(maxLimit)
    .lean();

  const formatted = restaurants.map((r) => ({
    restaurantId: r._id.toString(),
    name: r.name,
    description: r.description || "Fresh local kitchen & delicacies",
    rating: r.reliabilityScore ? (r.reliabilityScore / 20).toFixed(1) : "4.5",
    reliabilityScore: r.reliabilityScore || 90,
    isOpen: r.isOpen,
    prepTime: `${r.averagePrepTime || 20} mins`,
    address: r.autoLocation?.formattedAddress || "Delivery available in your area",
    image: r.image,
  }));

  return {
    found: formatted.length > 0,
    count: formatted.length,
    restaurants: formatted,
    cards: formatted.map((r) => ({ type: "restaurant", data: r })),
  };
}

export async function executeSearchMenuItems({ query, maxPrice, vegetarianOnly, restaurantId, limit = 6 }) {
  const maxLimit = Math.min(Number(limit) || 6, 12);
  const filter = { isAvailable: { $ne: false } };

  if (query && typeof query === "string" && query.trim()) {
    filter.$or = [
      { name: { $regex: query.trim(), $options: "i" } },
      { description: { $regex: query.trim(), $options: "i" } },
    ];
  }

  if (maxPrice && !isNaN(maxPrice)) {
    filter.price = { $lte: Number(maxPrice) };
  }

  if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
    filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
  }

  const items = await MenuItem.find(filter)
    .populate("restaurantId", "name isOpen averagePrepTime reliabilityScore autoLocation")
    .sort({ price: 1 })
    .limit(maxLimit)
    .lean();

  const formatted = items.map((i) => {
    const rest = i.restaurantId || {};
    return {
      itemId: i._id.toString(),
      name: i.name,
      description: i.description || "",
      price: i.price,
      restaurantId: rest._id ? rest._id.toString() : "",
      restaurantName: rest.name || "BiteDash Kitchen",
      isAvailable: i.isAvailable !== false,
      isOpen: rest.isOpen !== false,
      image: i.image,
    };
  });

  return {
    found: formatted.length > 0,
    count: formatted.length,
    items: formatted,
    cards: formatted.map((item) => ({ type: "food", data: item })),
  };
}

export async function executeGetRestaurantDetails({ restaurantId, restaurantName }) {
  let restaurant = null;

  if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
    restaurant = await Restaurant.findById(restaurantId).lean();
  } else if (restaurantName) {
    restaurant = await Restaurant.findOne({
      name: { $regex: restaurantName.trim(), $options: "i" },
    }).lean();
  }

  if (!restaurant) {
    return { found: false, message: "Restaurant not found." };
  }

  const topItems = await MenuItem.find({
    restaurantId: restaurant._id,
    isAvailable: true,
  })
    .limit(5)
    .lean();

  const details = {
    restaurantId: restaurant._id.toString(),
    name: restaurant.name,
    description: restaurant.description,
    phone: restaurant.phone,
    isOpen: restaurant.isOpen,
    rating: restaurant.reliabilityScore ? (restaurant.reliabilityScore / 20).toFixed(1) : "4.5",
    reliabilityScore: restaurant.reliabilityScore || 90,
    averagePrepTime: `${restaurant.averagePrepTime || 20} mins`,
    address: restaurant.autoLocation?.formattedAddress || "Registered location",
    image: restaurant.image,
    popularItems: topItems.map((i) => ({
      itemId: i._id.toString(),
      name: i.name,
      price: i.price,
      description: i.description,
      image: i.image,
    })),
  };

  return {
    found: true,
    restaurant: details,
    cards: [{ type: "restaurant", data: details }],
  };
}

export async function executeGetMenu({ restaurantId }) {
  if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
    return { found: false, message: "Valid restaurant ID is required." };
  }

  const [restaurant, items] = await Promise.all([
    Restaurant.findById(restaurantId).lean(),
    MenuItem.find({ restaurantId }).sort({ price: 1 }).lean(),
  ]);

  if (!restaurant) {
    return { found: false, message: "Restaurant not found." };
  }

  const formattedItems = items.map((i) => ({
    itemId: i._id.toString(),
    name: i.name,
    description: i.description || "",
    price: i.price,
    isAvailable: i.isAvailable !== false,
    image: i.image,
    restaurantId: restaurant._id.toString(),
    restaurantName: restaurant.name,
  }));

  return {
    found: true,
    restaurant: {
      id: restaurant._id.toString(),
      name: restaurant.name,
      isOpen: restaurant.isOpen,
    },
    count: formattedItems.length,
    menu: formattedItems,
    cards: formattedItems.slice(0, 6).map((item) => ({ type: "food", data: item })),
  };
}

export async function executeGetFoodItemDetails({ itemId, itemName }) {
  let item = null;

  if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
    item = await MenuItem.findById(itemId).populate("restaurantId").lean();
  } else if (itemName) {
    item = await MenuItem.findOne({
      name: { $regex: itemName.trim(), $options: "i" },
      isAvailable: true,
    })
      .populate("restaurantId")
      .lean();
  }

  if (!item) {
    return { found: false, message: "Item not found." };
  }

  const rest = item.restaurantId || {};
  const data = {
    itemId: item._id.toString(),
    name: item.name,
    description: item.description,
    price: item.price,
    isAvailable: item.isAvailable !== false,
    image: item.image,
    restaurantId: rest._id ? rest._id.toString() : "",
    restaurantName: rest.name || "BiteDash Kitchen",
    restaurantOpen: rest.isOpen !== false,
  };

  return {
    found: true,
    item: data,
    cards: [{ type: "food", data }],
  };
}

// ─── 2. CART MANAGEMENT EXECUTORS ──────────────────────────────────────────

export async function executeGetCart(userId) {
  const userQuery = getUserIdQuery(userId);
  const cartItems = await Cart.find(userQuery)
    .populate("itemId")
    .populate("restaurantId")
    .lean();

  if (!cartItems || cartItems.length === 0) {
    return {
      isEmpty: true,
      items: [],
      cartLength: 0,
      subtotal: 0,
      deliveryFee: 0,
      platformFee: 0,
      discount: 0,
      totalAmount: 0,
      message: "Your cart is currently empty. Explore menus to add delicious dishes!",
      cards: [{
        type: "cart",
        data: {
          items: [],
          subtotal: 0,
          deliveryFee: 0,
          platformFee: 0,
          discount: 0,
          totalAmount: 0,
          restaurantName: null,
          isEmpty: true,
        },
      }],
    };
  }

  let subtotal = 0;
  let cartLength = 0;
  let restaurantName = "Partner Restaurant";
  let restaurantId = null;
  const validItems = [];

  for (const c of cartItems) {
    const item = c.itemId;
    if (!item || typeof item.price !== "number") continue;

    const qty = c.quauntity || 1;
    const itemTotal = item.price * qty;
    subtotal += itemTotal;
    cartLength += qty;

    if (c.restaurantId) {
      restaurantName = c.restaurantId.name || restaurantName;
      restaurantId = c.restaurantId._id ? c.restaurantId._id.toString() : c.restaurantId.toString();
    }

    validItems.push({
      cartId: c._id.toString(),
      itemId: item._id.toString(),
      name: item.name,
      price: item.price,
      quantity: qty,
      itemTotal,
      image: item.image,
    });
  }

  // Delivery and platform fee rules
  const deliveryFee = subtotal < 250 ? 49 : 0;
  const platformFee = 7;

  // Check if coupon is applied
  const appliedCoupon = await getUserAppliedCoupon(userId);
  let discount = 0;
  let couponInfo = null;

  if (appliedCoupon) {
    const valResult = validateCoupon(appliedCoupon.code, subtotal);
    if (valResult.valid) {
      discount = valResult.discount;
      couponInfo = {
        code: appliedCoupon.code,
        discount,
        description: valResult.coupon?.description,
      };
    } else {
      // Coupon no longer meets minimum order
      await clearUserAppliedCoupon(userId);
    }
  }

  const totalAmount = Math.max(0, subtotal - discount + deliveryFee + platformFee);

  const cartData = {
    isEmpty: false,
    restaurantId,
    restaurantName,
    cartLength,
    subtotal,
    deliveryFee,
    platformFee,
    discount,
    appliedCoupon: couponInfo,
    totalAmount,
    items: validItems,
  };

  return {
    ...cartData,
    cards: [{ type: "cart", data: cartData }],
  };
}

export async function executeAddToCart(userId, { itemId, quantity = 1, restaurantId }) {
  if (!itemId) {
    return { success: false, message: "Item ID is required." };
  }

  const qty = Math.max(1, Number(quantity) || 1);
  const menuItem = await MenuItem.findById(itemId).populate("restaurantId");

  if (!menuItem) {
    return { success: false, message: "Menu item not found in catalog." };
  }

  if (menuItem.isAvailable === false) {
    return {
      success: false,
      message: `"${menuItem.name}" is currently unavailable or out of stock.`,
    };
  }

  const targetRestaurantId = menuItem.restaurantId?._id || menuItem.restaurantId || restaurantId;

  if (!targetRestaurantId) {
    return { success: false, message: "Unable to identify item restaurant." };
  }

  // Multi-vendor check: verify existing cart restaurant
  const userQuery = getUserIdQuery(userId);
  const existingCartOther = await Cart.findOne({
    $and: [userQuery, { restaurantId: { $ne: targetRestaurantId } }],
  });

  if (existingCartOther) {
    return {
      success: false,
      isConflict: true,
      message:
        "You already have items in your cart from another restaurant. BiteDash delivers from one restaurant per order. Would you like me to clear your existing cart first?",
    };
  }

  // Find existing cart entry
  let cartItem = await Cart.findOne({
    $and: [userQuery, { itemId: menuItem._id }],
  });

  if (cartItem) {
    cartItem.quauntity = (cartItem.quauntity || 1) + qty;
    await cartItem.save();
  } else {
    cartItem = await Cart.create({
      userId: userId.toString(),
      restaurantId: targetRestaurantId,
      itemId: menuItem._id,
      quauntity: qty,
    });
  }

  // Return updated cart
  const updatedCart = await executeGetCart(userId);

  return {
    success: true,
    message: `Added ${qty} × "${menuItem.name}" to your cart.`,
    addedItem: {
      name: menuItem.name,
      quantity: qty,
      price: menuItem.price,
    },
    cart: updatedCart,
    cards: updatedCart.cards,
  };
}

export async function executeRemoveFromCart(userId, { itemId, cartId }) {
  const userQuery = getUserIdQuery(userId);
  let filter;

  if (cartId && mongoose.Types.ObjectId.isValid(cartId)) {
    filter = { $and: [userQuery, { _id: cartId }] };
  } else if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
    filter = { $and: [userQuery, { itemId }] };
  } else if (itemId) {
    // If name given instead of ID
    const menuItem = await MenuItem.findOne({
      name: { $regex: itemId.trim(), $options: "i" },
    });
    if (menuItem) {
      filter = { $and: [userQuery, { itemId: menuItem._id }] };
    }
  }

  if (!filter) {
    return { success: false, message: "Item could not be identified for removal." };
  }

  const result = await Cart.deleteOne(filter);

  if (result.deletedCount === 0) {
    return { success: false, message: "Item was not found in your cart." };
  }

  const updatedCart = await executeGetCart(userId);
  return {
    success: true,
    message: "Item removed from your cart.",
    cart: updatedCart,
    cards: updatedCart.cards,
  };
}

export async function executeUpdateCartQuantity(userId, { itemId, quantity }) {
  const newQty = Number(quantity);
  if (isNaN(newQty) || newQty < 0) {
    return { success: false, message: "Valid quantity number is required." };
  }

  if (newQty === 0) {
    return await executeRemoveFromCart(userId, { itemId });
  }

  const userQuery = getUserIdQuery(userId);
  let filter;

  if (mongoose.Types.ObjectId.isValid(itemId)) {
    filter = { $and: [userQuery, { itemId }] };
  } else {
    const item = await MenuItem.findOne({
      name: { $regex: itemId.trim(), $options: "i" },
    });
    if (item) {
      filter = { $and: [userQuery, { itemId: item._id }] };
    }
  }

  if (!filter) {
    return { success: false, message: "Item could not be found." };
  }

  const cartItem = await Cart.findOne(filter);
  if (!cartItem) {
    return { success: false, message: "Item is not in your cart." };
  }

  cartItem.quauntity = newQty;
  await cartItem.save();

  const updatedCart = await executeGetCart(userId);
  return {
    success: true,
    message: `Updated item quantity to ${newQty}.`,
    cart: updatedCart,
    cards: updatedCart.cards,
  };
}

export async function executeClearCart(userId) {
  const userQuery = getUserIdQuery(userId);
  await Cart.deleteMany(userQuery);
  await clearUserAppliedCoupon(userId);

  return {
    success: true,
    message: "Your cart has been cleared.",
    cards: [{
      type: "cart",
      data: {
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        totalAmount: 0,
        isEmpty: true,
      },
    }],
  };
}

// ─── 3. COUPON & TOTAL EXECUTORS ───────────────────────────────────────────

export async function executeGetAvailableCoupons(userId) {
  const cart = await executeGetCart(userId);
  const subtotal = cart.subtotal || 0;
  const coupons = getCouponsForSubtotal(subtotal);

  return {
    found: true,
    currentCartSubtotal: subtotal,
    coupons,
    cards: coupons.map((c) => ({ type: "coupon", data: c })),
  };
}

export async function executeApplyCoupon(userId, { couponCode }) {
  if (!couponCode) {
    return { success: false, message: "Coupon code is required." };
  }

  const cart = await executeGetCart(userId);
  if (cart.isEmpty) {
    return {
      success: false,
      message: "Your cart is empty. Add food items before applying a discount coupon.",
    };
  }

  const result = validateCoupon(couponCode, cart.subtotal);
  if (!result.valid) {
    return {
      success: false,
      message: result.message,
    };
  }

  // Store valid coupon in user session
  await setUserAppliedCoupon(userId, {
    code: result.coupon.code,
    discount: result.discount,
  });

  const updatedCart = await executeGetCart(userId);

  return {
    success: true,
    message: `🎉 Coupon '${result.coupon.code}' applied! You saved ₹${result.discount}. New total: ₹${updatedCart.totalAmount}.`,
    discount: result.discount,
    appliedCoupon: result.coupon.code,
    cart: updatedCart,
    cards: updatedCart.cards,
  };
}

export async function executeCalculateCartTotal(userId) {
  const cart = await executeGetCart(userId);
  return {
    success: true,
    ...cart,
  };
}

// ─── 4. ORDER HISTORY, TRACKING & ETA EXECUTORS ─────────────────────────────

export async function executeGetOrderHistory(userId, { limit = 5 } = {}) {
  const maxLimit = Math.min(Number(limit) || 5, 10);
  const orders = await Order.find({
    userId: userId.toString(),
    $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
  })
    .sort({ createdAt: -1 })
    .limit(maxLimit)
    .lean();

  if (!orders || orders.length === 0) {
    return {
      found: false,
      message: "You have not placed any orders yet. Discover top restaurants to order your first meal!",
    };
  }

  const summaries = await Promise.all(
    orders.map(async (o) => {
      const eta = await getDetailedETA(o);
      return {
        orderId: o._id.toString(),
        shortId: o._id.toString().slice(-6).toUpperCase(),
        restaurant: o.restaurantName,
        status: o.status,
        totalAmount: o.totalAmount,
        itemCount: (o.items || []).reduce((acc, i) => acc + (i.quauntity || 1), 0),
        itemsSummary: (o.items || []).map((i) => `${i.name} × ${i.quauntity || 1}`).join(", "),
        placedAt: new Date(o.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        estimatedDeliveryTime: o.status === "delivered" ? "Delivered" : `${eta.totalETA} mins`,
      };
    })
  );

  return {
    found: true,
    count: summaries.length,
    orders: summaries,
    cards: summaries.map((o) => ({ type: "order", data: o })),
  };
}

async function resolveUserOrder(userId, orderId) {
  if (!orderId) {
    // Return latest order
    return await Order.findOne({
      userId: userId.toString(),
      $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  const cleanId = orderId.trim();

  // 1. Exact 24-character ObjectId
  if (cleanId.length === 24 && mongoose.Types.ObjectId.isValid(cleanId)) {
    const order = await Order.findOne({
      _id: cleanId,
      userId: userId.toString(),
    }).lean();
    if (order) return order;
  }

  // 2. Shortcode match (last 6 hex characters)
  const orders = await Order.find({ userId: userId.toString() })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return (
    orders.find(
      (o) => o._id.toString().slice(-6).toUpperCase() === cleanId.toUpperCase()
    ) || null
  );
}

export async function executeGetOrderDetails(userId, { orderId }) {
  const order = await resolveUserOrder(userId, orderId);
  if (!order) {
    return {
      found: false,
      message: orderId
        ? `No order matching '${orderId}' was found under your account.`
        : "You have no order history yet.",
    };
  }

  const eta = await getDetailedETA(order);

  const data = {
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    deliveryAddress: order.deliveryAddress?.fromattedAddress || "Saved Delivery Address",
    riderName: order.riderName || null,
    riderStatus: order.riderName ? `Assigned to ${order.riderName}` : "Awaiting rider dispatch",
    estimatedDeliveryTime: order.status === "delivered" ? "Delivered" : `${eta.totalETA} mins`,
    expectedArrival: eta.targetDeliveryTime,
    items: (order.items || []).map((i) => ({
      name: i.name,
      quantity: i.quauntity || 1,
      price: i.price,
      total: (i.price || 0) * (i.quauntity || 1),
    })),
    createdAt: new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  };

  return {
    found: true,
    order: data,
    cards: [{ type: "order", data }],
  };
}

export async function executeGetOrderStatus(userId, { orderId }) {
  return await executeGetOrderDetails(userId, { orderId });
}

export async function executeGetOrderETA(userId, { orderId }) {
  const order = await resolveUserOrder(userId, orderId);
  if (!order) {
    return {
      found: false,
      message: "No active or recent order found to compute ETA.",
    };
  }

  if (order.status === "delivered") {
    return {
      found: true,
      orderId: order._id.toString(),
      shortId: order._id.toString().slice(-6).toUpperCase(),
      status: "delivered",
      message: "This order has already been successfully delivered! 🎉",
      estimatedDeliveryTime: "Delivered",
    };
  }

  const eta = await getDetailedETA(order);

  return {
    found: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantName,
    status: order.status,
    totalETA: `${eta.totalETA} mins`,
    expectedArrival: eta.targetDeliveryTime,
    trafficCondition: eta.trafficLevel,
    breakdown: {
      foodPreparationTime: `${eta.breakdown.foodPreparationTime} mins`,
      kitchenQueueTime: `${eta.breakdown.kitchenQueueTime} mins`,
      riderTravelTime: `${eta.breakdown.riderTravelTime} mins`,
      additionalDelay: `${eta.breakdown.additionalDelay} mins`,
    },
    cards: [{
      type: "order",
      data: {
        orderId: order._id.toString(),
        shortId: order._id.toString().slice(-6).toUpperCase(),
        restaurant: order.restaurantName,
        status: order.status,
        estimatedDeliveryTime: `${eta.totalETA} mins`,
        expectedArrival: eta.targetDeliveryTime,
        totalAmount: order.totalAmount,
      },
    }],
  };
}

// ─── 5. REORDER & CHECKOUT SAFETY EXECUTORS ────────────────────────────────

export async function executeReorderPreviousOrder(userId, { orderId }) {
  const order = await resolveUserOrder(userId, orderId);
  if (!order) {
    return {
      success: false,
      message: "Could not find a previous order to repeat.",
    };
  }

  if (!order.items || order.items.length === 0) {
    return {
      success: false,
      message: "The previous order has no items to reorder.",
    };
  }

  // Clear existing cart to prevent restaurant collision
  const userQuery = getUserIdQuery(userId);
  await Cart.deleteMany(userQuery);

  const addedItems = [];
  const unavailableItems = [];

  for (const prevItem of order.items) {
    let menuItem = null;

    if (prevItem.itemId && mongoose.Types.ObjectId.isValid(prevItem.itemId)) {
      menuItem = await MenuItem.findById(prevItem.itemId);
    }

    if (!menuItem) {
      menuItem = await MenuItem.findOne({
        name: prevItem.name,
        restaurantId: order.restaurantId,
      });
    }

    if (menuItem && menuItem.isAvailable !== false) {
      const qty = prevItem.quauntity || 1;
      await Cart.create({
        userId: userId.toString(),
        restaurantId: order.restaurantId,
        itemId: menuItem._id,
        quauntity: qty,
      });

      addedItems.push({
        name: menuItem.name,
        quantity: qty,
        price: menuItem.price,
      });
    } else {
      unavailableItems.push(prevItem.name);
    }
  }

  const updatedCart = await executeGetCart(userId);

  if (addedItems.length === 0) {
    return {
      success: false,
      message: `None of the items from order #${order._id.toString().slice(-6).toUpperCase()} are currently available at ${order.restaurantName}. Would you like me to find similar dishes for you?`,
    };
  }

  let message = `Reordered ${addedItems.map((i) => `${i.quantity} × ${i.name}`).join(", ")} from ${order.restaurantName}!`;
  if (unavailableItems.length > 0) {
    message += ` Note: ${unavailableItems.join(", ")} was unavailable and could not be added.`;
  }

  return {
    success: true,
    message,
    addedItems,
    unavailableItems,
    cart: updatedCart,
    cards: updatedCart.cards,
  };
}

export async function executeCreateOrder(userId, { paymentMethod = "cod", addressId, confirmed }) {
  // CRITICAL CHECKOUT SAFETY: Require explicit confirmation
  if (!confirmed) {
    const cart = await executeGetCart(userId);
    return {
      success: false,
      requiresConfirmation: true,
      message: "Please explicitly confirm before placing the order.",
      cart,
      cards: cart.cards,
    };
  }

  const userQuery = getUserIdQuery(userId);
  const cartItems = await Cart.find(userQuery)
    .populate("itemId")
    .populate("restaurantId");

  if (!cartItems || cartItems.length === 0) {
    return { success: false, message: "Your cart is empty. Add food items before placing an order." };
  }

  // Multi-vendor check
  const restaurantIds = new Set(
    cartItems.map((c) => c.restaurantId?._id?.toString() || c.restaurantId?.toString()).filter(Boolean)
  );

  if (restaurantIds.size > 1) {
    return {
      success: false,
      message: "Your cart contains items from multiple restaurants. Please order from one restaurant at a time.",
    };
  }

  const firstCartItem = cartItems[0];
  const restaurantId = firstCartItem.restaurantId?._id || firstCartItem.restaurantId;
  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    return { success: false, message: "Restaurant no longer available." };
  }

  if (!restaurant.isOpen) {
    return { success: false, message: `Sorry, ${restaurant.name} is currently closed.` };
  }

  // Resolve delivery address
  let address = null;
  if (addressId && mongoose.Types.ObjectId.isValid(addressId)) {
    address = await Address.findOne({ _id: addressId, userId });
  }

  if (!address) {
    // Pick user's latest saved address
    address = await Address.findOne({ userId }).sort({ createdAt: -1 });
  }

  if (!address) {
    return {
      success: false,
      requiresAddress: true,
      message: "You need a saved delivery address to place your order. Please add your address in your BiteDash account or address tab.",
    };
  }

  // Calculate items, stock verification, and subtotal
  let subtotal = 0;
  const orderItems = [];

  for (const c of cartItems) {
    const item = c.itemId;
    if (!item) {
      return { success: false, message: "An item in your cart is no longer available. Please update your cart." };
    }
    if (item.isAvailable === false) {
      return { success: false, message: `"${item.name}" is currently sold out.` };
    }

    const qty = c.quauntity || 1;
    const itemTotal = item.price * qty;
    subtotal += itemTotal;

    orderItems.push({
      itemId: item._id.toString(),
      name: item.name,
      price: item.price,
      quauntity: qty,
    });
  }

  const deliveryFee = subtotal < 250 ? 49 : 0;
  const platformFee = 7;

  // Apply saved coupon discount if any
  const appliedCoupon = await getUserAppliedCoupon(userId);
  let discount = 0;
  if (appliedCoupon) {
    const val = validateCoupon(appliedCoupon.code, subtotal);
    if (val.valid) {
      discount = val.discount;
    }
  }

  const totalAmount = Math.max(0, subtotal - discount + deliveryFee + platformFee);

  // Approximate distance (coordinates or default 3.5km)
  const [addrLon, addrLat] = address.location?.coordinates || [72.8777, 19.0760];
  const [restLon, restLat] = restaurant.autoLocation?.coordinates || [72.8777, 19.0760];

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
  };

  const distance = Math.max(1, getDistanceKm(addrLat, addrLon, restLat, restLon));
  const riderAmount = Math.ceil(distance) * 17;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const order = await Order.create({
    userId: userId.toString(),
    restaurantId: restaurant._id.toString(),
    restaurantName: restaurant.name,
    riderId: null,
    distance,
    riderAmount,
    items: orderItems,
    subtotal,
    deliveryFee,
    platfromFee: platformFee,
    totalAmount,
    addressId: address._id.toString(),
    deliveryAddress: {
      fromattedAddress: address.formattedAddress,
      mobile: address.mobile,
      latitude: addrLat,
      longitude: addrLon,
    },
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "paid" : "pending",
    status: "placed",
    timeline: [
      {
        status: "placed",
        timestamp: new Date(),
        note:
          paymentMethod === "cod"
            ? "Order placed successfully with Cash on Delivery."
            : "Order created successfully. Awaiting payment authorization.",
      },
    ],
    expiresAt,
  });

  // Clear cart and coupon after successful order
  await Cart.deleteMany(userQuery);
  await clearUserAppliedCoupon(userId);

  // Publish event asynchronously to RabbitMQ
  try {
    const { publishOrderLifecycleEvent } = await import("../config/order.publisher.js");
    await publishOrderLifecycleEvent("ORDER_CREATED", {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      userId: order.userId,
    });
  } catch (err) {
    // Non-blocking
  }

  const shortId = order._id.toString().slice(-6).toUpperCase();
  const eta = await getDetailedETA(order);

  const orderData = {
    orderId: order._id.toString(),
    shortId,
    restaurant: order.restaurantName,
    status: order.status,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    estimatedDeliveryTime: `${eta.totalETA} mins`,
    expectedArrival: eta.targetDeliveryTime,
  };

  return {
    success: true,
    message: `🎉 Order #${shortId} has been placed successfully! Estimated arrival: ${eta.totalETA} minutes.`,
    order: orderData,
    cards: [{ type: "order", data: orderData }],
  };
}

export async function executeInitiatePayment(userId, { orderId }) {
  const order = await resolveUserOrder(userId, orderId);
  if (!order) {
    return { success: false, message: "Order not found." };
  }

  if (order.paymentStatus === "paid") {
    return {
      success: true,
      alreadyPaid: true,
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} is already paid.`,
    };
  }

  return {
    success: true,
    orderId: order._id.toString(),
    shortId: order._id.toString().slice(-6).toUpperCase(),
    amount: order.totalAmount,
    currency: "INR",
    message: `Ready to complete payment for Order #${order._id.toString().slice(-6).toUpperCase()} (₹${order.totalAmount}). Please tap Checkout to complete via Razorpay.`,
    cards: [{
      type: "order",
      data: {
        orderId: order._id.toString(),
        shortId: order._id.toString().slice(-6).toUpperCase(),
        restaurant: order.restaurantName,
        status: order.status,
        totalAmount: order.totalAmount,
      },
    }],
  };
}

export async function executeGetUserPreferences(userId) {
  const [pref, recentOrders] = await Promise.all([
    UserPreference.findOne({ userId: userId.toString() }).lean(),
    Order.find({ userId: userId.toString() }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const pastRestaurants = [...new Set(recentOrders.map((o) => o.restaurantName).filter(Boolean))];
  const pastItems = [
    ...new Set(
      recentOrders.flatMap((o) => (o.items || []).map((i) => i.name)).filter(Boolean)
    ),
  ];

  return {
    found: true,
    preferences: {
      cuisines: pref?.cuisinePreferences || [],
      priceRange: pref?.preferredPriceRange || "mid",
      isVegetarian: pref?.isVegetarian || false,
      frequentlyOrderedFrom: pastRestaurants.slice(0, 3),
      frequentlyOrderedDishes: pastItems.slice(0, 5),
    },
  };
}

// ─── TOOL DISPATCHER ────────────────────────────────────────────────────────

export async function dispatchAgentTool(toolName, args, userId) {
  switch (toolName) {
    case "searchRestaurants":
      return await executeSearchRestaurants(args || {});
    case "searchMenuItems":
      return await executeSearchMenuItems(args || {});
    case "getRestaurantDetails":
      return await executeGetRestaurantDetails(args || {});
    case "getMenu":
      return await executeGetMenu(args || {});
    case "getFoodItemDetails":
      return await executeGetFoodItemDetails(args || {});
    case "getCart":
      return await executeGetCart(userId);
    case "addToCart":
      return await executeAddToCart(userId, args || {});
    case "removeFromCart":
      return await executeRemoveFromCart(userId, args || {});
    case "updateCartQuantity":
      return await executeUpdateCartQuantity(userId, args || {});
    case "clearCart":
      return await executeClearCart(userId);
    case "getAvailableCoupons":
      return await executeGetAvailableCoupons(userId);
    case "applyCoupon":
      return await executeApplyCoupon(userId, args || {});
    case "calculateCartTotal":
      return await executeCalculateCartTotal(userId);
    case "getOrderHistory":
      return await executeGetOrderHistory(userId, args || {});
    case "getOrderDetails":
      return await executeGetOrderDetails(userId, args || {});
    case "getOrderStatus":
      return await executeGetOrderStatus(userId, args || {});
    case "getOrderETA":
      return await executeGetOrderETA(userId, args || {});
    case "reorderPreviousOrder":
      return await executeReorderPreviousOrder(userId, args || {});
    case "createOrder":
      return await executeCreateOrder(userId, args || {});
    case "initiatePayment":
      return await executeInitiatePayment(userId, args || {});
    case "getUserPreferences":
      return await executeGetUserPreferences(userId);
    default:
      return { error: `Tool '${toolName}' is not recognized.` };
  }
}
