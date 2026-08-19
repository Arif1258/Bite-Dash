import mongoose, { Schema } from "mongoose";

const SurplusInventorySchema = new Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    originalPrice: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Automatically delete when expired
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("SurplusInventory", SurplusInventorySchema);
