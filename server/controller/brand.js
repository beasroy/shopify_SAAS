import Brand from "../models/Brands.js";
import User from "../models/User.js";
import AdMetrics from "../models/AdMetrics.js";
import RefundCache from "../models/RefundCache.js";
import { metricsQueue } from "../config/redis.js";

export const addBrands = async (req, res) => {
    const { name, fbAdAccounts, googleAdAccount, ga4Account, shopifyAccount} = req.body;

    try {
        const newBrand = new Brand({
            name,
            fbAdAccounts,
            googleAdAccount,
            ga4Account,
            shopifyAccount
        });

        await newBrand.save();

        const userId = req.user?.id || 'system-brand-creation';
        const brandId = newBrand._id.toString();

        try {
            await metricsQueue.add('calculate-metrics', {
                brandId: brandId,
                userId: userId
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });
            console.log(`Metrics calculation queued for brand ${brandId}`);
        } catch (metricsError) {
            console.error(`Failed to queue metrics calculation for brand ${brandId}:`, metricsError);
        }

        res.status(201).json({ message: "Brand created successfully", brand: newBrand });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating brand', error: error.message });
    }
}


export const getBrands = async(req,res) =>{
    try{
        const brands = await Brand.find();
        res.json(brands);
    }catch(error){
        console.error(error);
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
}

export const getCurrency= async (req,res)=>{
    try{
        const {brandId} = req.params;
        const brand = await Brand.findById(brandId);
        res.json(brand.shopifyAccount.currency);
    }catch(error){
        console.error(error);
        res.status(500).json({ message: 'Error fetching currency', error: error.message });
    }
}

export const getBrandbyId = async(req,res)=>{
    try {
        const {brandId} = req.params;

        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }
        res.status(200).json(brand);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching brand', error: error.message });
    }
}

export const updateBrands = async (req, res) => {
    try {
        const { brandid } = req.params;
        const { name, fbAdAccounts, googleAdAccount, ga4Account, shopifyAccount } = req.body;
        const userId = req.user?.id;

        if (!brandid) {
            return res.status(400).json({ error: 'Brand ID is required.' });
        }

        // Get current brand data to compare changes
        const currentBrand = await Brand.findById(brandid);
        if (!currentBrand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }

        const updateData = {};
        let hasNewAdditions = false;
        let newAdditions = {
            newStore: false,
            newFbAccounts: [],
            newGoogleAccounts: []
        };

        if (name) updateData.name = name;
        if (ga4Account) updateData.ga4Account = ga4Account;

        // Check for new store (Shopify account)
        if (shopifyAccount) {
            const currentShopName = currentBrand.shopifyAccount?.shopName;
            const newShopName = shopifyAccount.shopName;
            
            if (newShopName && (!currentShopName || currentShopName !== newShopName)) {
                newAdditions.newStore = true;
                hasNewAdditions = true;
                console.log(`New store detected: ${newShopName}`);
            }
            updateData.shopifyAccount = shopifyAccount;
        }

        // Check for new Facebook ad accounts
        if (fbAdAccounts) {
            // Get existing Facebook ad accounts
            const existingFbAccounts = currentBrand.fbAdAccounts || [];
            
            // Find new accounts that aren't already connected
            newAdditions.newFbAccounts = fbAdAccounts.filter(account => 
                !existingFbAccounts.includes(account)
            );
            
            if (newAdditions.newFbAccounts.length > 0) {
                hasNewAdditions = true;
                console.log(`New Facebook ad accounts detected: ${newAdditions.newFbAccounts.join(', ')}`);
            }
            
            // Merge existing and new accounts, avoiding duplicates
            const mergedFbAccounts = [...new Set([...existingFbAccounts, ...fbAdAccounts])];
            updateData.fbAdAccounts = mergedFbAccounts;
        }

        // Check for new Google ad accounts
        if (googleAdAccount) {
            // Get existing Google ad accounts
            const existingGoogleAccounts = currentBrand.googleAdAccount || [];
            
            // Convert to array if it's not already
            const newGoogleAccounts = Array.isArray(googleAdAccount) ? googleAdAccount : [googleAdAccount];
            
            // Find new accounts that aren't already connected
            newAdditions.newGoogleAccounts = newGoogleAccounts.filter(newAccount => 
                !existingGoogleAccounts.some(existingAccount => 
                    existingAccount.clientId === newAccount.clientId
                )
            );
            
            if (newAdditions.newGoogleAccounts.length > 0) {
                hasNewAdditions = true;
                console.log(`New Google ad accounts detected: ${newAdditions.newGoogleAccounts.map(acc => acc.clientId).join(', ')}`);
            }
            
            // Merge existing and new accounts, avoiding duplicates
            const mergedGoogleAccounts = [...existingGoogleAccounts];
            newGoogleAccounts.forEach(newAccount => {
                const exists = mergedGoogleAccounts.some(existing => 
                    existing.clientId === newAccount.clientId
                );
                if (!exists) {
                    mergedGoogleAccounts.push(newAccount);
                }
            });
            
            updateData.googleAdAccount = mergedGoogleAccounts;
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            brandid,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }

        // If new additions were detected, trigger appropriate metrics calculation
        if (hasNewAdditions && userId) {
            try {
                await metricsQueue.add('calculate-metrics', {
                    brandId: brandid,
                    userId: userId,
                    newAdditions: newAdditions
                }, {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000
                    }
                });
                console.log(`Metrics calculation for new additions queued for brand ${brandid}:`, newAdditions);
            } catch (metricsError) {
                console.error(`Failed to queue metrics calculation for new additions for brand ${brandid}:`, metricsError);
            }
        }

        res.status(200).json(updatedBrand);
    } catch (error) {
        console.error('Error updating brand:', error);
        res.status(500).json({ error: 'Failed to update brand. Please try again.' });
    }
};



export const filterBrands = async (req, res) => {
    try {
        const { brandIds } = req.body;

        if (!brandIds || !Array.isArray(brandIds)) {
            return res.status(400).json({ message: 'Invalid or missing brand IDs.' });
        }

        // Fetch brands matching the given IDs
        const brands = await Brand.find({ _id: { $in: brandIds } });

        res.status(200).json(brands);
    } catch (error) {
        console.error('Error filtering brands:', error);
        res.status(500).json({ message: 'Error fetching brands.', error: error.message });
    }
};

export const deleteBrand = async (req, res) => {
    try {
        const { brandId } = req.params;

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }
        
        // Remove the brand from all users' brands arrays
        await User.updateMany(
            { brands: brandId },
            { $pull: { brands: brandId } }
        );

        // Delete all AdMetrics data for this brand
        const adMetricsResult = await AdMetrics.deleteMany({ brandId });
        console.log(`Deleted ${adMetricsResult.deletedCount} AdMetrics records for brand ${brandId}`);

        // Delete all RefundCache data for this brand
        const refundCacheResult = await RefundCache.deleteMany({ brandId });
        console.log(`Deleted ${refundCacheResult.deletedCount} RefundCache records for brand ${brandId}`);

        // Delete the brand
        await Brand.findByIdAndDelete(brandId);

        res.status(200).json({ 
            message: 'Brand deleted successfully.', 
            brandId: brandId,
            deletedAdMetrics: adMetricsResult.deletedCount,
            deletedRefundCache: refundCacheResult.deletedCount
        });
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({ message: 'Error deleting brand.', error: error.message });
    }
};