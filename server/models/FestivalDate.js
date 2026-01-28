import mongoose from 'mongoose';

const festivalDateSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
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
  isRecurring: {
    type: Boolean,
    default: false
  },
  // For recurring festivals, store the pattern (e.g., "annually", "monthly")
  recurrencePattern: {
    type: String,
    enum: ['annually', 'monthly', 'weekly', null],
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure unique festival dates per brand
festivalDateSchema.index({ brandId: 1, date: 1 }, { unique: true });

// Index for efficient date range queries
festivalDateSchema.index({ brandId: 1, date: 1 });

const FestivalDate = mongoose.model('FestivalDate', festivalDateSchema);

export default FestivalDate;

