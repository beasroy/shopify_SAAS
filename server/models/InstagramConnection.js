import mongoose from 'mongoose';

const instagramConnectionSchema = new mongoose.Schema({
    brandId: {
        type: String,
        ref: 'Brand',
        required: true,
    },
    shopId: {
        type: Number,
        ref: 'Brand',
        required: true,
    },
    instagramUsername: {
        type: String,
        required: true,
    }
});

const InstagramConnection = mongoose.model('InstagramConnection', instagramConnectionSchema);

export default InstagramConnection;