import mongoose, { Schema } from "mongoose";

const UserPreferenceSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    cuisinePreferences: {
      type: [String],
      default: [],
    },
    preferredPriceRange: {
      type: String,
      enum: ["low", "mid", "high"],
      default: "mid",
    },
    favoriteRestaurants: {
      type: [String],
      default: [],
    },
    favoriteDishes: {
      type: [String],
      default: [],
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    searchTerms: {
      type: [String],
      default: [],
    },
    lastOrderedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("UserPreference", UserPreferenceSchema);
