import mongoose from "mongoose";
const RefundCacheSchema = new mongoose.Schema({
    refundId: { type: Number, required: true, unique: true },
    orderId: { type: Number, required: true },
    refundCreatedAt: { type: Date, required: true },
    orderCreatedAt: { type: Date, required: true },
    productReturn :  {type: Number},
    totalReturn : {type: Number},
    rawData : {type: Object},
    brandId : {type: mongoose.Schema.Types.ObjectId, ref: 'Brand',required: true },
}, { timestamps: true }); 

RefundCacheSchema.index({ brandId: 1, orderId: 1 });
RefundCacheSchema.index({ brandId: 1, refundCreatedAt: 1 });
RefundCacheSchema.index({ brandId: 1, orderCreatedAt: 1 });

const RefundCache = mongoose.model('RefundCache', RefundCacheSchema);

export default RefundCache;

    