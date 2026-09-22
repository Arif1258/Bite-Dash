/**
 * BiteDash Demo Accounts Provisioning & Reset Script
 *
 * Configures the 4 required role-specific demo accounts:
 * 1. Customer:   customer@gmail.com   / Arif@12588 (role: customer)
 * 2. Rider:      rider@gmail.com      / Arif@12588 (role: rider)
 * 3. Restaurant: restaurant@gmail.com / Arif@12588 (role: seller)
 * 4. Admin:      admin@gmail.com      / Arif@12588 (role: admin)
 *
 * Uses existing scrypt password hashing and preserves role-based authorization.
 * If accounts already exist, updates/resets credentials rather than creating duplicates.
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../model/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://arifahmed:arif7860@cluster0.nvu1g7y.mongodb.net/tomato?appName=Cluster0";
const DB_NAME = "Zomato_Clone";
const COMMON_PASSWORD = "Arif@12588";

const DEMO_ACCOUNTS = [
  {
    email: "customer@gmail.com",
    name: "Demo Customer",
    role: "customer",
    displayRole: "Customer",
  },
  {
    email: "rider@gmail.com",
    name: "Demo Rider",
    role: "rider",
    displayRole: "Rider",
  },
  {
    email: "restaurant@gmail.com",
    name: "Demo Restaurant Partner",
    role: "seller", // 'seller' represents Restaurant in BiteDash
    displayRole: "Restaurant",
  },
  {
    email: "admin@gmail.com",
    name: "Demo Administrator",
    role: "admin",
    displayRole: "Admin",
  },
];

async function provisionAccounts() {
  console.log("Connecting to MongoDB:", DB_NAME);
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const passwordHash = await hashPassword(COMMON_PASSWORD);

  console.log("\n--- PROVISIONING & RESETTING DEMO ACCOUNTS ---");

  for (const acc of DEMO_ACCOUNTS) {
    let user = await User.findOne({ email: acc.email }).select("+passwordHash");

    if (user) {
      user.name = acc.name;
      user.role = acc.role;
      user.passwordHash = passwordHash;
      await user.save();
      console.log(`✅ Updated existing account: ${acc.email} (${acc.displayRole} -> role: ${acc.role})`);
    } else {
      user = await User.create({
        name: acc.name,
        email: acc.email,
        passwordHash,
        role: acc.role,
      });
      console.log(`✨ Created new account: ${acc.email} (${acc.displayRole} -> role: ${acc.role})`);
    }

    // Verify password hash
    const isValid = await verifyPassword(COMMON_PASSWORD, user.passwordHash);
    if (!isValid) {
      throw new Error(`Password verification failed for ${acc.email}`);
    }

    // Role-specific profile initialization
    if (acc.role === "seller") {
      // Ensure restaurant record exists for this owner
      const restaurantCollection = db.collection("restaurants");
      let restaurant = await restaurantCollection.findOne({ ownerId: user._id.toString() });
      if (!restaurant) {
        restaurant = await restaurantCollection.findOne({ ownerId: user._id });
      }

      if (!restaurant) {
        const newRest = await restaurantCollection.insertOne({
          name: "BiteDash Gourmet Bistro",
          description: "Chef-crafted gourmet burgers, artisanal pizzas, and refreshing shakes.",
          image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
          ownerId: user._id.toString(),
          phone: 9876543210,
          isVerified: true,
          isOpen: true,
          activeOrdersCount: 2,
          averagePrepTime: 20,
          reliabilityScore: 98,
          totalOrdersCount: 154,
          cancellationCount: 1,
          autoLocation: {
            type: "Point",
            coordinates: [72.8777, 19.0760],
            formattedAddress: "Bandra Kurla Complex, Mumbai, Maharashtra 400051",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`   🍽️ Created partner restaurant profile for ${acc.email}: "BiteDash Gourmet Bistro"`);

        // Seed sample menu items for this restaurant if none exist
        const menuCollection = db.collection("menuitems");
        const existingItems = await menuCollection.countDocuments({ restaurantId: newRest.insertedId });
        if (existingItems === 0) {
          await menuCollection.insertMany([
            {
              restaurantId: newRest.insertedId,
              name: "Signature Truffle Burger",
              description: "Artisanal brioche bun, double smoked patty, black truffle aioli, aged cheddar.",
              price: 299,
              image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              restaurantId: newRest.insertedId,
              name: "Crispy Farmhouse Fries",
              description: "Hand-cut golden fries dusted with Himalayan herbs and parmesan.",
              price: 149,
              image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80",
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              restaurantId: newRest.insertedId,
              name: "Smoked BBQ Wings",
              description: "Tender chicken wings glazed in slow-cooked hickory BBQ sauce.",
              price: 249,
              image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80",
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]);
          console.log(`   🍔 Seeded 3 signature dishes for "BiteDash Gourmet Bistro"`);
        }
      } else {
        console.log(`   🍽️ Existing restaurant found for ${acc.email}: "${restaurant.name}"`);
      }
    }

    if (acc.role === "rider") {
      // Ensure rider profile exists
      const ridersCollection = db.collection("riders");
      let riderProfile = await ridersCollection.findOne({ userId: user._id.toString() });

      if (!riderProfile) {
        await ridersCollection.insertOne({
          userId: user._id.toString(),
          picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          phoneNumber: "9876500001",
          aadharNumber: "123456789012",
          drivingLicenseNumber: "MH012024000888",
          isVerified: true,
          isAvailble: true,
          reliabilityScore: 98,
          completedDeliveries: 42,
          cancelledDeliveries: 0,
          onTimeDeliveries: 41,
          location: {
            type: "Point",
            coordinates: [72.8777, 19.0760],
          },
          lastActiveAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`   🛵 Created rider partner profile for ${acc.email} (Status: Available & Verified)`);
      } else {
        await ridersCollection.updateOne(
          { userId: user._id.toString() },
          { $set: { isVerified: true, isAvailble: true, updatedAt: new Date() } }
        );
        console.log(`   🛵 Verified & activated existing rider profile for ${acc.email}`);
      }
    }

    if (acc.role === "customer") {
      // Ensure customer has a saved address for seamless order testing
      const addressCollection = db.collection("addresses");
      const existingAddr = await addressCollection.findOne({ userId: user._id.toString() });

      if (!existingAddr) {
        await addressCollection.insertOne({
          userId: user._id.toString(),
          mobile: 9876543210,
          formattedAddress: "Flat 402, Sea Breeze Residency, Bandra West, Mumbai 400050",
          location: {
            type: "Point",
            coordinates: [72.8777, 19.0760],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`   📍 Created saved delivery address for ${acc.email}`);
      }
    }
  }

  console.log("\n🎉 All 4 BiteDash Demo Accounts successfully provisioned with password 'Arif@12588'!");
  await mongoose.disconnect();
}

provisionAccounts().catch((err) => {
  console.error("❌ Provisioning failed:", err);
  process.exit(1);
});
