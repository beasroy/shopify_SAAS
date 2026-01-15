import mongoose from "mongoose";

const d2cCalculatorSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    marketingCosts: { type: Number, required: true },
    otherMarketingCosts: { type: Number, required: true },
    operatingCosts: { type: Number, required: true },
    cogs: { type: Number, required: true, default: 0 },
}, { timestamps: true });

const D2CCalculator = mongoose.model("D2CCalculator", d2cCalculatorSchema);

export default D2CCalculator;