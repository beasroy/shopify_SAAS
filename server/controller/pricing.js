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

        const shopId = brand.shopifyAccount.shopId;

        console.log(`Subscription initiated for shop ${shop} with charge ID ${chargeId}`);

        // Find if subscription already exists by chargeId
        const existingSubscription = await Subscription.findOne({ shopId: shopId });

        if (existingSubscription) {
            // Update the existing subscription
            existingSubscription.status = 'pending';
            existingSubscription.planName = 'Free Plan';
            existingSubscription.price = 0;

            // Save the updated subscription
            await existingSubscription.save();
            console.log(`Updated existing subscription ${chargeId} for shop ${shop}`);
        } else {
            const pendingSubscription = new Subscription({
                brandId: brand._id.toString(),
                shopId: shopId,
                chargeId: chargeId,
                status: 'pending',
                planName: 'Free Plan',
                price: 0
            });

            await pendingSubscription.save();
            console.log(`Created new subscription ${chargeId} for shop ${shop}`);
        }

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