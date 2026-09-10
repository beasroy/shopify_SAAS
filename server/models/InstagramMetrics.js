import mongoose from 'mongoose';

const instagramMetricsSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    date: { type: Date, required: true },

    // Instagram Organic Metrics
    followers: { type: Number, default: 0 },
    content_published: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    profile_views: { type: Number, default: 0 },
    website_clicks: { type: Number, default: 0 },
    profile_links_taps: { type: Number, default: 0 },
    link_clicks: { type: Number, default: 0 },
    engagements: { type: Number, default: 0 },
    accounts_engaged: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    followers_gained: { type: Number, default: 0 },
    unfollows: { type: Number, default: 0 },
    net_follower_growth: { type: Number, default: 0 },
    engagement_rate: { type: Number, default: 0 }
}, { timestamps: true });

// Prevent duplicate rows per brand per day
instagramMetricsSchema.index({ brandId: 1, date: 1 }, { unique: true });

const InstagramMetrics = mongoose.model('InstagramMetrics', instagramMetricsSchema);

export default InstagramMetrics;
