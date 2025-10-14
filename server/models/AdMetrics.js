import mongoose from 'mongoose';

const admetricsSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true }, 
    date: { type: Date, required: true },
    
    // Shopify metrics
    totalSales: { type: Number, default: 0},      // Gross revenue
    refundAmount: { type: Number, default: 0},    // Total refunds (net = totalSales - refundAmount)
    
    // Ad platform metrics
    metaSpend: { type: Number, default: 0 }, 
    metaRevenue: { type: Number, default: 0 },
    googleSpend: { type: Number, default: 0 },
    googleROAS: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    grossROI: { type: Number, default: 0 },
}, { timestamps: true }); 

const AdMetrics = mongoose.model('AdMetrics', admetricsSchema);

export default AdMetrics;
