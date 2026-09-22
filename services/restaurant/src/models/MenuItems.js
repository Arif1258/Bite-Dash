import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    isSpicy: {
      type: Boolean,
      default: false,
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ restaurantId: 1, isAvailable: 1 });
schema.index({ name: "text", description: "text", category: "text" });

export default mongoose.model("MenuItem", schema);
