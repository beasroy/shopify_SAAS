import Brand from "../models/Brands.js";
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
        let hasNewAdAccounts = false;

        if (name) updateData.name = name;
        if (ga4Account) updateData.ga4Account = ga4Account;
        if (shopifyAccount) updateData.shopifyAccount = shopifyAccount;

        // Check for new Facebook ad accounts
        if (fbAdAccounts) {
            const newFbAccounts = fbAdAccounts.filter(account => 
                !currentBrand.fbAdAccounts?.includes(account)
            );
            if (newFbAccounts.length > 0) {
                hasNewAdAccounts = true;
            }
            updateData.fbAdAccounts = fbAdAccounts;
        }

        // Check for new Google ad accounts
        if (googleAdAccount) {
            const newGoogleAccounts = googleAdAccount.filter(newAccount => 
                !currentBrand.googleAdAccount?.some(existingAccount => 
                    existingAccount.clientId === newAccount.clientId
                )
            );
            if (newGoogleAccounts.length > 0) {
                hasNewAdAccounts = true;
            }
            updateData.googleAdAccount = Array.isArray(googleAdAccount) 
                ? googleAdAccount 
                : [googleAdAccount];
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            brandid,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({ error: 'Brand not found.' });
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

        await Brand.findByIdAndDelete(brandId);

        res.status(200).json({ message: 'Brand deleted successfully.' });
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({ message: 'Error deleting brand.', error: error.message });
    }
};