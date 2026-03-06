import mongoose from 'mongoose';

const PageSpeedSchema = new mongoose.Schema({
    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
        index: true
    },

    path: {
        type: String,
        required: true
    },

    fullUrl: {
        type: String,
        required: true
    },

    pageTitle: String,
    page: {
        type: String,
        required: true
    },
    perfScore: Number,
    fcp: String,
    lcp: String,
    tbt: String,
    cls: String,

    lastUpdated: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

PageSpeedSchema.index({ brandId: 1, path: 1 }, { unique: true });

const PageSpeedInsight = mongoose.model('PageSpeedInsight', PageSpeedSchema);

export default PageSpeedInsight;