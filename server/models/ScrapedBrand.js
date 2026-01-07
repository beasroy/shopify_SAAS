import mongoose from 'mongoose';

const scrapedBrandSchema = new mongoose.Schema({
  pageId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    index: true
  },
  pageName: {
    type: String,
    sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
  },
  pageUrl: {
    type: String,
    unique: true,
    required: true
  },
}, {
  timestamps: true
});

const ScrapedBrand = mongoose.model('ScrapedBrand', scrapedBrandSchema);

export default ScrapedBrand;


