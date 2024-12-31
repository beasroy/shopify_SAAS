import User from "../models/User.js";
export const addBrandToUser = async (req, res) => {
    try {
      const { userId, brandId } = req.body;
  
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(brandId)) {
        return res.status(400).json({ message: 'Invalid user ID or brand ID format' });
      }
  
      // Find user and update brands array
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $addToSet: { brands: brandId } 
        },
        { 
          new: true,
          select: '-password -googleRefreshToken -fbAccessToken' 
        }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      return res.status(200).json({
        message: 'Brand added to user successfully',
        user: updatedUser
      });
  
    } catch (error) {
      console.error('Error adding brand to user:', error);
      return res.status(500).json({ 
        message: 'Error adding brand to user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  