import mongoose from "mongoose";

const CityMetadataSchema = new mongoose.Schema({
    // Lookup key (unique identifier)
    lookupKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Original values
    city: {
        type: String,
        required: true,
        index: true
    },
    state: {
        type: String,
        required: true,
        index: true
    },
    // Normalized for lookup
    cityNormalized: {
        type: String,
        required: true,
        index: true
    },
    // Classifications
    metroStatus: {
        type: String,
        enum: ['metro', 'non-metro'],
        index: true
    },
    tier: {
        type: String,
        enum: ['tier1', 'tier2', 'tier3'],
        index: true
    },
    region: {
        type: String,
        enum: ['north', 'south', 'east', 'west', 'central', 'other'],
        index: true
    },
    isCoastal: {
        type: Boolean,
        default: false,
        index: true
    },
    // Metadata
    lastVerifiedAt: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        enum: ['gpt', 'manual'],
        default: 'gpt'
    },
    confidence: {
        type: Number,
        default: 0.9,
        min: 0,
        max: 1
    },
    // Processing status
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    processedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
CityMetadataSchema.index({ cityNormalized: 1, state: 1 });
CityMetadataSchema.index({ metroStatus: 1, region: 1 });
CityMetadataSchema.index({ processingStatus: 1 });

const CityMetadata = mongoose.model('CityMetadata', CityMetadataSchema);

export default CityMetadata;

