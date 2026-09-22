import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://arifahmed:arif7860@cluster0.nvu1g7y.mongodb.net/Zomato_Clone?appName=Cluster0";

async function seed() {
  console.log("Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI, { dbName: "Zomato_Clone" });
  const db = mongoose.connection.db;

  const restaurants = await db.collection("restaurants").find({}).toArray();
  const restMap = {};
  restaurants.forEach((r) => {
    restMap[r.name.toLowerCase()] = r._id;
  });

  const afganId = restMap["afgan biryani"] || restMap["biryani darbar"] || restaurants[0]._id;
  const darbarId = restMap["biryani darbar"] || afganId;
  const burgerId = restMap["burger bistro"] || restaurants[0]._id;
  const pizzaId = restMap["pizzeria bella"] || restaurants[0]._id;
  const curryId = restMap["the curry house"] || restaurants[0]._id;

  const newDishes = [
    // Biryani dishes
    {
      name: "Chicken Dum Biryani",
      restaurantId: afganId,
      description: "Slow-cooked aromatic basmati rice layered with tender spiced chicken pieces, saffron, and mint.",
      price: 249,
      category: "Biryani",
      isSpicy: true,
      isVegetarian: false,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Hyderabadi Chicken Biryani",
      restaurantId: darbarId,
      description: "Authentic spicy Hyderabadi biryani cooked with marinated chicken, aromatic spices, and fried onions.",
      price: 279,
      category: "Biryani",
      isSpicy: true,
      isVegetarian: false,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Kolkata Chicken Biryani",
      restaurantId: afganId,
      description: "Fragrant light Kolkata style chicken biryani served with spiced potato and boiled egg.",
      price: 229,
      category: "Biryani",
      isSpicy: false,
      isVegetarian: false,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Royal Mutton Biryani",
      restaurantId: darbarId,
      description: "Tender pieces of succulent mutton slow cooked in a rich blend of traditional spices and long basmati rice.",
      price: 349,
      category: "Biryani",
      isSpicy: true,
      isVegetarian: false,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Special Veg Dum Biryani",
      restaurantId: darbarId,
      description: "Aromatic basmati rice layered with garden-fresh vegetables, paneer cubes, and fragrant spices.",
      price: 199,
      category: "Biryani",
      isSpicy: false,
      isVegetarian: true,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70",
    },

    // Burger & Snacks
    {
      name: "Aloo Tikki Burger",
      restaurantId: burgerId,
      description: "Crispy spiced golden potato patty topped with tangy mint mayo and fresh lettuce in a toasted sesame bun.",
      price: 119,
      category: "Burger",
      isSpicy: false,
      isVegetarian: true,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Spicy Crispy Chicken Burger",
      restaurantId: burgerId,
      description: "Golden fried crispy chicken breast fillet with fiery peri-peri sauce, spicy pickles, and jalapenos.",
      price: 269,
      category: "Burger",
      isSpicy: true,
      isVegetarian: false,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Chilled Coca-Cola (300ml)",
      restaurantId: burgerId,
      description: "Refreshing chilled can of classic Coca-Cola.",
      price: 45,
      category: "Beverages",
      isSpicy: false,
      isVegetarian: true,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=70",
    },

    // Pizza dishes
    {
      name: "Farmhouse Fresh Veggie Pizza",
      restaurantId: pizzaId,
      description: "Crisp capsicum, golden sweet corn, button mushrooms, and ripe tomatoes over 100% mozzarella cheese.",
      price: 389,
      category: "Pizza",
      isSpicy: false,
      isVegetarian: true,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Fiery Peri-Peri Chicken Pizza",
      restaurantId: pizzaId,
      description: "Loaded with spicy peri-peri grilled chicken chunks, red paprika, and melted stringy cheese.",
      price: 429,
      category: "Pizza",
      isSpicy: true,
      isVegetarian: false,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=70",
    },

    // North Indian & Vegetarian
    {
      name: "Paneer Butter Masala & Roti Combo",
      restaurantId: curryId,
      description: "Rich velvety cottage cheese gravy simmered with butter and spices, served with 2 warm tandoori rotis.",
      price: 199,
      category: "North Indian",
      isSpicy: false,
      isVegetarian: true,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=70",
    },
    {
      name: "Spicy Chicken Tikka Masala",
      restaurantId: curryId,
      description: "Smoked succulent chicken tikka simmered in a fiery aromatic tomato-onion masala gravy.",
      price: 249,
      category: "North Indian",
      isSpicy: true,
      isVegetarian: false,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=70",
    },
  ];

  for (const dish of newDishes) {
    const existing = await db.collection("menuitems").findOne({ name: dish.name });
    if (existing) {
      await db.collection("menuitems").updateOne(
        { _id: existing._id },
        { $set: dish }
      );
      console.log(`Updated: ${dish.name}`);
    } else {
      await db.collection("menuitems").insertOne({
        ...dish,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Inserted: ${dish.name} (₹${dish.price})`);
    }
  }

  // Ensure restaurants are open & verified
  await db.collection("restaurants").updateMany(
    {},
    { $set: { isOpen: true, isVerified: true } }
  );

  console.log("Seeding completed successfully!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
