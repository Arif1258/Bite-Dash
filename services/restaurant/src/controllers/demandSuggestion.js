/**
 * Demand Suggestion Controller — Rule-Based Vendor Intelligence
 *
 * This is a deterministic rule-based system, NOT generative AI.
 * It analyzes historical order data to produce actionable vendor-facing
 * inventory/preparation suggestions.
 *
 * Clearly separated from Gen AI customer support.
 */

import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";
import TryCatch from "../middlewares/trycatch.js";

// ─── Time Bucket Definitions ─────────────────────────────────────────────

const TIME_BUCKETS = [
  {
    id: "breakfast",
    label: "Breakfast",
    hours: [6, 7, 8, 9, 10, 11],
    emoji: "🌅",
    peakHour: 9,
    categories: ["Breakfast", "Idli", "Dosa", "Poha", "Upma", "Paratha", "Tea", "Coffee", "Sandwich"],
  },
  {
    id: "lunch",
    label: "Lunch",
    hours: [12, 13, 14, 15],
    emoji: "☀️",
    peakHour: 13,
    categories: ["Biryani", "Rice", "Dal", "Roti", "Curry", "Thali", "Pulao", "North Indian", "South Indian"],
  },
  {
    id: "snacks",
    label: "Evening Snacks",
    hours: [16, 17, 18, 19],
    emoji: "🍿",
    peakHour: 17,
    categories: ["Snacks", "Samosa", "Chai", "Tea", "Burger", "Pizza", "Chaat", "Biscuit", "Chips"],
  },
  {
    id: "dinner",
    label: "Dinner",
    hours: [20, 21, 22, 23],
    emoji: "🌙",
    peakHour: 21,
    categories: ["Biryani", "Pizza", "Burger", "Chinese", "Pasta", "Dinner", "Noodles", "Curry", "Roti"],
  },
];

// ─── Day Type Rules ──────────────────────────────────────────────────────

const WEEKDAY_MULTIPLIER = 1.0;
const WEEKEND_MULTIPLIER = 1.35; // 35% more demand on weekends

function getDayInfo(date) {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    isWeekend,
    dayName: dayNames[day],
    multiplier: isWeekend ? WEEKEND_MULTIPLIER : WEEKDAY_MULTIPLIER,
  };
}

function getCurrentTimeBucket(hour) {
  return TIME_BUCKETS.find((b) => b.hours.includes(hour)) || TIME_BUCKETS[3]; // default dinner
}

// ─── Historical Analysis ─────────────────────────────────────────────────

async function analyzeHistoricalDemand(restaurantId, bucketHours) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await Order.find({
      restaurantId: restaurantId.toString(),
      paymentStatus: "paid",
      status: { $nin: ["cancelled"] },
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    if (orders.length === 0) {
      return { orderCount: 0, avgOrdersPerDay: 0, topItems: [], totalRevenue: 0 };
    }

    // Filter orders for this time bucket
    const bucketOrders = orders.filter((o) => {
      const hour = new Date(o.createdAt).getHours();
      return bucketHours.includes(hour);
    });

    // Count item frequency
    const itemFrequency = {};
    bucketOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.name?.toLowerCase();
        if (name) {
          itemFrequency[name] = (itemFrequency[name] || 0) + (item.quauntity || 1);
        }
      });
    });

    const topItems = Object.entries(itemFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, orderedCount: count }));

    const totalRevenue = bucketOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const daysInPeriod = 30;
    const avgOrdersPerDay = Math.round(bucketOrders.length / daysInPeriod);

    return {
      orderCount: bucketOrders.length,
      avgOrdersPerDay,
      topItems,
      totalRevenue: Math.round(totalRevenue),
    };
  } catch (err) {
    console.error("Error analyzing historical demand:", err);
    return { orderCount: 0, avgOrdersPerDay: 0, topItems: [], totalRevenue: 0 };
  }
}

// ─── Suggestion Generator ────────────────────────────────────────────────

function generateSuggestions(bucket, historicalData, dayInfo, menuItems) {
  const suggestions = [];

  // Demand level classification
  const expectedDailyOrders = historicalData.avgOrdersPerDay * dayInfo.multiplier;
  let demandLevel;
  let demandColor;

  if (expectedDailyOrders >= 20) {
    demandLevel = "HIGH";
    demandColor = "red";
  } else if (expectedDailyOrders >= 8) {
    demandLevel = "MEDIUM";
    demandColor = "amber";
  } else {
    demandLevel = "LOW";
    demandColor = "green";
  }

  // Core demand suggestion
  suggestions.push({
    type: "demand_forecast",
    priority: demandLevel === "HIGH" ? "urgent" : "normal",
    title: `${bucket.emoji} ${demandLevel} demand expected during ${bucket.label}`,
    description: `Based on ${historicalData.orderCount} orders in the last 30 days during this time window${dayInfo.isWeekend ? " (weekend boost applies)" : ""}.`,
    metric: {
      label: "Expected orders today",
      value: Math.round(expectedDailyOrders),
      unit: "orders",
    },
    demandLevel,
    demandColor,
  });

  // Top items suggestion
  if (historicalData.topItems.length > 0) {
    suggestions.push({
      type: "top_items",
      priority: "high",
      title: "🔥 Items with highest demand this period",
      description: `Ensure adequate stock of these items for ${bucket.label}:`,
      items: historicalData.topItems.map((item) => ({
        name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
        orderedLast30Days: item.orderedCount,
        suggestion: `Prepare ~${Math.max(2, Math.round(item.orderedCount / 30 * dayInfo.multiplier))} portions`,
      })),
    });
  }

  // Time-based category suggestions
  const categoryMatches = menuItems.filter((item) =>
    bucket.categories.some(
      (cat) =>
        item.name?.toLowerCase().includes(cat.toLowerCase()) ||
        item.description?.toLowerCase().includes(cat.toLowerCase())
    )
  );

  if (categoryMatches.length > 0 && historicalData.topItems.length === 0) {
    suggestions.push({
      type: "category_prep",
      priority: "medium",
      title: `📋 Suggested items to prioritize for ${bucket.label}`,
      description: `These menu items typically see higher demand during this time:`,
      items: categoryMatches.slice(0, 4).map((item) => ({
        name: item.name,
        suggestion: "Prepare in advance",
      })),
    });
  }

  // Weekend / weekday specific suggestion
  if (dayInfo.isWeekend) {
    suggestions.push({
      type: "weekend_alert",
      priority: "medium",
      title: "📅 Weekend demand boost",
      description: `It's ${dayInfo.dayName} — expect approximately 35% higher order volume than weekdays. Consider increasing inventory and staffing.`,
      metric: {
        label: "Demand multiplier",
        value: "1.35×",
        unit: "vs weekday",
      },
    });
  }

  // Revenue insight
  if (historicalData.totalRevenue > 0) {
    const avgDailyRevenue = Math.round(historicalData.totalRevenue / 30);
    suggestions.push({
      type: "revenue_insight",
      priority: "low",
      title: "💰 Revenue insight for this period",
      description: `Average daily revenue during ${bucket.label} over the last 30 days.`,
      metric: {
        label: "Avg daily revenue",
        value: `₹${avgDailyRevenue}`,
        unit: "during this time slot",
      },
    });
  }

  return suggestions;
}

// ─── Controller ───────────────────────────────────────────────────────────

export const getDemandSuggestions = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user || user.role !== "seller") {
    return res.status(403).json({ message: "Only sellers can view demand suggestions" });
  }

  const restaurant = await Restaurant.findOne({ ownerId: user._id.toString() });
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  const now = new Date();
  const currentHour = now.getHours();
  const dayInfo = getDayInfo(now);
  const currentBucket = getCurrentTimeBucket(currentHour);

  // Get the next upcoming bucket too
  const allBucketIds = TIME_BUCKETS.map((b) => b.id);
  const currentBucketIndex = TIME_BUCKETS.findIndex((b) => b.id === currentBucket.id);
  const nextBucketIndex = (currentBucketIndex + 1) % TIME_BUCKETS.length;
  const nextBucket = TIME_BUCKETS[nextBucketIndex];

  // Fetch historical data for current and next bucket
  const [currentHistory, nextHistory, menuItems] = await Promise.all([
    analyzeHistoricalDemand(restaurant._id, currentBucket.hours),
    analyzeHistoricalDemand(restaurant._id, nextBucket.hours),
    MenuItems.find({ restaurantId: restaurant._id, isAvailable: true }).lean(),
  ]);

  const currentSuggestions = generateSuggestions(
    currentBucket,
    currentHistory,
    dayInfo,
    menuItems
  );

  const upcomingSuggestions = generateSuggestions(
    nextBucket,
    nextHistory,
    dayInfo,
    menuItems
  );

  // Overall restaurant health metrics
  const totalActiveOrders = restaurant.activeOrdersCount || 0;
  const avgPrepTime = restaurant.averagePrepTime || 20;

  res.json({
    success: true,
    generatedAt: now.toISOString(),
    note: "Rule-based demand prediction engine. NOT generative AI.",
    restaurant: {
      name: restaurant.name,
      activeOrders: totalActiveOrders,
      avgPrepTime,
      reliabilityScore: restaurant.reliabilityScore,
    },
    dayInfo: {
      dayName: dayInfo.dayName,
      isWeekend: dayInfo.isWeekend,
      currentTime: `${currentHour}:00`,
    },
    currentWindow: {
      bucket: currentBucket.label,
      emoji: currentBucket.emoji,
      peakHour: `${currentBucket.peakHour}:00`,
      historicalOrders: currentHistory.orderCount,
      suggestions: currentSuggestions,
    },
    upcomingWindow: {
      bucket: nextBucket.label,
      emoji: nextBucket.emoji,
      peakHour: `${nextBucket.peakHour}:00`,
      historicalOrders: nextHistory.orderCount,
      suggestions: upcomingSuggestions,
    },
  });
});

// ─── All Buckets Overview (for full day planning) ─────────────────────────

export const getDayOverview = TryCatch(async (req, res) => {
  const user = req.user;
  if (!user || user.role !== "seller") {
    return res.status(403).json({ message: "Only sellers can view demand suggestions" });
  }

  const restaurant = await Restaurant.findOne({ ownerId: user._id.toString() });
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  const dayInfo = getDayInfo(new Date());

  const allBucketData = await Promise.all(
    TIME_BUCKETS.map(async (bucket) => {
      const history = await analyzeHistoricalDemand(restaurant._id, bucket.hours);
      return {
        bucket: bucket.label,
        emoji: bucket.emoji,
        peakHour: `${bucket.peakHour}:00`,
        expectedOrders: Math.round(history.avgOrdersPerDay * dayInfo.multiplier),
        historicalOrders: history.orderCount,
        topItems: history.topItems.slice(0, 3),
      };
    })
  );

  res.json({
    success: true,
    dayInfo,
    overview: allBucketData,
    note: "Rule-based demand prediction. Data based on last 30 days of orders.",
  });
});
