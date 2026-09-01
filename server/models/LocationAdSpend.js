import mongoose from 'mongoose';

const locationAdSpendSchema = new mongoose.Schema({
    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
        index: true
    },
    date: {
        type: String, // Stored as YYYY-MM-DD
        required: true,
        index: true
    },
    region: {
        type: String,
        enum: ['north', 'south', 'east', 'west', 'central', 'other'],
        required: true,
        index: true
    },
    metaSpend: {
        type: Number,
        default: 0
    },
    googleSpend: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound unique index to ensure one record per region per day per brand
locationAdSpendSchema.index({ brandId: 1, date: 1, region: 1 }, { unique: true });

const LocationAdSpend = mongoose.model('LocationAdSpend', locationAdSpendSchema);

export default LocationAdSpend;
