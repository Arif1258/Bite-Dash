import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    image: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
    },

    autoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      formattedAddress: {
        type: String,
      },
    },

    isOpen: {
      type: Boolean,
      default: false,
    },
    activeOrdersCount: {
      type: Number,
      default: 0,
    },
    averagePrepTime: {
      type: Number,
      default: 20,
    },
    reliabilityScore: {
      type: Number,
      default: 95,
    },
    cancellationCount: {
      type: Number,
      default: 0,
    },
    totalOrdersCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ autoLocation: "2dsphere" });
schema.index({ ownerId: 1 });
schema.index({ isVerified: 1, isOpen: 1 });

export default mongoose.model("Restaurant", schema);
