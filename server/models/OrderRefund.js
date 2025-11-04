import mongoose from "mongoose";

/**
 * OrderRefund Model
 * Stores aggregated refund amounts per order, keyed by order creation date
 * This allows us to subtract refunds from the order's original creation date
 * rather than the refund date
 */
const OrderRefundSchema = new mongoose.Schema({
    orderId: { 
        type: Number, 
        required: true,
        index: true 
    },
    orderCreatedAt: { 
        type: Date, 
        required: true,
        index: true 
    },
    brandId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Brand', 
        required: true,
        index: true 
    },
    refundAmount: { 
        type: Number, 
        default: 0,
        required: true 
    },
    refundCount: { 
        type: Number, 
        default: 0,
        required: true 
    },
    lastRefundAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true 
}); 

// Compound index for efficient queries by brand and order date
OrderRefundSchema.index({ brandId: 1, orderCreatedAt: 1 });
// Unique index to prevent duplicate entries per order
OrderRefundSchema.index({ brandId: 1, orderId: 1 }, { unique: true });

const OrderRefund = mongoose.model('OrderRefund', OrderRefundSchema);

export default OrderRefund;

