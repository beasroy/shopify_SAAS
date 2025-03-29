import User from "../models/User.js";
import mongoose from "mongoose";
export const addBrandToUser = async (req, res) => {
  try {
    const { userId, brandId } = req.body;
  
    // Validate user ID only
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
  
    // Find user first
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Manually add the brandId as a string if it doesn't already exist
    if (!user.brands.includes(brandId)) {
      user.brands.push(brandId);
      await user.save();
    }
  
    // Return user without sensitive fields
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.googleRefreshToken;
    delete userObject.fbAccessToken;
    
    return res.status(200).json({
      message: 'Brand added to user successfully',
      user: userObject
    });
  
  } catch (error) {
    console.error('Error adding brand to user:', error);
    return res.status(500).json({ 
      message: 'Error adding brand to user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
  