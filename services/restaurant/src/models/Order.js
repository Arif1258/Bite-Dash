import mongoose, { Schema } from "mongoose";

const OrderSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    restaurantId: {
      type: String,
      required: true,
    },
    restaurantName: {
      type: String,
      required: true,
    },
    riderId: {
      type: String,
      default: null,
    },
    riderName: {
      type: String,
      default: null,
    },
    riderPhone: {
      type: Number,
      default: null,
    },
    riderAmount: {
      type: Number,
      required: true,
    },
    distance: {
      type: Number,
      required: true,
    },

    items: [
      {
        itemId: String,
        name: String,
        price: Number,
        quauntity: Number,
      },
    ],

    subtotal: Number,
    deliveryFee: Number,
    platfromFee: Number,
    totalAmount: Number,

    addressId: {
      type: String,
      required: true,
    },

    deliveryAddress: {
      fromattedAddress: { type: String, required: true },
      mobile: { type: Number, required: true },
      latitude: Number,
      longitude: Number,
    },

    status: {
      type: String,
      enum: [
        "placed",
        "accepted",
        "preparing",
        "ready_for_rider",
        "rider_assigned",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },

    paymentMethod: {
      type: String,
      enum: ["razorpay", "stripe", "cod"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentProviderOrderId: {
      type: String,
      default: null,
    },
    paymentId: {
      type: String,
      default: null,
    },

    anomalyStatus: {
      type: String,
      enum: ["NORMAL", "REVIEW", "HIGH_RISK"],
      default: "NORMAL",
    },
    anomalyReasons: {
      type: [String],
      default: [],
    },

    isBatched: {
      type: Boolean,
      default: false,
    },
    batchedWith: {
      type: String,
      default: null,
    },
    batchId: {
      type: String,
      default: null,
    },

    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  },
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, createdAt: -1 });
OrderSchema.index({ riderId: 1, status: 1 });
OrderSchema.index({ status: 1 });

export default mongoose.model("Order", OrderSchema);
