import mongoose from "mongoose";

const creativeGroupSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    adIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by brandId and name (if needed)
creativeGroupSchema.index({ brandId: 1, name: 1 });

const CreativeGroup = mongoose.model("CreativeGroup", creativeGroupSchema);

export default CreativeGroup;
