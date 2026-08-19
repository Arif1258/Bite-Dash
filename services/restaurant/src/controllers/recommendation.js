import UserPreference from "../models/UserPreference.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";
import TryCatch from "../middlewares/trycatch.js";

// Fetch Personalized Recommendations
export const getRecommendations = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = user._id.toString();

  // Find or create default preferences
  let pref = await UserPreference.findOne({ userId });
  if (!pref) {
    pref = await UserPreference.create({ userId });
  }

  // Define response structure
  const recommendations = {
    becauseYouOrdered: [],
    popularTimeBased: [],
    restaurantsYouMayLike: [],
    trySomethingDifferent: [],
  };

  // Section 1: "Because you ordered X"
  if (pref.favoriteDishes.length > 0) {
    const favoriteDishName = pref.favoriteDishes[0];
    const matchingItems = await MenuItems.find({
      name: { $regex: favoriteDishName, $options: "i" },
    })
      .limit(4)
      .populate("restaurantId", "name image");
    
    recommendations.becauseYouOrdered = {
      dish: favoriteDishName,
      items: matchingItems,
    };
  } else {
    // Fallback: Generic top dishes
    const fallbackDishes = await MenuItems.find({}).limit(4).populate("restaurantId", "name image");
    recommendations.becauseYouOrdered = {
      dish: "Popular Choices",
      items: fallbackDishes,
    };
  }

  // Section 2: "Popular during your usual time" (Time-based recommendation)
  const hour = new Date().getHours();
  let timeTag = "Dinner";
  if (hour < 12) timeTag = "Breakfast";
  else if (hour < 16) timeTag = "Lunch";
  else if (hour < 19) timeTag = "Snacks";

  // Find menu items matching the timeTag in description/name or simply popular items
  const timeBasedItems = await MenuItems.find({
    $or: [
      { name: { $regex: timeTag, $options: "i" } },
      { description: { $regex: timeTag, $options: "i" } },
    ],
  })
    .limit(4)
    .populate("restaurantId", "name image");

  recommendations.popularTimeBased = {
    timeOfDay: timeTag,
    items: timeBasedItems.length > 0 ? timeBasedItems : await MenuItems.find({}).skip(2).limit(4).populate("restaurantId", "name image"),
  };

  // Section 3: "Restaurants you may like" (Based on preferred cuisines)
  if (pref.cuisinePreferences.length > 0) {
    const matchingRestaurants = await Restaurant.find({
      isOpen: true,
      description: { $in: pref.cuisinePreferences.map(c => new RegExp(c, "i")) },
    }).limit(4);

    recommendations.restaurantsYouMayLike = matchingRestaurants;
  } else {
    // Fallback: Open verified restaurants
    recommendations.restaurantsYouMayLike = await Restaurant.find({ isOpen: true, isVerified: true }).limit(4);
  }

  // Section 4: "Try something different" (Explore other cuisines)
  const allCuisines = ["Pizza", "Burgers", "Biryani", "Chinese", "Desserts", "South Indian", "North Indian"];
  const unexploredCuisines = allCuisines.filter((c) => !pref.cuisinePreferences.includes(c));
  
  const queryCuisine = unexploredCuisines[Math.floor(Math.random() * unexploredCuisines.length)] || "North Indian";

  const alternativeRestaurants = await Restaurant.find({
    isOpen: true,
    description: { $regex: queryCuisine, $options: "i" },
  }).limit(4);

  recommendations.trySomethingDifferent = {
    cuisine: queryCuisine,
    restaurants: alternativeRestaurants.length > 0 ? alternativeRestaurants : await Restaurant.find({ isOpen: true }).skip(1).limit(4),
  };

  res.json({
    success: true,
    recommendations,
  });
});

// Track Search / Preference Action
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
