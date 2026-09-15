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
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Proper MongoDB TTL index — MongoDB will auto-delete documents when expiresAt is reached
SurplusInventorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("SurplusInventory", SurplusInventorySchema);
