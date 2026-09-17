import SurplusInventory from "../models/SurplusInventory.js";
import Restaurant from "../models/Restaurant.js";
import Address from "../models/Address.js";
import Order from "../models/Order.js";
import TryCatch from "../middlewares/trycatch.js";
import { getDetailedETA } from "../services/etaService.js";
import { publishEvent } from "../config/order.publisher.js";

// Proximity calculation helper
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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2);
};

// Create Surplus Item (Sellers)
export const createSurplusItem = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user || user.role !== "seller") {
    return res.status(403).json({ message: "Only sellers can add surplus inventory" });
  }

  const restaurant = await Restaurant.findOne({ ownerId: user._id.toString() });
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant profile not found for this seller" });
  }

  const { name, description, originalPrice, discountPrice, quantity, expiresAt } = req.body;

  if (!name || !originalPrice || !discountPrice || !quantity || !expiresAt) {
    return res.status(400).json({ message: "Missing required surplus item fields" });
  }

  const surplusExpiry = new Date(expiresAt);
  if (surplusExpiry <= new Date()) {
    return res.status(400).json({ message: "Expiration time must be in the future" });
  }

  const surplusItem = await SurplusInventory.create({
    restaurantId: restaurant._id,
    name,
    description,
    originalPrice,
    discountPrice,
    quantity,
    expiresAt: surplusExpiry,
  });

  res.status(201).json({
    message: "Surplus item created successfully",
    surplusItem,
  });
});

// Fetch Active Surplus Items (Customers)
export const getSurplusItems = TryCatch(async (req, res) => {
  const { latitude, longitude, maxDistanceKm = 10, restaurantId } = req.query;

  let query = {
    quantity: { $gt: 0 },
    expiresAt: { $gt: new Date() }, // Never return expired items
  };

  if (restaurantId) {
    query.restaurantId = restaurantId;
  } else if (latitude && longitude) {
    // Find nearby restaurants within maxDistanceKm
    const coords = [parseFloat(longitude), parseFloat(latitude)];
    const nearbyRestaurants = await Restaurant.find({
      autoLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coords,
          },
          $maxDistance: parseFloat(maxDistanceKm) * 1000,
        },
      },
      isOpen: true,
    }).lean();

    query.restaurantId = { $in: nearbyRestaurants.map((r) => r._id) };
  } else {
    // Fallback: all open restaurants with active surplus
    const openRestaurants = await Restaurant.find({ isOpen: true }).lean();
    query.restaurantId = { $in: openRestaurants.map((r) => r._id) };
  }

  const surplusItems = await SurplusInventory.find(query)
    .populate("restaurantId", "name image autoLocation address phone")
    .sort({ expiresAt: 1 }) // Items expiring sooner listed first
    .lean();

  res.json({
    success: true,
    count: surplusItems.length,
    surplusItems,
  });
});

// Purchase / Order Surplus Food (Customer)
// Handles atomic inventory decrement, expiration check, race conditions, and creates Order
export const purchaseSurplusItem = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const { surplusId, addressId, quantity = 1 } = req.body;

  if (!surplusId || !addressId) {
    return res.status(400).json({ message: "Surplus ID and delivery address are required" });
  }

  const numQuantity = parseInt(quantity, 10) || 1;
  if (numQuantity < 1) {
    return res.status(400).json({ message: "Quantity must be at least 1" });
  }

  const address = await Address.findOne({ _id: addressId, userId: user._id });
  if (!address) {
    return res.status(404).json({ message: "Delivery address not found" });
  }

  const now = new Date();

  // Atomic operation: decrement quantity ONLY IF surplus item has sufficient quantity and hasn't expired
  const surplusItem = await SurplusInventory.findOneAndUpdate(
    {
      _id: surplusId,
      quantity: { $gte: numQuantity },
      expiresAt: { $gt: now },
    },
    {
      $inc: { quantity: -numQuantity },
    },
    { new: true }
  ).populate("restaurantId");

  if (!surplusItem) {
    // Determine exact cause for meaningful customer feedback
    const existing = await SurplusInventory.findById(surplusId);
    if (!existing || existing.expiresAt <= now) {
      return res.status(400).json({
        message: "This surplus food listing has just expired and is no longer available to order.",
        code: "SURPLUS_EXPIRED",
      });
    }
    return res.status(400).json({
      message: `Only ${existing.quantity} portions remaining. Please reduce your quantity.`,
      code: "INSUFFICIENT_QUANTITY",
    });
  }

  const restaurant = surplusItem.restaurantId;
  if (!restaurant) {
    // Revert inventory
    await SurplusInventory.findByIdAndUpdate(surplusId, { $inc: { quantity: numQuantity } });
    return res.status(404).json({ message: "Restaurant not found" });
  }

  // Calculate distance
  const custLat = address.location?.coordinates?.[1] || address.latitude || 0;
  const custLng = address.location?.coordinates?.[0] || address.longitude || 0;
  const restLat = restaurant.autoLocation?.coordinates?.[1] || 0;
  const restLng = restaurant.autoLocation?.coordinates?.[0] || 0;

  const distance = getDistanceKm(custLat, custLng, restLat, restLng);

  const subtotal = surplusItem.discountPrice * numQuantity;
  const deliveryFee = distance > 5 ? 40 : 20;
  const platformFee = 5;
  const totalAmount = subtotal + deliveryFee + platformFee;

  const order = await Order.create({
    userId: user._id.toString(),
    restaurantId: restaurant._id,
    restaurantName: restaurant.name,
    addressId: address._id.toString(),
    riderAmount: 0,
    items: [
      {
        name: `[Surplus] ${surplusItem.name}`,
        price: surplusItem.discountPrice,
        quauntity: numQuantity,
      },
    ],
    subtotal,
    deliveryFee,
    platfromFee: platformFee,
    totalAmount,
    deliveryAddress: {
      fromattedAddress: address.formattedAddress || address.address || "Customer Address",
      latitude: custLat,
      longitude: custLng,
      mobile: address.mobile || user.phone,
    },
    distance,
    paymentMethod: "cod",
    paymentStatus: "pending",
    status: "placed",
    timeline: [
      {
        status: "placed",
        timestamp: new Date(),
        note: `Surplus meal ordered with ${Math.round(((surplusItem.originalPrice - surplusItem.discountPrice) / surplusItem.originalPrice) * 100)}% discount!`,
      },
    ],
  });

  // Calculate dynamic ETA using ETA service
  const etaDetails = await getDetailedETA(order);

  // Notify RabbitMQ / Realtime
  try {
    await publishEvent("order_created", {
      orderId: order._id,
      userId: user._id,
      restaurantId: restaurant._id,
    });
  } catch (pubErr) {
    console.warn("Surplus order event publish warning:", pubErr.message);
  }

  res.status(201).json({
    success: true,
    message: "Surplus meal ordered successfully! You saved food waste and got a great discount.",
    orderId: order._id,
    order,
    etaDetails,
  });
});

// Delete Surplus Item (Sellers)
export const deleteSurplusItem = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user || user.role !== "seller") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const restaurant = await Restaurant.findOne({ ownerId: user._id.toString() });
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant profile not found" });
  }

  const { id } = req.params;
  const deletedItem = await SurplusInventory.findOneAndDelete({
    _id: id,
    restaurantId: restaurant._id,
  });

  if (!deletedItem) {
    return res.status(404).json({ message: "Surplus item not found or unauthorized to delete" });
  }

  res.json({ message: "Surplus item removed successfully" });
});

// Fetch Seller's Own Surplus Items
export const getMySurplusItems = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user || user.role !== "seller") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const restaurant = await Restaurant.findOne({ ownerId: user._id.toString() });
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant profile not found" });
  }

  const items = await SurplusInventory.find({ restaurantId: restaurant._id }).sort({ createdAt: -1 });
  res.json(items);
});
