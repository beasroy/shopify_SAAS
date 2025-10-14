import mongoose from 'mongoose';

const ShopifyOrderSchema = new mongoose.Schema({
  shopify_order_id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  brand_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Brand', 
    required: true,
    index: true
  },
  
  // Core fields
  order_date: { type: String, required: true, index: true }, // YYYY-MM-DD
  total_price: { type: Number, required: true },
  is_cancelled: { type: Boolean, default: false },
  refund_amount: { type: Number, default: 0 }
}, { 
  timestamps: true 
});

// Compound index for efficient queries
ShopifyOrderSchema.index({ brand_id: 1, order_date: 1 });

const ShopifyOrder = mongoose.model('ShopifyOrder', ShopifyOrderSchema);

export default ShopifyOrder;

