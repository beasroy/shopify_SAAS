import mongoose from 'mongoose';

const scrapedAdDetailSchema = new mongoose.Schema({
  scrapingBrandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScrapedBrand',
    required: true,
    index: true
  },
  collation_count: {
    type: Number
  },
  collation_id: {
    type: String
  },
  entity_type: {
    type: String
  },
  is_active: {
    type: Boolean
  },
  publisher_platform: [{
    type: String
  }],
  page_name: {
    type: String
  },
  snapshot: {
    body: {
      text: String
    },
    branded_content: {
      type: mongoose.Schema.Types.Mixed
    },
    caption: {
      type: String
    },
    cards: [{
      type: mongoose.Schema.Types.Mixed
    }],
    cta_text: {
      type: String
    },
    cta_type: {
      type: String
    },
    display_format: {
      type: String
    },
    images: [{
      type: mongoose.Schema.Types.Mixed
    }],
    is_reshared: {
      type: Boolean
    },
    link_description: {
      type: String
    },
    link_url: {
      type: String
    },
    title: {
      type: String
    },
    videos: [{
      video_hd_url: String,
      video_preview_image_url: String,
      video_sd_url: String,
      watermarked_video_hd_url: String,
      watermarked_video_sd_url: String
    }],
    additional_info: {
      type: mongoose.Schema.Types.Mixed
    },
    extra_images: [{
      type: mongoose.Schema.Types.Mixed
    }],

  },
  start_date_formatted: {
    type: String
  },
  end_date_formatted: {
    type: String
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
scrapedAdDetailSchema.index({ scrapingBrandId: 1, start_date_formatted: -1 });
scrapedAdDetailSchema.index({ scrapingBrandId: 1, end_date_formatted: -1 });

const ScrapedAdDetail = mongoose.model('ScrapedAdDetail', scrapedAdDetailSchema);

export default ScrapedAdDetail;


