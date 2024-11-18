import mongoose from "mongoose";

const brandPerformanceSchema = new mongoose.Schema({
    brandId: { type: String, required: true, unique: true },
    name: { type: String, required: true},
    source: { type: String, required: true },
    targetAmount: { type: String, required: true },
    targetDate: { type: Date, required: true },
    achievedSales: { type: String},
});

export default mongoose.model("BrandPerformance", brandPerformanceSchema);
