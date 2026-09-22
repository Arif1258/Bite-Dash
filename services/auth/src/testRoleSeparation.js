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
  if (r === "admin") return "admin";
  return null;
};

const getRoleDisplayName = (r) => {
  if (r === "seller" || r === "restaurant") return "Restaurant";
  if (r === "rider") return "Rider";
  if (r === "admin") return "Admin";
  return "Customer";
};

const evaluateRoleLogin = (userRole, requestedRole) => {
  const targetRole = normalizeRole(requestedRole);
  if (!userRole && targetRole && targetRole !== "admin") {
    return { success: true, role: targetRole };
  }
  if (targetRole === "admin" && userRole !== "admin") {
    return {
      success: false,
      error: "Access denied: This account does not have administrator privileges.",
    };
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

// 5. Customer cannot log into Admin tab
const test5 = evaluateRoleLogin("customer", "admin");
assert(test5.success === false, "Customer rejected from Admin login tab");
assert(test5.error.includes("administrator privileges"), "Error mentions administrator privileges");

// 6. Rider cannot log into Admin tab
const test6 = evaluateRoleLogin("rider", "admin");
assert(test6.success === false, "Rider rejected from Admin login tab");

// 7. Restaurant owner cannot log into Admin tab
const test7 = evaluateRoleLogin("seller", "admin");
assert(test7.success === false, "Restaurant owner rejected from Admin login tab");

// 8. Matching roles succeed
const test8 = evaluateRoleLogin("customer", "customer");
assert(test8.success === true, "Customer succeeds on Customer tab");

const test9 = evaluateRoleLogin("seller", "restaurant");
assert(test9.success === true, "Restaurant owner succeeds on Restaurant tab");

const test10 = evaluateRoleLogin("rider", "rider");
assert(test10.success === true, "Rider succeeds on Rider tab");

const test11 = evaluateRoleLogin("admin", "admin");
assert(test11.success === true, "Admin succeeds on Admin tab");

// 9. Admin can also access other role contexts if needed
const test12 = evaluateRoleLogin("admin", "restaurant");
assert(test12.success === true, "Admin allowed on Restaurant tab");

console.log("\n🎉 All Role-Separation Authentication Tests (Customer, Rider, Restaurant, Admin) Passed Successfully!");

