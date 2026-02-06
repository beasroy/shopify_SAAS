import mongoose from 'mongoose';

const festivalDateSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: function() {
      return this.type === 'brand';
    },
    index: true
  },
  type: {
    type: String,
    enum: ['global', 'brand'],
    required: true,
    default: 'brand',
    index: true
  },
  country: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  festivalName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  scope: {
    type: String,
    enum: ['national','other'],
    default: 'national'
  },
}, {
  timestamps: true
});

// Index for efficient queries by country and date
festivalDateSchema.index({ country: 1, date: 1 });

// Sparse index for brand-specific holidays
festivalDateSchema.index({ type: 1, brandId: 1 }, { sparse: true });

// Index for date range queries
festivalDateSchema.index({ date: 1 });

const FestivalDate = mongoose.model('FestivalDate', festivalDateSchema);

export default FestivalDate;

