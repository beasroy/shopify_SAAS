import mongoose from "mongoose";

const brandPerformanceSchema = new mongoose.Schema({
    brandId: { type: String, required: true, unique: true },
    name: { type: String, required: true},
    source: { type: String, required: true },
    targetSales: { type: Number, required: true },
    targetSpend: { type: Number, required: true },
    targetROAS: { type: Number, required: true },
    targetDate: { type: Date, required: true },
    achievedSpent: { type: Number},
    achievedSales: { type: Number},
    achievedROAS: { type: Number},
});

export default mongoose.model("BrandPerformance", brandPerformanceSchema);
