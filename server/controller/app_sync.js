import Brand from "../models/Brands.js";
import User from "../models/User.js"; 
import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

export const app_sync = async (req, res) => {
  try { 
    const { 
      shopName, 
      shopifyDomain,  
      shopifyAccessToken
    } = req.body;
    
    const email = req.body.ownerEmail || `${shopName}@${shopifyDomain}`;
    const username = req.body.ownerName || shopName;
    
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        username,
        email,
        method: 'shopify',
        brands: [] 
      });
      
      await user.save();
    }
    
    // Brand handling
    let brand = await Brand.findOne({ 'shopifyAccount.shopName': shopifyDomain });
    
    if (brand) {
      brand.shopifyAccount.shopifyAccessToken = shopifyAccessToken;
      await brand.save();
      
      if (!user.brands.includes(brand._id.toString())) {
        user.brands.push(brand._id);
        await user.save();
      }
    } else {
      // Create a new brand
      const newBrand = new Brand({
        name: shopName, 
        shopifyAccount: {
          shopName: shopifyDomain,
          shopifyAccessToken
        },
      });
      
      await newBrand.save();
      user.brands.push(newBrand._id);
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' } 
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 
    });
    
    return res.status(brand ? 200 : 201).json({ 
      message: 'Shopify store synced successfully',
      userId: user._id,
      brandId: brand ? brand._id : newBrand._id,
      token 
    });
  } catch (error) {
    console.error('Error syncing Shopify store:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};