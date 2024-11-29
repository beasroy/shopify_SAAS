import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleAccessToken: { type: String }, 
    googleRefreshToken: { type: String }, 
    isClient: { type: Boolean, default: false }, 
    isAdmin: { type: Boolean, default: false },  
    method: { 
        type: String, 
        enum: ['password', 'google'], 
        required: true 
    },
    brands: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brand' // Reference to the Brand model
        }
    ]
});

export default mongoose.model("User", userSchema);

