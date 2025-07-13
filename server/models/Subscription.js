import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  shopId: {
    type: Number,
    required: true,
    index: true,
    ref: 'Brand'
  },
  chargeId: {
    type: String,
    unique: true,
    sparse: true 
  },
  planName: { 
    type: String, 
    enum: ['Free Plan', 'Startup Plan', 'Growth Plan'],
    default: 'Free Plan'
  },
  price: { 
    type: Number,
    default: 0
  },
  status: { 
    type: String,
    enum: ['active', 'cancelled', 'expired', 'frozen', 'pending'],
    default: 'active'
  },
  billingOn: { type: Date },
  trialEndsOn: { type: Date },
 
}, {
  timestamps: true
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;