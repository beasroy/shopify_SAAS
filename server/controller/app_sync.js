import Brand from "../models/Brands.js";
import User from "../models/User.js"; 

export const app_sync = async (req, res) => {
  try {
    const { 
      shopName, 
      shopifyDomain, 
      shopifyAccessToken, 
      ownerName, 
      ownerEmail 
    } = req.body;

    // Declare user variable at function scope level
    let user = null;
    
    // Only create/update user if owner information is provided
    if (ownerEmail || ownerName) {
      const email = ownerEmail || `${shopName}@${shopifyDomain}`;
      const username = ownerName || shopName;
      
      user = await User.findOne({ email });
      
      if (!user) {
        user = new User({
          username: username,
          email,
          method: 'shopify',
          brands: [] 
        });
        
        await user.save();
      }
    }
    
    // Brand handling continues regardless of user creation
    let brand = await Brand.findOne({ 'shopifyAccount.shopName': shopifyDomain });
    
    if (brand) {
      brand.shopifyAccount.shopifyAccessToken = shopifyAccessToken;
      await brand.save();
      
      // Only associate brand with user if user was created/found
      if (user && !user.brands.includes(brand._id.toString())) {
        user.brands.push(brand._id);
        await user.save();
      }
      
      return res.status(200).json({ 
        message: 'Shopify store data updated successfully',
        userId: user ? user._id : null,
        brandId: brand._id
      });
    } else {
      // Create a new brand
      const newBrand = new Brand({
        name: `${shopName}`, 
        shopifyAccount: {
          shopName: shopifyDomain,
          shopifyAccessToken: shopifyAccessToken
        },
      });
      
      await newBrand.save();

      // Only associate brand with user if user was created/found
      if (user) {
        user.brands.push(newBrand._id);
        await user.save();
      }
      
      return res.status(201).json({ 
        message: user ? 'User and brand created with Shopify store data' : 'Brand created with Shopify store data',
        userId: user ? user._id : null,
        brandId: newBrand._id,
      });
    }
  } catch (error) {
    console.error('Error syncing Shopify store:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};