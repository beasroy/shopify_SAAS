import Brand from "../models/Brands.js";
import User from "../models/User.js";
import AdMetrics from "../models/AdMetrics.js";
import Product from "../models/Product.js";

import { metricsQueue } from "../config/redis.js";
import { getIO } from "../config/socket.js";

export const addBrands = async (req, res) => {
    const { name, fbAdAccounts, googleAdAccount, ga4Account, shopifyAccount } = req.body;

    try {
        const newBrand = new Brand({
            name,
            fbAdAccounts,
            googleAdAccount,
            ga4Account,
            shopifyAccount
        });

        await newBrand.save();

        // Also add brand to all admin users
        const adminUsers = await User.find({ isAdmin: true });
        for (const adminUser of adminUsers) {
            if (!adminUser.brands.includes(newBrand._id.toString())) {
                adminUser.brands.push(newBrand._id);
                await adminUser.save();
            }
        }

        // Add brand to current user's brands array
        const currentUserId = req.user?.id;
        if (currentUserId) {
            try {
                const currentUser = await User.findById(currentUserId);
                if (currentUser && !currentUser.brands.includes(newBrand._id.toString())) {
                    currentUser.brands.push(newBrand._id);
                    await currentUser.save();
                    console.log(`Added brand ${newBrand._id} to current user ${currentUserId}`);
                }
            } catch (userUpdateError) {
                console.error(`Error adding brand to current user ${currentUserId}:`, userUpdateError);
            }
        }

        const brandId = newBrand._id.toString();

        try {
            await metricsQueue.add('calculate-metrics', {
                brandId: brandId,
                userId: currentUserId
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


export const getBrands = async (req, res) => {
    try {
        const brands = await Brand.find();
        res.json(brands);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
}

export const getCurrency = async (req, res) => {
    try {
        const { brandId } = req.params;
        const brand = await Brand.findById(brandId);
        res.json(brand.shopifyAccount.currency);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching currency', error: error.message });
    }
}

export const getBrandbyId = async (req, res) => {
    try {
        const { brandId } = req.params;

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

        // First, check if the brand exists
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }


        // Delete related data from AdMetrics collection
        try {
            const adMetricsResult = await AdMetrics.deleteMany({ brandId: brandId });
            console.log(`Deleted ${adMetricsResult.deletedCount} ad metrics entries for brand ${brandId}`);
        } catch (adMetricsError) {
            console.error(`Error deleting ad metrics data for brand ${brandId}:`, adMetricsError);
        }

        // Remove brand from all users' brands array
        try {
            const userUpdateResult = await User.updateMany(
                { brands: brandId },
                { $pull: { brands: brandId } }
            );
            console.log(`Removed brand ${brandId} from ${userUpdateResult.modifiedCount} users`);
        } catch (userUpdateError) {
            console.error(`Error removing brand from users for brand ${brandId}:`, userUpdateError);
        }

        // Finally, delete the brand itself
        const deletedBrand = await Brand.findByIdAndDelete(brandId);

        if (!deletedBrand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }

        res.status(200).json({
            message: 'Brand and all related data deleted successfully',
            deletedBrand: {
                id: deletedBrand._id,
                name: deletedBrand.name
            }
        });
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({ message: 'Error deleting brand', error: error.message });
    }
}

export const deletePlatformIntegration = async (req, res) => {
    try {
        const { brandId } = req.params;
        const { platform, accountId, shopName } = req.body;

        if (!brandId) {
            return res.status(400).json({ error: 'Brand ID is required.' });
        }

        if (!platform) {
            return res.status(400).json({ error: 'Platform is required.' });
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }

        let updateData = {};
        let deletedInfo = {};

        switch (platform.toLowerCase()) {
            case 'shopify':
                if (!shopName) {
                    return res.status(400).json({ error: 'Shop name is required for Shopify platform.' });
                }

                if (brand.shopifyAccount?.shopName === shopName) {
                    updateData = { shopifyAccount: {} };
                    deletedInfo = { platform: 'shopify', shopName };
                } else {
                    return res.status(404).json({ error: 'Shopify store not found for this brand.' });
                }
                break;

            case 'facebook':
                if (!accountId) {
                    return res.status(400).json({ error: 'Account ID is required for Facebook platform.' });
                }

                const currentFbAccounts = brand.fbAdAccounts || [];
                const updatedFbAccounts = currentFbAccounts.filter(account => account !== accountId);

                if (updatedFbAccounts.length === currentFbAccounts.length) {
                    return res.status(404).json({ error: 'Facebook account not found for this brand.' });
                }

                updateData = { fbAdAccounts: updatedFbAccounts };
                deletedInfo = { platform: 'facebook', accountId };
                break;

            case 'google ads':
                if (!accountId) {
                    return res.status(400).json({ error: 'Account ID is required for Google Ads platform.' });
                }

                const currentGoogleAccounts = brand.googleAdAccount || [];
                const updatedGoogleAccounts = currentGoogleAccounts.filter(account => account.clientId !== accountId);

                if (updatedGoogleAccounts.length === currentGoogleAccounts.length) {
                    return res.status(404).json({ error: 'Google Ads account not found for this brand.' });
                }

                updateData = { googleAdAccount: updatedGoogleAccounts };
                deletedInfo = { platform: 'google ads', accountId };
                break;

            case 'google analytics':
            case 'ga4':
                if (brand.ga4Account?.PropertyID) {
                    updateData = { ga4Account: {} };
                    deletedInfo = { platform: 'google analytics', propertyId: brand.ga4Account.PropertyID };
                } else {
                    return res.status(404).json({ error: 'Google Analytics account not found for this brand.' });
                }
                break;

            default:
                return res.status(400).json({ error: 'Invalid platform. Supported platforms: shopify, facebook, google ads, google analytics' });
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            brandId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({ error: 'Brand not found.' });
        }

        res.status(200).json({
            message: 'Platform integration deleted successfully',
            deletedInfo,
            brand: updatedBrand
        });

    } catch (error) {
        console.error('Error deleting platform integration:', error);
        res.status(500).json({ message: 'Error deleting platform integration', error: error.message });
    }
}

export async function deleteAllProducts(req, res) {
    try {
        const result = await Product.deleteMany({});

        if (result.deletedCount === 0) {
            return res.status(200).json({
                success: true,
                message: 'No products found',
            });
        }

        return res.status(200).json({
            success: true,
            message: `${result.deletedCount} products deleted successfully`,
        });
    } catch (error) {
        console.error(`Error deleting products:`, error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

export async function deleteProductsByBrand(req, res) {
    try {
        const { brandId } = req.params;

        if (!brandId) {
            return res.status(400).json({
                success: false,
                error: 'brandId is required',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Brand ID format'
            });
        }

        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({ success: false, error: 'Brand not found' });
        }
        const result = await Product.deleteMany({ brandId:brandId });

        if (result.deletedCount === 0) {
            return res.status(200).json({
                success: true,
                message: 'No products found for this brand',
            });
        }

        return res.status(200).json({
            success: true,
            message: `${result.deletedCount} products deleted successfully for brand ${brand.name}`,
            deletedCount: result.deletedCount,
            brand: brand.name
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
