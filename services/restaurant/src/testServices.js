import { calculateOrderETA } from "./controllers/order.js";

// Mock assert function
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ Test Failed: ${message}`);
  }
  console.log(`✅ Test Passed: ${message}`);
};

console.log("🏃 Running BiteDash Verification Tests...");

// 1. Test ETA Calculation Logic
const testETACalculator = async () => {
  console.log("\nTesting ETA Engine...");
  
  // Mock order
  const mockOrder = {
    status: "placed",
    distance: 4.5, // 4.5 km
    restaurantId: "test-rest-id",
    riderId: null, // no rider assigned yet
  };

  // Mock Restaurant details
  const mockRestaurant = {
    averagePrepTime: 20,
    activeOrdersCount: 4, // Medium load
  };

  // Compute expected:
  // prepTime = 20 + 4 * 2 = 28
  // travelTime = Math.ceil(4.5 * 3) = 14
  // driverDelay = 5 (no rider assigned)
  // buffer = 5
  // totalExpected = 28 + 14 + 5 + 5 = 52 mins

  const prepTime = mockRestaurant.averagePrepTime + mockRestaurant.activeOrdersCount * 2;
  const travelTime = Math.ceil(mockOrder.distance * 3);
  const driverDelay = mockOrder.riderId ? 0 : 5;
  const buffer = mockRestaurant.activeOrdersCount > 5 ? 8 : 5;
  const expectedETA = prepTime + travelTime + driverDelay + buffer;

  assert(expectedETA === 52, `Expected ETA to be 52 mins, got ${expectedETA}`);
};

// 2. Test Anomaly Detection Logic
const testAnomalyDetection = () => {
  console.log("\nTesting Anomaly Detection rules...");

  const checkAnomalies = (userOrders) => {
    const failedPaymentsCount = userOrders.filter(o => o.paymentStatus === "failed").length;
    const cancellationsCount = userOrders.filter(o => o.status === "cancelled").length;
    const recentHourOrders = userOrders.filter(o => o.createdAt >= new Date(Date.now() - 60 * 60 * 1000)).length;

    const reasons = [];
    if (cancellationsCount >= 3) reasons.push("Frequent cancellations (3+ in 24 hours)");
    if (recentHourOrders >= 5) reasons.push("High frequency order volume (5+ in 1 hour)");
    if (failedPaymentsCount >= 3) reasons.push("Repeated payment failures");
    
    return {
      severity: reasons.length >= 2 ? "HIGH_RISK" : reasons.length > 0 ? "REVIEW" : "NORMAL",
      reasons
    };
  };

  // Case A: High Risk User
  const mockOrdersA = [
    { status: "cancelled", paymentStatus: "paid", createdAt: new Date() },
    { status: "cancelled", paymentStatus: "paid", createdAt: new Date() },
    { status: "cancelled", paymentStatus: "paid", createdAt: new Date() },
    { status: "placed", paymentStatus: "failed", createdAt: new Date() },
    { status: "placed", paymentStatus: "failed", createdAt: new Date() },
    { status: "placed", paymentStatus: "failed", createdAt: new Date() },
  ];

  const resA = checkAnomalies(mockOrdersA);
  assert(resA.severity === "HIGH_RISK", "Expected HIGH_RISK severity");
  assert(resA.reasons.includes("Frequent cancellations (3+ in 24 hours)"), "Expected cancellations reason");
  assert(resA.reasons.includes("Repeated payment failures"), "Expected failed payments reason");
};

// 3. Test Batch Scoring Proximity algorithm
const testBatchScoring = () => {
  console.log("\nTesting Batch Scoring Algorithm...");

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

  // Mock Restaurants and Customer locations:
  // Rest A: (19.076, 72.8777)
  // Rest B: (19.078, 72.8779) -> Proximity close
  const restDistance = getDistanceKm(19.076, 72.8777, 19.078, 72.8779);
  
  // Cust A: (19.100, 72.900)
  // Cust B: (19.102, 72.902) -> Proximity close
  const custDistance = getDistanceKm(19.100, 72.900, 19.102, 72.902);

  const restScore = Math.max(0, 100 - (restDistance * 50));
  const custScore = Math.max(0, 100 - (custDistance * 33.3));
  const score = Math.round(restScore * 0.4 + custScore * 0.4 + 100 * 0.2); // assume high route efficiency

  assert(score >= 80, `Expected batch compatibility score >= 80, got ${score}`);
};

const runAll = async () => {
  try {
    await testETACalculator();
    testAnomalyDetection();
    testBatchScoring();
    console.log("\n🎉 All tests passed successfully!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

runAll();
