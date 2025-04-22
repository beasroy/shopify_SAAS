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

    const email = ownerEmail || `${shopName}@${shopifyDomain}`;
    const username = ownerName || shopName;
    
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        username: username,
        email,
        method: 'shopify',
        brands: [] 
      });
      
      await user.save();
    }
    
    let brand = await Brand.findOne({ 'shopifyAccount.shopName': shopName });
    
    if (brand) {

      brand.shopifyAccount.shopifyAccessToken = shopifyAccessToken;
      await brand.save();
      
      if (!user.brands.includes(brand._id.toString())) {
        user.brands.push(brand._id);
        await user.save();
      }
      
      return res.status(200).json({ 
        message: 'Shopify store data updated successfully',
        userId: user._id,
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

      user.brands.push(newBrand._id);
      await user.save();
      
      return res.status(201).json({ 
        message: 'User and brand created with Shopify store data',
        userId: user._id,
        brandId: newBrand._id,
      });
    }
  } catch (error) {
    console.error('Error syncing Shopify store:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};