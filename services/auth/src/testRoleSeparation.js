console.log("🏃 Running Role-Separated Authentication Tests...\n");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ Test Failed: ${message}`);
  }
  console.log(`✅ Test Passed: ${message}`);
};

const normalizeRole = (role) => {
  if (!role) return null;
  const r = role.toLowerCase().trim();
  if (r === "restaurant" || r === "seller") return "seller";
  if (r === "rider") return "rider";
  if (r === "customer") return "customer";
  return null;
};

const getRoleDisplayName = (r) => {
  if (r === "seller" || r === "restaurant") return "Restaurant";
  if (r === "rider") return "Rider";
  return "Customer";
};

const evaluateRoleLogin = (userRole, requestedRole) => {
  const targetRole = normalizeRole(requestedRole);
  if (!userRole && targetRole) {
    return { success: true, role: targetRole };
  }
  if (targetRole && userRole !== targetRole && userRole !== "admin") {
    return {
      success: false,
      error: `Account role mismatch: This account is registered as a ${getRoleDisplayName(userRole)}, not a ${getRoleDisplayName(targetRole)}. Please switch to the ${getRoleDisplayName(userRole)} tab.`,
    };
  }
  return { success: true, role: userRole };
};

// 1. Customer cannot log into Restaurant tab
const test1 = evaluateRoleLogin("customer", "restaurant");
assert(test1.success === false, "Customer rejected from Restaurant login tab");
assert(test1.error.includes("registered as a Customer"), "Error mentions Customer registration");

// 2. Customer cannot log into Rider tab
const test2 = evaluateRoleLogin("customer", "rider");
assert(test2.success === false, "Customer rejected from Rider login tab");

// 3. Restaurant owner cannot log into Customer tab
const test3 = evaluateRoleLogin("seller", "customer");
assert(test3.success === false, "Restaurant owner rejected from Customer login tab");

// 4. Rider cannot log into Restaurant tab
const test4 = evaluateRoleLogin("rider", "restaurant");
assert(test4.success === false, "Rider rejected from Restaurant login tab");

// 5. Matching roles succeed
const test5 = evaluateRoleLogin("customer", "customer");
assert(test5.success === true, "Customer succeeds on Customer tab");

const test6 = evaluateRoleLogin("seller", "restaurant");
assert(test6.success === true, "Restaurant owner succeeds on Restaurant tab");

const test7 = evaluateRoleLogin("rider", "rider");
assert(test7.success === true, "Rider succeeds on Rider tab");

// 6. Admin can authenticate under any tab
const test8 = evaluateRoleLogin("admin", "restaurant");
assert(test8.success === true, "Admin allowed on Restaurant tab");

console.log("\n🎉 All Role-Separation Authentication Tests Passed Successfully!");
