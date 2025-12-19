import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
    index: true
  },
  shopifyCustomerId: {
    type: String,
    required: true,
    index: true
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: '',
    index: true
  },
  phone: {
    type: String,
    default: ''
  },
  addressLine1: {
    type: String,
    default: ''
  },
  addressLine2: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  pin: {
    type: String,
    default: ''
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  // Store the default address ID from Shopify for reference
  defaultAddressId: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index to ensure unique customer per brand
customerSchema.index({ brandId: 1, shopifyCustomerId: 1 }, { unique: true });

// Index for searching by email within a brand
customerSchema.index({ brandId: 1, email: 1 });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
