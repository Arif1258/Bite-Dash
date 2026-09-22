import mongoose from "mongoose";
import User from "../model/User.js";
import { hashPassword } from "../utils/password.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://arifahmed:arif7860@cluster0.nvu1g7y.mongodb.net/tomato?appName=Cluster0";
const DB_NAME = "Zomato_Clone";

async function seedAdmin() {
  console.log("Connecting to database:", DB_NAME);
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });

  const adminEmail = "admin@bitedash.com";
  const adminPassword = "AdminPassword123!";
  const passwordHash = await hashPassword(adminPassword);

  let admin = await User.findOne({ email: adminEmail }).select("+passwordHash");

  if (admin) {
    admin.role = "admin";
    admin.name = "Platform Administrator";
    admin.passwordHash = passwordHash;
    await admin.save();
    console.log("Updated existing user to admin:", adminEmail);
  } else {
    admin = await User.create({
      name: "Platform Administrator",
      email: adminEmail,
      passwordHash,
      role: "admin",
    });
    console.log("Created new admin user:", adminEmail);
  }

  console.log("Admin account successfully provisioned!");
  console.log("Email:", adminEmail);
  console.log("Password:", adminPassword);
  console.log("Role:", admin.role);

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
