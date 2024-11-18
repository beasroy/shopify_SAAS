import BrandPerformance from "../models/BrandPerformance.js";

export const addTarget = async(req,res)=>{
    try {
        const brandTarget = new BrandPerformance(req.body);
        await brandTarget.save();
        res.status(201).json(brandTarget);
    }catch (error) {
        res.status(500).json({ error: 'Failed to add brand' });
    }
}

export const getTargetByBrand = async(req,res)=>{
    try {
        const brands = await BrandPerformance.find();
        res.json(brands);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch brand data' });
      }
}

// Backend code (assumed to be in your controller)
export const updateBrandTarget = async (req, res) => {
  try {
    const brand = await BrandPerformance.findOneAndUpdate(
      { brandId: req.params.brandId }, // Find by brandId
      req.body,                        // Update with data from the request body
      { new: true }                    // Return the updated document
    );

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand);
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ error: 'Failed to update brand' });
  }
};



export const deleteBrandTarget = async (req, res) => {
  try {
    const brand = await BrandPerformance.findOneAndDelete({ brandId: req.params.brandId });

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
};