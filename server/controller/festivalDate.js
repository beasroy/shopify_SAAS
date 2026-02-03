import FestivalDate from '../models/FestivalDate.js';
import Brand from '../models/Brands.js';
import { generateHolidaysWithAPI } from '../services/holidayGenerationService.js';

export const getFestivalDates = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { month, country = 'IN' } = req.query; // Optional: month in format YYYY-MM, country code

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required'
      });
    }

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    let festivalDates = [];
    
    if (month) {
      // Parse month (YYYY-MM format)
      const [year, monthIndex] = month.split('-').map(Number);
      const monthStart = new Date(year, monthIndex - 1, 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(year, monthIndex, 0); // Last day of the month
      monthEnd.setHours(23, 59, 59, 999);
      
      // Get global holidays for the country
      const globalQuery = {
        type: 'global',
        country: country.toUpperCase(),
        date: { $gte: monthStart, $lte: monthEnd }
      };
      const globalFestivals = await FestivalDate.find(globalQuery).lean();
      
      // Get brand-specific holidays
      const brandQuery = {
        type: 'brand',
        brandId,
        country: country.toUpperCase(),
        date: { $gte: monthStart, $lte: monthEnd }
      };
      const brandFestivals = await FestivalDate.find(brandQuery).lean();
      
      // Combine all festivals
        festivalDates = [...globalFestivals, ...brandFestivals];
        
      // Remove duplicates
      const uniqueFestivals = new Map();
      festivalDates.forEach(festival => {
        const key = `${festival._id}_${festival.date}`;
        if (!uniqueFestivals.has(key)) {
          uniqueFestivals.set(key, festival);
        }
      });
      festivalDates = Array.from(uniqueFestivals.values());
    } else {
      // No month filter - get all festivals (global + brand-specific)
      const globalFestivals = await FestivalDate.find({
        type: 'global',
        country: country.toUpperCase()
      }).sort({ date: 1 }).lean();
      
      const brandFestivals = await FestivalDate.find({
        type: 'brand',
        brandId,
        country: country.toUpperCase()
      }).sort({ date: 1 }).lean();
      
      festivalDates = [...globalFestivals, ...brandFestivals];
    }

    // Format dates for frontend
    const formattedDates = festivalDates.map(festival => ({
      _id: festival._id,
      date: festival.date,
      festivalName: festival.festivalName,
      description: festival.description,
      type: festival.type,
      scope: festival.scope,
      country: festival.country
    }));

    res.status(200).json({
      success: true,
      data: formattedDates
    });
  } catch (error) {
    console.error('Error fetching festival dates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching festival dates',
      error: error.message
    });
  }
};


export const addFestivalDate = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { date, festivalName, description, country = 'IN', scope = 'national' } = req.body;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required'
      });
    }

    if (!date || !festivalName) {
      return res.status(400).json({
        success: false,
        message: 'Date and festival name are required'
      });
    }

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Normalize date to start of day to avoid timezone issues
    const festivalDate = new Date(date);
    festivalDate.setHours(0, 0, 0, 0);

    // Check if festival date already exists for this brand
    const existingFestival = await FestivalDate.findOne({
      type: 'brand',
      brandId,
      country: country.toUpperCase(),
      date: festivalDate,
      festivalName: festivalName.trim()
    });

    if (existingFestival) {
      return res.status(409).json({
        success: false,
        message: 'Festival date already exists for this brand'
      });
    }

    const newFestivalDate = new FestivalDate({
      type: 'brand',
      brandId,
      country: country.toUpperCase(),
      date: festivalDate,
      festivalName: festivalName.trim(),
      description: description?.trim() || '',
      scope: scope || 'national',
    });

    await newFestivalDate.save();

    res.status(201).json({
      success: true,
      message: 'Festival date added successfully',
      data: newFestivalDate
    });
  } catch (error) {
    console.error('Error adding festival date:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Festival date already exists for this brand'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding festival date',
      error: error.message
    });
  }
};


export const updateFestivalDate = async (req, res) => {
  try {
    const { festivalDateId } = req.params;
    const { date, festivalName, description } = req.body;

    if (!festivalDateId) {
      return res.status(400).json({
        success: false,
        message: 'Festival date ID is required'
      });
    }

    const updateData = {};
    if (date) {
      const festivalDate = new Date(date);
      festivalDate.setHours(0, 0, 0, 0);
      updateData.date = festivalDate;
    }
    if (festivalName) updateData.festivalName = festivalName.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
   

    const updatedFestivalDate = await FestivalDate.findByIdAndUpdate(
      festivalDateId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedFestivalDate) {
      return res.status(404).json({
        success: false,
        message: 'Festival date not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Festival date updated successfully',
      data: updatedFestivalDate
    });
  } catch (error) {
    console.error('Error updating festival date:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Festival date already exists for this brand'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating festival date',
      error: error.message
    });
  }
};


export const deleteFestivalDate = async (req, res) => {
  try {
    const { festivalDateId } = req.params;
    const { brandId } = req.query; // Brand ID from query to verify ownership

    if (!festivalDateId) {
      return res.status(400).json({
        success: false,
        message: 'Festival date ID is required'
      });
    }

    const festivalDate = await FestivalDate.findById(festivalDateId);

    if (!festivalDate) {
      return res.status(404).json({
        success: false,
        message: 'Festival date not found'
      });
    }

    // Only allow deletion of brand holidays
    if (festivalDate.type === 'global') {
      return res.status(403).json({
        success: false,
        message: 'Global holidays cannot be deleted'
      });
    }

    // Verify brand ownership
    if (brandId && festivalDate.brandId.toString() !== brandId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete holidays belonging to your brand'
      });
    }

    await FestivalDate.findByIdAndDelete(festivalDateId);

    res.status(200).json({
      success: true,
      message: 'Festival date deleted successfully',
      data: festivalDate
    });
  } catch (error) {
    console.error('Error deleting festival date:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting festival date',
      error: error.message
    });
  }
};

// Generate holidays using Calendarific API
export const generateHolidays = async (req, res) => {
  try {
    const { country = 'IN', year } = req.body;

    if (!country) {
      return res.status(400).json({
        success: false,
        message: 'Country is required'
      });
    }

    const targetYear = year || new Date().getFullYear();

    // Check if holidays already exist for this country and year
    const yearStart = new Date(targetYear, 0, 1);
    yearStart.setHours(0, 0, 0, 0);
    const yearEnd = new Date(targetYear, 11, 31);
    yearEnd.setHours(23, 59, 59, 999);

    const existingHolidays = await FestivalDate.find({
      type: 'global',
      country: country.toUpperCase(),
      date: { $gte: yearStart, $lte: yearEnd }
    });

    if (existingHolidays.length > 0) {
      return res.status(200).json({
        success: true,
        message: `Holidays for ${country} in ${targetYear} already exist (${existingHolidays.length} holidays found)`,
        data: {
          existingCount: existingHolidays.length,
          year: targetYear,
          country: country.toUpperCase()
        }
      });
    }

    // Generate holidays using Calendarific API
    const holidays = await generateHolidaysWithAPI(country, targetYear);

    // Save holidays to database
    const holidayDocuments = holidays.map(holiday => ({
      type: 'global',
      country: country.toUpperCase(),
      date: holiday.date,
      festivalName: holiday.name,
      description: holiday.description || '',
      scope: holiday.scope,

    }));

    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < holidayDocuments.length; i += batchSize) {
      const batch = holidayDocuments.slice(i, i + batchSize);
      await FestivalDate.insertMany(batch, { ordered: false });
      insertedCount += batch.length;
    }

    res.status(201).json({
      success: true,
      message: `Successfully generated and stored ${insertedCount} holidays for ${country} in ${targetYear}`,
      data: {
        count: insertedCount,
        year: targetYear,
        country: country.toUpperCase()
      }
    });
  } catch (error) {
    console.error('Error generating holidays with Calendarific API:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating holidays',
      error: error.message
    });
  }
};




