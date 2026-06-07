import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://arifahmed:arif7860@cluster0.nvu1g7y.mongodb.net/tomato?appName=Cluster0";

// Define inline Schemas so we don't have dependency resolution issues with relative TS imports
const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  image: { type: String, required: true },
  ownerId: { type: String, required: true },
  phone: { type: Number, required: true },
  isVerified: { type: Boolean, required: true },
  autoLocation: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
    formattedAddress: String,
  },
  isOpen: { type: Boolean, default: false }
}, { timestamps: true });

RestaurantSchema.index({ autoLocation: "2dsphere" });
const Restaurant = mongoose.model("Restaurant", RestaurantSchema);

const MenuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  image: { type: String, required: true },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const MenuItem = mongoose.model("MenuItem", MenuItemSchema);

const dummyOwnerId = "60d5ec49866c1b3c9c991234";

const mockRestaurants = [
  {
    name: "Burger Bistro",
    description: "Gourmet artisanal burgers, hand-cut fries, and craft milkshakes.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    ownerId: dummyOwnerId,
    phone: 9876543210,
    isVerified: true,
    isOpen: true,
    autoLocation: {
      type: "Point",
      coordinates: [72.8777, 19.0760], // Mumbai Central
      formattedAddress: "Mumbai Central, Mumbai, Maharashtra 400008, India"
    }
  },
  {
    name: "Pizzeria Bella",
    description: "Woodfired Neapolitan pizzas made with fresh mozzarella and local ingredients.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    ownerId: dummyOwnerId,
    phone: 9876543211,
    isVerified: true,
    isOpen: true,
    autoLocation: {
      type: "Point",
      coordinates: [72.8790, 19.0780], // Slightly offset but very close
      formattedAddress: "Bandra West, Mumbai, Maharashtra 400050, India"
    }
  },
  {
    name: "Sub Delight",
    description: "Freshly baked bread sandwiches, wraps, and healthy salads.",
    image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    ownerId: dummyOwnerId,
    phone: 9876543212,
    isVerified: true,
    isOpen: true,
    autoLocation: {
      type: "Point",
      coordinates: [72.8750, 19.0740], // Close to central
      formattedAddress: "Andheri East, Mumbai, Maharashtra 400069, India"
    }
  },
  {
    name: "Sushi Sakura",
    description: "Premium sushi rolls, sashimi, and classic Japanese ramen.",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80",
    ownerId: dummyOwnerId,
    phone: 9876543213,
    isVerified: true,
    isOpen: true,
    autoLocation: {
      type: "Point",
      coordinates: [72.8810, 19.0800],
      formattedAddress: "Colaba, Mumbai, Maharashtra 400005, India"
    }
  }
];

const mockMenuItems = {
  "Burger Bistro": [
    {
      name: "Classic Cheeseburger",
      description: "Flame-grilled beef patty, melted cheddar, lettuce, tomato, pickles, and our signature sauce.",
      price: 249,
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Truffle Fries",
      description: "Crispy golden fries tossed in white truffle oil, parmesan, and fresh parsley.",
      price: 149,
      image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80"
    }
  ],
  "Pizzeria Bella": [
    {
      name: "Margherita Pizza",
      description: "San Marzano tomatoes, fresh mozzarella, basil leaves, and extra virgin olive oil.",
      price: 349,
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Garlic Bread with Cheese",
      description: "Toasted baguette topped with garlic butter and melted mozzarella.",
      price: 179,
      image: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80"
    }
  ],
  "Sub Delight": [
    {
      name: "Tikka Sub",
      description: "Spicy chicken tikka, lettuce, onions, bell peppers, and mint mayo on freshly baked Italian bread.",
      price: 199,
      image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80"
    }
  ],
  "Sushi Sakura": [
    {
      name: "California Roll",
      description: "Crab sticks, avocado, cucumber, and orange tobiko rolled with sushi rice and nori.",
      price: 499,
      image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Spicy Salmon Sashimi",
      description: "Slices of premium fresh salmon served with a spicy citrus-soy sauce.",
      price: 599,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
    }
  ]
};

async function seed() {
  await mongoose.connect(MONGO_URI, {
    dbName: "Zomato_Clone"
  });
  console.log("Connected to MongoDB.");

  // Clear existing restaurants and menu items to start clean
  await Restaurant.deleteMany({});
  await MenuItem.deleteMany({});
  console.log("Cleared existing restaurant and menu item collections.");

  for (const restData of mockRestaurants) {
    const restaurant = await Restaurant.create(restData);
    console.log(`Created restaurant: ${restaurant.name}`);

    const items = mockMenuItems[restaurant.name];
    if (items) {
      for (const itemData of items) {
        await MenuItem.create({
          ...itemData,
          restaurantId: restaurant._id
        });
        console.log(`  Added menu item: ${itemData.name}`);
      }
    }
  }

  console.log("Database seeding completed successfully!");
  await mongoose.disconnect();
}

seed().catch(console.error);
