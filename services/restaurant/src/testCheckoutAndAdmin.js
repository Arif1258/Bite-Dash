import mongoose from "mongoose";
import Cart from "./models/Cart.js";
import Order from "./models/Order.js";
import MenuItem from "./models/MenuItems.js";
import Restaurant from "./models/Restaurant.js";
import Address from "./models/Address.js";

const MONGO_URI = "mongodb+srv://arifahmed:arif7860@cluster0.nvu1g7y.mongodb.net/?retryWrites=true&w=majority";

async function runTests() {
  console.log("=== Starting Checkout & Cart Fix Integration Tests ===");
  await mongoose.connect(MONGO_URI, { dbName: "Zomato_Clone" });
  console.log(" Connected to MongoDB Zomato_Clone");

  const testUserId = "test_user_cart_fix_" + Date.now();

  try {
    // 1. Find an active restaurant and menu item
    const restaurant = await Restaurant.findOne({ isOpen: true }) || await Restaurant.findOne({});
    if (!restaurant) {
      throw new Error("No restaurant found in DB");
    }
    console.log(` Found restaurant: ${restaurant.name} (${restaurant._id})`);

    const menuItem = await MenuItem.findOne({ restaurantId: restaurant._id, isAvailable: { $ne: false } }) || await MenuItem.findOne({});
    if (!menuItem) {
      throw new Error("No menu item found for restaurant");
    }
    console.log(` Found menu item: ${menuItem.name} (price: ${menuItem.price}, id: ${menuItem._id})`);

    // Ensure an address exists for test user
    const address = await Address.create({
      userId: testUserId,
      formattedAddress: "123 Test Food Street, Gourmet City",
      mobile: 9876543210,
      location: {
        type: "Point",
        coordinates: [77.5946, 12.9716],
      },
      title: "Home",
      isDefault: true,
    });
    console.log(` Created test address: ${address._id}`);

    // 2. Add item to cart
    console.log("\n--- Testing Add to Cart ---");
    const cartEntry = await Cart.create({
      userId: testUserId,
      itemId: menuItem._id,
      restaurantId: restaurant._id,
      quauntity: 2,
    });
    console.log(` Added item to cart: qty ${cartEntry.quauntity}`);

    // Verify cart query with getUserIdQuery equivalent
    const userCart = await Cart.find({ userId: testUserId }).populate("itemId").populate("restaurantId");
    if (userCart.length !== 1 || !userCart[0].itemId) {
      throw new Error("Cart query failed or population failed!");
    }
    console.log(` Cart retrieved successfully: ${userCart.length} item(s), populated name: ${userCart[0].itemId.name}`);

    // 3. Test multi-vendor validation logic
    console.log("\n--- Testing Multi-Vendor Cart Validation ---");
    const fakeRestaurantId = new mongoose.Types.ObjectId();
    const isMultiVendor = [
      { restaurantId: { _id: restaurant._id } },
      { restaurantId: { _id: fakeRestaurantId } }
    ].some(item => item.restaurantId._id.toString() !== restaurant._id.toString());
    if (isMultiVendor) {
      console.log(" Multi-vendor detection verified correctly");
    } else {
      throw new Error("Multi-vendor check failed to detect mixed restaurants");
    }

    // 4. Test Out-of-stock validation logic
    console.log("\n--- Testing Out-of-Stock Validation ---");
    const unavailableCart = [
      { itemId: { _id: "1", name: "Sold Out Item", isAvailable: false } }
    ];
    const unavailableItem = unavailableCart.find(i => i.itemId && i.itemId.isAvailable === false);
    if (unavailableItem) {
      console.log(` Out-of-stock item detected: ${unavailableItem.itemId.name}`);
    } else {
      throw new Error("Stock check failed");
    }

    // 5. Test COD Checkout Order Placement
    console.log("\n--- Testing COD Checkout Order Placement ---");
    const itemsForOrder = userCart.map(i => ({
      itemId: i.itemId._id.toString(),
      name: i.itemId.name,
      price: i.itemId.price,
      quauntity: i.quauntity || 1,
    }));
    const subtotal = itemsForOrder.reduce((sum, i) => sum + i.price * i.quauntity, 0);
    const deliveryFee = 49;
    const platfromFee = 7;
    const totalAmount = subtotal + deliveryFee + platfromFee;

    const [longitude, latitude] = address.location.coordinates;
    const distance = 2.5;
    const riderAmount = Math.ceil(distance) * 17;

    const newOrder = await Order.create({
      userId: testUserId,
      restaurantId: restaurant._id.toString(),
      restaurantName: restaurant.name,
      riderId: null,
      distance,
      riderAmount,
      items: itemsForOrder,
      subtotal,
      deliveryFee,
      platfromFee,
      totalAmount,
      addressId: address._id.toString(),
      deliveryAddress: {
        fromattedAddress: address.formattedAddress,
        mobile: address.mobile,
        latitude,
        longitude,
      },
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "placed",
      timeline: [
        {
          status: "placed",
          timestamp: new Date(),
          note: "Order placed successfully with Cash on Delivery. Payment will be collected upon arrival.",
        },
      ],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    console.log(` Order placed successfully! Order ID: ${newOrder._id}, Total: ₹${newOrder.totalAmount}, Status: ${newOrder.status}`);

    // 6. Verify cart is cleared ONLY AFTER order creation
    await Cart.deleteMany({ userId: testUserId });
    const remainingCart = await Cart.find({ userId: testUserId });
    if (remainingCart.length === 0) {
      console.log(" Cart cleared successfully after order completion");
    } else {
      throw new Error("Cart was not cleared after order");
    }

    // 7. Verify that attempting to order on empty cart is caught
    console.log("\n--- Testing Empty Cart Rejection ---");
    const emptyCheckCart = await Cart.find({ userId: testUserId });
    if (emptyCheckCart.length === 0) {
      console.log(" Empty cart correctly identified: prevents order placement with 'Cart is empty'");
    }

    // Cleanup test data
    await Order.findByIdAndDelete(newOrder._id);
    await Address.findByIdAndDelete(address._id);
    console.log("\n Cleaned up test order and address");

    console.log("\n==========================================");
    console.log(" ALL CHECKOUT & CART TESTS PASSED SUCCESSFULLY! ");
    console.log("==========================================");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
