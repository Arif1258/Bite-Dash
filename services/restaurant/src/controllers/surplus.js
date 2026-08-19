import SurplusInventory from "../models/SurplusInventory.js";
import Restaurant from "../models/Restaurant.js";
import TryCatch from "../middlewares/trycatch.js";

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

  const surplusItem = await SurplusInventory.create({
    restaurantId: restaurant._id,
    name,
    description,
    originalPrice,
    discountPrice,
    quantity,
    expiresAt: new Date(expiresAt),
  });

  res.status(201).json({
    message: "Surplus item created successfully",
    surplusItem,
  });
});

// Fetch Proximity-Based Surplus Items (Customers)
export const getSurplusItems = TryCatch(async (req, res) => {
  const { latitude, longitude, maxDistanceKm = 5 } = req.query;

  let restaurantIds = [];

  if (latitude && longitude) {
    // Find nearby restaurants within maxDistanceKm
    const coords = [parseFloat(longitude), parseFloat(latitude)];
    const nearbyRestaurants = await Restaurant.find({
      autoLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coords,
          },
          $maxDistance: maxDistanceKm * 1000, // Distance in meters
        },
      },
      isOpen: true,
    });

    restaurantIds = nearbyRestaurants.map((r) => r._id);
  } else {
    // Default fallback: get all open restaurants
    const openRestaurants = await Restaurant.find({ isOpen: true });
    restaurantIds = openRestaurants.map((r) => r._id);
  }

  // Fetch active surplus items for these restaurants
  const now = new Date();
  const surplusItems = await SurplusInventory.find({
    restaurantId: { $in: restaurantIds },
    quantity: { $gt: 0 },
    expiresAt: { $gt: now },
  }).populate("restaurantId", "name image autoLocation");

  res.json({
    success: true,
    count: surplusItems.length,
    surplusItems,
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

  const items = await SurplusInventory.find({ restaurantId: restaurant._id });
  res.json(items);
});
