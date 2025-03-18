import Brand from "../models/Brands.js";

export const addBrands = async(req,res) =>{
    const { name, fbAdAccounts, googleAdAccount, ga4Account, shopifyAccount,logoUrl } = req.body;
    const sanitizedLogoUrl = typeof logoUrl === 'string' ? logoUrl : '';
    try{
        const newBrand = new Brand ({
            name,
            logoUrl:sanitizedLogoUrl,
            fbAdAccounts,
            googleAdAccount,
            ga4Account,
            shopifyAccount
        });

        await newBrand.save();
        res.status(201).json({ message: "Brand created successfully", brand: newBrand });
    }catch(error){
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

        if (!brandid) {
            return res.status(400).json({ error: 'Brand ID is required.' });
        }

        const updateData = {};

        if (name) updateData.name = name;
        if (fbAdAccounts) updateData.fbAdAccounts = fbAdAccounts;
        if (ga4Account) updateData.ga4Account = ga4Account;
        if (shopifyAccount) updateData.shopifyAccount = shopifyAccount;

        // Properly handle googleAdAccount as an array of objects
        if (googleAdAccount) {
            // Make sure googleAdAccount is treated as an array of objects
            updateData.googleAdAccount = Array.isArray(googleAdAccount) 
                ? googleAdAccount 
                : [googleAdAccount]; // Convert single object to array if needed
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