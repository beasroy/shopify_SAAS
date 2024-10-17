import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true // Assuming brand names are unique
  },
  fbAdAccounts: [{
    type: String, 
  }],
  googleAdAccount: {
    type: String, 
  },
  ga4Account: {
    type: String, 
  },
  shopifyAccount: {
    type: String, 
  },
}, {
  timestamps: true 
});

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;
