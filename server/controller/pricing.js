import Brand from '../models/Brands.js';
import Subscription from '../models/Subscription.js';
export const handlePricingCallback = async (req, res) => {
    try {
        const shop = req.query.shop;
        const chargeId = req.query.charge_id;

        if (!shop || !chargeId) {
            return res.status(400).json({
                error: 'Missing required parameters: shop or charge_id'
            });
        }

        const brand = await Brand.findOne({ 'shopifyAccount.shopName': shop });
        
        if (!brand) {
            return res.status(404).json({
                error: 'Brand not found for this shop'
            });
        }

        console.log(`Subscription initiated for shop ${shop} with charge ID ${chargeId}`);
        
        const pendingSubscription = new Subscription({
            brandId: brand._id.toString(),
            shopName: shop,
            chargeId: chargeId,
            status: 'pending',
            planName: 'Free Plan', 
            price: 0 
        });
        
        await pendingSubscription.save();
        
        const isProduction = process.env.NODE_ENV === 'production';
        const clientURL = isProduction
            ? 'https://parallels.messold.com/dashboard'
            : 'http://localhost:5173/dashboard';

        return res.redirect(`${clientURL}`);
    } catch (error) {
        console.error('Error in pricing callback:', error);
        return res.status(500).json({
            error: 'Error occurred while processing pricing callback',
            details: error.response?.data || error.message
        });
    }
};