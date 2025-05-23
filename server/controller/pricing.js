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

        const existingSubscription = await Subscription.findOne({ shopId: shopId });

        if (existingSubscription) {

            existingSubscription.status = 'pending';
            existingSubscription.planName = 'Free Plan';
            existingSubscription.price = 0;
            existingSubscription.chargeId = chargeId;

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


export const getPricingDetails = async (req, res) => {
    try {
        const { brandId } = req.params;
        const subscription = await Subscription.findOne({
            brandId: brandId
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No active subscription found' });
        }

        // Calculate trial remaining days if in trial period
        let trialDaysRemaining = null;
        if (subscription.trialEndsOn) {
            const trialEndDate = new Date(subscription.trialEndsOn);
            const currentDate = new Date();

            if (trialEndDate > currentDate) {
                const diffTime = Math.abs(trialEndDate - currentDate);
                trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        // Calculate days until next billing
        let daysUntilBilling = null;
        if (subscription.billingOn) {
            const billingDate = new Date(subscription.billingOn);
            const currentDate = new Date();

            const diffTime = Math.abs(billingDate - currentDate);
            daysUntilBilling = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Format the response
        const subscriptionDetails = {
            id: subscription._id,
            planName: subscription.planName,
            price: subscription.price,
            status: subscription.status,
            chargeId: subscription.chargeId,
            trialEndsOn: subscription.trialEndsOn,
            trialDaysRemaining,
            billingOn: subscription.billingOn,
            daysUntilBilling,
            createdAt: subscription.createdAt
        };

        res.json(subscriptionDetails);
    } catch (err) {
        console.error('Error fetching subscription details:', err);
        res.status(500).json({ message: 'Server error' });
    }

}