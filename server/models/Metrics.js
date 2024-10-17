import mongoose from 'mongoose';

const metricsSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true }, // Reference to Brand
    date: { type: Date, required: true },
    metaSpend: { type: Number, default: 0 }, 
    metaSales: { type: Number, default: 0 },
    metaROAS: { type: Number, default: 0 },
    googleSpend: { type: Number, default: 0 },
    googleSales: { type: Number, default: 0 },
    googleROAS: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    grossROI: { type: Number, default: 0 },
    shopifySales: { type: Number, default: 0 },
    netROI: { type: Number, default: 0 },
}, { timestamps: true }); 

const Metrics = mongoose.model('Metrics', metricsSchema);

export default Metrics;
