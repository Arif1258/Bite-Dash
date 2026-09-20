import SurplusInventory from "../models/SurplusInventory.js";
import Restaurant from "../models/Restaurant.js";
import Address from "../models/Address.js";
import Order from "../models/Order.js";
import TryCatch from "../middlewares/trycatch.js";
import { getDetailedETA } from "../services/etaService.js";
import { publishEvent } from "../config/order.publisher.js";
import axios from "axios";

// Proximity distance calculation helper
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

// ─── 1. Create Surplus Item & Notify Nearby Customers (within 5 km) ──────────

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

  const numQuantity = parseInt(quantity, 10);
  if (numQuantity <= 0) {
    return res.status(400).json({ message: "Quantity must be greater than zero" });
  }

  const surplusItem = await SurplusInventory.create({
    restaurantId: restaurant._id,
    name,
    description,
    originalPrice: parseFloat(originalPrice),
    discountPrice: parseFloat(discountPrice),
    quantity: numQuantity,
    expiresAt: surplusExpiry,
    status: "active",
  });

  // ─── MongoDB Geospatial Query for Nearby Customers (within 5 km radius) ────
  // Uses MongoDB 2dsphere index on Address.location with $geoNear
  let notifiedUsers = [];
  try {
    const restaurantCoordinates = restaurant.autoLocation?.coordinates;
    if (restaurantCoordinates && restaurantCoordinates.length === 2) {
      const nearbyAddresses = await Address.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: restaurantCoordinates,
            },
            distanceField: "distanceMeters",
            maxDistance: 5000, // 5 km radius in meters
            spherical: true,
          },
        },
        {
          $group: {
            _id: "$userId",
            distanceKm: {
              $first: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] },
            },
            address: { $first: "$formattedAddress" },
          },
        },
      ]);

      notifiedUsers = nearbyAddresses;

      // Broadcast real-time surplus alert to discovered nearby users via Socket service
      if (process.env.REALTIME_SERVICE && nearbyAddresses.length > 0) {
        const discountPercent = Math.round(
          ((surplusItem.originalPrice - surplusItem.discountPrice) / surplusItem.originalPrice) * 100
        );

        for (const customer of nearbyAddresses) {
          axios.post(
            `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
            {
              event: "surplus:nearby_alert",
              room: `user:${customer._id}`,
              payload: {
                surplusId: surplusItem._id,
                name: surplusItem.name,
                discountPrice: surplusItem.discountPrice,
                originalPrice: surplusItem.originalPrice,
                discountPercent,
                restaurantName: restaurant.name,
                distanceKm: customer.distanceKm,
                expiresAt: surplusItem.expiresAt,
              },
            },
            {
              headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
            }
          ).catch((e) => console.warn("Socket notification warning:", e.message));
        }
      }
    }
  } catch (geoErr) {
    console.warn("Geospatial customer discovery warning:", geoErr.message);
  }

  res.status(201).json({
    message: "Surplus item created successfully",
    surplusItem,
    notifiedNearbyCustomersCount: notifiedUsers.length,
    notifiedUsers: notifiedUsers.map((u) => ({ userId: u._id, distanceKm: u.distanceKm })),
  });
});

// ─── 2. Fetch Active Surplus Items (Customer Browsing) ──────────────────────

export const getSurplusItems = TryCatch(async (req, res) => {
  const { latitude, longitude, maxDistanceKm = 10, restaurantId } = req.query;

  const now = new Date();

  // Filter items that are active, not expired, and have available portions
  let query = {
    quantity: { $gt: 0 },
    expiresAt: { $gt: now },
    status: "active",
  };

  if (restaurantId) {
    query.restaurantId = restaurantId;
  } else if (latitude && longitude) {
    // MongoDB geospatial query finding restaurants within maxDistanceKm
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

    if (nearbyRestaurants.length > 0) {
      query.restaurantId = { $in: nearbyRestaurants.map((r) => r._id) };
    } else {
      // Fallback: broaden to all open restaurants so users can still discover surplus items
      const openRestaurants = await Restaurant.find({ isOpen: true }).lean();
      query.restaurantId = { $in: openRestaurants.map((r) => r._id) };
    }
  } else {
    // Fallback: all open restaurants
    const openRestaurants = await Restaurant.find({ isOpen: true }).lean();
    query.restaurantId = { $in: openRestaurants.map((r) => r._id) };
  }

  let surplusItems = await SurplusInventory.find(query)
    .populate("restaurantId", "name image autoLocation formattedAddress phone")
    .sort({ expiresAt: 1 }) // Expiring soonest displayed first
    .lean();

  // If geo-filtered query returned 0 items, broaden search so customer still sees active deals
  if (surplusItems.length === 0 && !restaurantId) {
    surplusItems = await SurplusInventory.find({
      quantity: { $gt: 0 },
      expiresAt: { $gt: now },
      status: "active",
    })
      .populate("restaurantId", "name image autoLocation formattedAddress phone")
      .sort({ expiresAt: 1 })
      .lean();
  }

  res.json({
    success: true,
    count: surplusItems.length,
    surplusItems,
  });
});

// ─── 3. Nearby Surplus Alerts for Customer (Within 5 km) ───────────────────

export const getNearbySurplusAlerts = TryCatch(async (req, res) => {
  const { latitude, longitude } = req.query;
  const user = req.user;

  let coords = null;

  if (latitude && longitude) {
    coords = [parseFloat(longitude), parseFloat(latitude)];
  } else if (user) {
    // Lookup customer's most recent saved address
    const address = await Address.findOne({ userId: user._id.toString() }).sort({ createdAt: -1 });
    if (address?.location?.coordinates) {
      coords = address.location.coordinates;
    }
  }

  if (!coords) {
    return res.json({ success: true, count: 0, alerts: [] });
  }

  // Find open restaurants within 5 km using MongoDB 2dsphere $near
  const nearbyRestaurants = await Restaurant.find({
    autoLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coords,
        },
        $maxDistance: 5000, // 5 km radius
      },
    },
    isOpen: true,
  }).lean();

  if (nearbyRestaurants.length === 0) {
    return res.json({ success: true, count: 0, alerts: [] });
  }

  const restaurantIds = nearbyRestaurants.map((r) => r._id);
  const now = new Date();

  const alerts = await SurplusInventory.find({
    restaurantId: { $in: restaurantIds },
    quantity: { $gt: 0 },
    expiresAt: { $gt: now },
    status: "active",
  })
    .populate("restaurantId", "name image autoLocation")
    .sort({ expiresAt: 1 })
    .lean();

  res.json({
    success: true,
    count: alerts.length,
    alerts,
  });
});

// ─── 4. Purchase Surplus Meal ───────────────────────────────────────────────

export const purchaseSurplusItem = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const { surplusId, addressId, quantity = 1, paymentMethod = "cod" } = req.body;

  if (!surplusId || !addressId) {
    return res.status(400).json({ message: "Surplus ID and delivery address are required" });
  }

  const numQuantity = parseInt(quantity, 10) || 1;
  if (numQuantity < 1) {
    return res.status(400).json({ message: "Quantity must be at least 1" });
  }

  const address = await Address.findOne({ _id: addressId, userId: user._id.toString() });
  if (!address) {
    return res.status(404).json({ message: "Delivery address not found" });
  }

  const now = new Date();

  // Atomic decrement: only decrements if quantity >= requested and expiresAt > now
  const surplusItem = await SurplusInventory.findOneAndUpdate(
    {
      _id: surplusId,
      quantity: { $gte: numQuantity },
      expiresAt: { $gt: now },
      status: "active",
    },
    {
      $inc: { quantity: -numQuantity },
    },
    { new: true }
  ).populate("restaurantId");

  if (!surplusItem) {
    const existing = await SurplusInventory.findById(surplusId);
    if (!existing || existing.expiresAt <= now) {
      return res.status(400).json({
        message: "This surplus meal listing has expired and is no longer available.",
        code: "SURPLUS_EXPIRED",
      });
    }
    return res.status(400).json({
      message: `Only ${existing.quantity} portion(s) remaining. Please adjust your order quantity.`,
      code: "INSUFFICIENT_QUANTITY",
    });
  }

  // If quantity reached zero, mark as sold out
  if (surplusItem.quantity === 0) {
    await SurplusInventory.findByIdAndUpdate(surplusId, { status: "sold_out" });
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
    restaurantId: restaurant._id.toString(),
    restaurantName: restaurant.name,
    addressId: address._id.toString(),
    riderAmount: Math.ceil(distance) * 17,
    items: [
      {
        name: `[Surplus Deal] ${surplusItem.name}`,
        price: surplusItem.discountPrice,
        quauntity: numQuantity,
      },
    ],
    subtotal,
    deliveryFee,
    platfromFee: platformFee,
    totalAmount,
    deliveryAddress: {
      fromattedAddress: address.formattedAddress || "Customer Address",
      latitude: custLat,
      longitude: custLng,
      mobile: address.mobile || user.phone,
    },
    distance,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
    status: "placed",
    timeline: [
      {
        status: "placed",
        timestamp: new Date(),
        note: `Surplus meal ordered with discount! Portion count: ${numQuantity}`,
      },
    ],
  });

  const etaDetails = await getDetailedETA(order);

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
    message: "Surplus meal ordered successfully! Food saved from waste.",
    orderId: order._id,
    order,
    etaDetails,
  });
});

// ─── 5. Delete Surplus Item (Seller) ────────────────────────────────────────

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
    return res.status(404).json({ message: "Surplus item not found or unauthorized" });
  }

  res.json({ message: "Surplus item removed successfully" });
});

// ─── 6. Fetch Seller's Own Surplus Items ────────────────────────────────────

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
