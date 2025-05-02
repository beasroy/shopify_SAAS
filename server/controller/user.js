import User from "../models/User.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import Brand from "../models/Brands.js";

config();


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

export const getUserById = async (req, res) => {
  const { userId } = req.params;
  const token = req.query.token;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    if (decodedToken.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this user data' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find all brands associated with the user
    const brands = await Brand.find({ _id: { $in: user.brands } });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        brands: user.brands, // Keep the original brand IDs
        isAdmin: user.isAdmin,
        isClient: user.isClient,
        method: user.method,
        loginCount: user.loginCount
      },
      brands: brands.map(brand => ({
        id: brand._id,
        name: brand.name,
        logoUrl: brand.logoUrl,
        fbAdAccounts: brand.fbAdAccounts,
        googleAdAccount: brand.googleAdAccount,
        ga4Account: brand.ga4Account,
        shopifyAccount: brand.shopifyAccount
      }))
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ success: false, message: 'Error fetching user' });
  }
}
