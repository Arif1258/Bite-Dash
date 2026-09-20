import UserPreference from "../models/UserPreference.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";
import Order from "../models/Order.js";
import SurplusInventory from "../models/SurplusInventory.js";
import TryCatch from "../middlewares/trycatch.js";

// ─── Time-of-Day Categorization Helper ────────────────────────────────────

function getTimeCategory(currentHour = new Date().getHours()) {
  if (currentHour >= 5 && currentHour < 12) {
    return {
      period: "Morning",
      mealType: "Breakfast",
      description: "Fresh morning breakfast picks, hot coffees, juices & bakeries",
      badge: "🌅 Morning Breakfast Pick",
      keywords: ["breakfast", "dosa", "idli", "paratha", "poha", "sandwich", "coffee", "tea", "omelette", "juice", "bakery"],
    };
  }
  if (currentHour >= 12 && currentHour < 17) {
    return {
      period: "Afternoon",
      mealType: "Lunch",
      description: "Hearty lunch meals, thalis, biryanis & wholesome bowls",
      badge: "☀️ Afternoon Lunch Special",
      keywords: ["lunch", "thali", "biryani", "rice", "curry", "roti", "meals", "dal", "pulao", "paneer", "chicken"],
    };
  }
  if (currentHour >= 17 && currentHour < 21) {
    return {
      period: "Evening",
      mealType: "Snacks & Beverages",
      description: "Crispy snacks, street delicacies, hot chai & cooling sips",
      badge: "☕ Evening Snack & Sip",
      keywords: ["snack", "chaat", "samosa", "momo", "chai", "coffee", "fries", "burger", "pizza", "roll", "shake"],
    };
  }
  return {
    period: "Night",
    mealType: "Dinner & Late-Night",
    description: "Comforting dinners, pizzas, desserts & late-night munchies",
    badge: "🌙 Late-Night Dinner Choice",
    keywords: ["dinner", "biryani", "pizza", "noodles", "chinese", "dessert", "midnight", "rolls", "curry"],
  };
}

// ─── Fetch Personalized Rule-Based Recommendations ────────────────────────

export const getRecommendations = TryCatch(async (req, res) => {
  const user = req.user;
  const timeInfo = getTimeCategory();

  // Find all verified, currently open restaurants
  const openRestaurants = await Restaurant.find({ isOpen: true, isVerified: true }).lean();
  const openRestaurantIds = openRestaurants.map((r) => r._id);

  const recommendations = {
    timeBased: {
      period: timeInfo.period,
      mealType: timeInfo.mealType,
      description: timeInfo.description,
      badge: timeInfo.badge,
      items: [],
    },
    becauseYouOrdered: null,
    surplusDeals: [],
    trendingRestaurants: [],
  };

  // ─── 1. Time-Based Recommendations ───────────────────────────────────────
  // Find menu items matching the current time keywords at open restaurants
  const keywordRegexes = timeInfo.keywords.map((k) => new RegExp(k, "i"));

  let timeItems = await MenuItems.find({
    restaurantId: { $in: openRestaurantIds },
    isAvailable: true,
    $or: [
      { name: { $in: keywordRegexes } },
      { description: { $in: keywordRegexes } },
    ],
  })
    .limit(6)
    .populate("restaurantId", "name image autoLocation")
    .lean();

  // Fallback: If no keyword matches, select general items from open restaurants
  if (timeItems.length === 0) {
    timeItems = await MenuItems.find({
      restaurantId: { $in: openRestaurantIds },
      isAvailable: true,
    })
      .limit(6)
      .populate("restaurantId", "name image autoLocation")
      .lean();
  }

  recommendations.timeBased.items = timeItems.map((item) => ({
    ...item,
    ruleExplanation: `${timeInfo.badge} — Best enjoyed during ${timeInfo.period}`,
  }));

  // ─── 2. "Because You Ordered" (User History / Preferences) ────────────────
  if (user) {
    // Look up real past orders
    const pastOrders = await Order.find({
      userId: user._id.toString(),
      $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (pastOrders.length > 0) {
      // Find the most frequently or recently ordered item
      const itemCounts = {};
      pastOrders.forEach((o) => {
        (o.items || []).forEach((i) => {
          itemCounts[i.name] = (itemCounts[i.name] || 0) + 1;
        });
      });

      const topOrderedItem = Object.keys(itemCounts).sort((a, b) => itemCounts[b] - itemCounts[a])[0];

      if (topOrderedItem) {
        // Find matching items currently available
        const matchingItems = await MenuItems.find({
          name: { $regex: topOrderedItem, $options: "i" },
          isAvailable: true,
          restaurantId: { $in: openRestaurantIds },
        })
          .limit(4)
          .populate("restaurantId", "name image")
          .lean();

        if (matchingItems.length > 0) {
          recommendations.becauseYouOrdered = {
            itemKeyword: topOrderedItem,
            badge: `⭐ Because you ordered "${topOrderedItem}"`,
            items: matchingItems.map((item) => ({
              ...item,
              ruleExplanation: `Recommended based on your past craving for ${topOrderedItem}`,
            })),
          };
        }
      }
    }
  }

  // Fallback for "Because You Ordered" if guest or no past orders
  if (!recommendations.becauseYouOrdered && openRestaurantIds.length > 0) {
    const popularItems = await MenuItems.find({
      restaurantId: { $in: openRestaurantIds },
      isAvailable: true,
    })
      .skip(2)
      .limit(4)
      .populate("restaurantId", "name image")
      .lean();

    recommendations.becauseYouOrdered = {
      itemKeyword: "Popular Favorites",
      badge: "⭐ Customer All-Time Favorites",
      items: popularItems.map((item) => ({
        ...item,
        ruleExplanation: "High customer rating and repeat orders",
      })),
    };
  }

  // ─── 3. Surplus Food Integration (Value Deals) ───────────────────────────
  const now = new Date();
  const surplusItems = await SurplusInventory.find({
    restaurantId: { $in: openRestaurantIds },
    quantity: { $gt: 0 },
    expiresAt: { $gt: now },
    status: "active",
  })
    .limit(4)
    .populate("restaurantId", "name image autoLocation")
    .sort({ expiresAt: 1 })
    .lean();

  recommendations.surplusDeals = surplusItems.map((s) => ({
    ...s,
    ruleExplanation: `🌱 Surplus Eco-Deal: Save food waste with ${Math.round(((s.originalPrice - s.discountPrice) / s.originalPrice) * 100)}% discount!`,
  }));

  // ─── 4. Trending Open Restaurants ─────────────────────────────────────────
  recommendations.trendingRestaurants = openRestaurants.slice(0, 4);

  res.json({
    success: true,
    currentHour: new Date().getHours(),
    recommendations,
  });
});

// ─── Track Search / Preference Action ─────────────────────────────────────

export const trackSearchPreference = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { search, cuisine, isVegetarian } = req.body;
  const userId = user._id.toString();

  const updates = {};
  if (search) {
    updates.$addToSet = { searchTerms: search };
  }
  if (cuisine) {
    updates.$addToSet = { ...updates.$addToSet, cuisinePreferences: cuisine };
  }
  if (typeof isVegetarian === "boolean") {
    updates.$set = { isVegetarian };
  }

  const preference = await UserPreference.findOneAndUpdate(
    { userId },
    updates,
    { new: true, upsert: true }
  );

  res.json({ success: true, preference });
});
