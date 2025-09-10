import mongoose from 'mongoose';

const admetricsSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true }, 
    date: { type: Date, required: true },
    totalSales: { type: Number, default: 0},
    refundAmount: { type: Number, default: 0},
    metaSpend: { type: Number, default: 0 }, 
    metaRevenue: { type: Number, default: 0 },
    googleSpend: { type: Number, default: 0 },
    googleROAS: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    grossROI: { type: Number, default: 0 },
}, { timestamps: true }); 

const AdMetrics = mongoose.model('AdMetrics', admetricsSchema);

export default AdMetrics;
