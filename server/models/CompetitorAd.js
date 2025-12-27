import mongoose from 'mongoose';

const competitorAdSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
    index: true
  },
  competitorBrandName: {
    type: String,
    required: true,
    index: true
  },
  adId: {
    type: String,
    required: true,
    index: true
  },
  snapUrl: {
    type: String, // URL to the ad creative/image
    default: ''
  },
  adName: {
    type: String,
    default: ''
  },
  adStatus: {
    type: String,
    default: ''
  },
  // Store the date when the ad was first seen/launched (from Meta API)
  adCreatedTime: {
    type: Date,
    index: true
  },
  // Store when we last fetched/updated this ad
  lastFetchedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Additional metadata from Meta API
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index to ensure unique ads per brand and competitor
// This prevents duplicate ads from being stored
competitorAdSchema.index({ brandId: 1, competitorBrandName: 1, adId: 1 }, { unique: true });

// Index for efficient querying by brand and sorting by newest
competitorAdSchema.index({ brandId: 1, adCreatedTime: -1 });
competitorAdSchema.index({ brandId: 1, competitorBrandName: 1, adCreatedTime: -1 });

const CompetitorAd = mongoose.model('CompetitorAd', competitorAdSchema);

export default CompetitorAd;


