import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    mobile: {
      type: Number,
      required: true,
    },
    formattedAddress: {
      type: String,
      required: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ location: "2dsphere" });
schema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Address", schema);
