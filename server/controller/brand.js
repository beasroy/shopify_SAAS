import Brand from "../models/Brands.js";

export const addBrands = async(req,res) =>{
    const { name, fbAdAccounts, googleAdAccount, ga4Account, shopifyAccount } = req.body;
    try{
        const newBrand = new Brand ({
            name,
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