import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
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
    totalSales: {
        type: Number,
        default: 0,
    },
    refundAmount: {
        type: Number,
        default: 0,
    },
    refundCount: {
        type: Number,
        default: 0,
    },
    lastRefundAt: {
        type: Date,
        default: Date.now
    },
    city: {
        type: String,
    },
    state: {
        type: String,
    },
}, {
    timestamps: true
});

// Compound index for efficient queries by brand and order date
OrderSchema.index({ brandId: 1, orderCreatedAt: 1 });
// Unique index to prevent duplicate entries per order
OrderSchema.index({ brandId: 1, orderId: 1 }, { unique: true });

const Order = mongoose.model('Order', OrderSchema);

export default Order;

