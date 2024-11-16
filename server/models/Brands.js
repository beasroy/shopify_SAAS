import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true 
  },
  logoUrl: String,
  fbAdAccounts: [{
    type: String, 
  }],
  googleAdAccount: {
    type: String, 
  },
  ga4Account: {
    PropertyID:{
      type: String,
    }
  },
  shopifyAccount: {
    shopName: {
      type: String,
    },
    shopifyAccessToken: {
      type: String,
    }
  },
}, {
  timestamps: true 
});

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;
