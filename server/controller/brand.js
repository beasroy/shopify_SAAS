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

export const updateBrands = async(req,res) =>{
    try {
        const {brandid}=req.params;
        const { name, fbAdAccounts, googleAdAccount, ga4Account, shopifyAccount } = req.body;

        if (!brandid || !name) {
            return res.status(400).json({ error: 'Brand ID and name are required.' });
          }
      
          const updateData = {
            name,
            fbAdAccounts,
            googleAdAccount,
            ga4Account,
            shopifyAccount,
          };

          const updatedBrand = await Brand.findByIdAndUpdate(brandid, updateData, { new: true, runValidators: true });

          if (!updatedBrand) {
            return res.status(404).json({ error: 'Brand not found.' });
          }
          res.status(200).json(updatedBrand);

    } catch (error) {
        console.error('Error updating brand:', error);
        res.status(500).json({ error: 'Failed to update brand. Please try again.' });
    }
}