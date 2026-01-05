import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true 
  },
  fbAdAccounts: [{
    type: String, 
  }],
  googleAdAccount: [
    {clientId: { type: String }, managerId: { type: String }}
  ],
  ga4Account: {
    PropertyID: {
      type: String,
    },
    default: {} 
  },
  shopifyAccount: {
    shopName: {
      type: String,
    },
    shopifyAccessToken: {
      type: String,
    },
    shopId:{
      type: Number
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  googleAdsRefreshToken: { type: String }, 
  googleAnalyticsRefreshToken: { type: String },   
  fbAccessToken: {type: String},
  followedBrands: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScrapedBrand'
  }]
}, {
  timestamps: true 
});

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;