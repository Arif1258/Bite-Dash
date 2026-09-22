import mongoose from "mongoose";
import TryCatch from "../middlewares/trycatch.js";
import Cart from "../models/Cart.js";
import MenuItem from "../models/MenuItems.js";

const getUserIdQuery = (userId) => {
  if (!userId) return { userId: null };
  const strId = userId.toString();
  const or = [{ userId: strId }];
  if (mongoose.Types.ObjectId.isValid(strId)) {
    or.push({ userId: new mongoose.Types.ObjectId(strId) });
  }
  return { $or: or };
};

export const addToCart = TryCatch(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;
  const { restaurantId, itemId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(restaurantId) ||
    !mongoose.Types.ObjectId.isValid(itemId)
  ) {
    return res.status(400).json({
      message: "Invalid restaurant and item id",
    });
  }

  // Stock / Availability validation
  const menuItem = await MenuItem.findById(itemId);
  if (!menuItem) {
    return res.status(404).json({
      message: "Menu item not found",
    });
  }
  if (menuItem.isAvailable === false) {
    return res.status(400).json({
      message: `"${menuItem.name}" is currently out of stock or unavailable`,
    });
  }

  const userQuery = getUserIdQuery(userId);
  const cartFromDifferentRestaurant = await Cart.findOne({
    $and: [
      userQuery,
      { restaurantId: { $ne: restaurantId } },
    ],
  });

  if (cartFromDifferentRestaurant) {
    return res.status(400).json({
      message:
        "You can order from only one restaurant at a time. Please clear your cart first to add items from this restaurant.",
    });
  }

  let cartItem = await Cart.findOne({
    $and: [
      userQuery,
      { restaurantId, itemId },
    ],
  });

  if (cartItem) {
    cartItem.quauntity += 1;
    await cartItem.save();
  } else {
    cartItem = await Cart.create({
      userId: userId.toString(),
      restaurantId,
      itemId,
      quauntity: 1,
    });
  }

  return res.json({
    message: "Item added to cart",
    cart: cartItem,
  });
});

export const fetchMyCart = TryCatch(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;
  const userQuery = getUserIdQuery(userId);

  const cartItems = await Cart.find(userQuery)
    .populate("itemId")
    .populate("restaurantId");

  let subtotal = 0;
  let cartLength = 0;
  const validCartItems = [];
  const orphanedIds = [];

  for (const cartItem of cartItems) {
    const item = cartItem.itemId;

    if (!item || typeof item.price !== "number") {
      orphanedIds.push(cartItem._id);
      continue;
    }

    subtotal += item.price * (cartItem.quauntity || 1);
    cartLength += (cartItem.quauntity || 1);
    validCartItems.push(cartItem);
  }

  // Cleanup orphaned cart records asynchronously if any were found
  if (orphanedIds.length > 0) {
    Cart.deleteMany({ _id: { $in: orphanedIds } }).catch((err) =>
      console.warn("Orphaned cart item cleanup warning:", err.message)
    );
  }

  return res.json({
    success: true,
    cartLength,
    subtotal: Math.round(subtotal * 100) / 100,
    cart: validCartItems,
  });
});

export const incrementCartItem = TryCatch(async (req, res) => {
  const userId = req.user?._id;
  const { itemId } = req.body;

  if (!userId || !itemId) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }

  // Stock check
  const menuItem = await MenuItem.findById(itemId);
  if (menuItem && menuItem.isAvailable === false) {
    return res.status(400).json({
      message: `"${menuItem.name}" is currently out of stock`,
    });
  }

  const userQuery = getUserIdQuery(userId);
  const cartItem = await Cart.findOne({
    $and: [userQuery, { itemId }],
  });

  if (!cartItem) {
    return res.status(404).json({
      message: "Item not found",
    });
  }

  cartItem.quauntity += 1;
  await cartItem.save();

  res.json({
    message: "Quantity increased",
    cartItem,
  });
});

export const decrementCartItem = TryCatch(async (req, res) => {
  const userId = req.user?._id;
  const { itemId } = req.body;

  if (!userId || !itemId) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }

  const userQuery = getUserIdQuery(userId);
  const cartItem = await Cart.findOne({
    $and: [userQuery, { itemId }],
  });

  if (!cartItem) {
    return res.status(404).json({
      message: "Item not found",
    });
  }

  if (cartItem.quauntity <= 1) {
    await Cart.deleteOne({ _id: cartItem._id });

    return res.json({
      message: "Item removed from cart",
    });
  }

  cartItem.quauntity -= 1;
  await cartItem.save();

  res.json({
    message: "Quantity decreased",
    cartItem,
  });
});

export const removeCartItem = TryCatch(async (req, res) => {
  const userId = req.user?._id;
  const { itemId, cartId } = req.body;

  if (!userId || (!itemId && !cartId)) {
    return res.status(400).json({
      message: "Invalid request: itemId or cartId is required",
    });
  }

  const userQuery = getUserIdQuery(userId);
  let filter;

  if (cartId && mongoose.Types.ObjectId.isValid(cartId)) {
    filter = { $and: [userQuery, { _id: cartId }] };
  } else if (itemId) {
    filter = { $and: [userQuery, { itemId }] };
  } else {
    return res.status(400).json({ message: "Invalid request parameters" });
  }

  await Cart.deleteOne(filter);

  return res.json({
    message: "Item removed from cart",
  });
});

export const clearCart = TryCatch(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const userQuery = getUserIdQuery(userId);
  await Cart.deleteMany(userQuery);

  res.json({
    message: "Cart cleared successfully",
  });
});
