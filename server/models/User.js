import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleRefreshToken: { type: String }, 
    zohoRefreshToken: { type: String},
    fbAccessToken: {type: String},
    isClient: { type: Boolean, default: false }, 
    isAdmin: { type: Boolean, default: false },  
    method: { 
        type: String, 
        enum: ['password', 'google','shopify'], 
        required: true 
    },
    brands: [
        {
            type: String,
            ref: 'Brand' 
        }
    ],
    loginCount: { 
        type: Number, 
        default: 0 
    }
});

export default mongoose.model("User", userSchema);

