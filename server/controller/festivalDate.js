import FestivalDate from '../models/FestivalDate.js';
import AdMetrics from '../models/AdMetrics.js';
import Brand from '../models/Brands.js';

// Get festival dates for a brand (filtered by month to reduce load)
export const getFestivalDates = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { month } = req.query; // Optional: month in format YYYY-MM

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

    // Build query - filter by month if provided
    const query = { brandId };
    
    let festivalDates = [];
    
    if (month) {
      // Parse month (YYYY-MM format)
      const [year, monthIndex] = month.split('-').map(Number);
      const monthStart = new Date(year, monthIndex - 1, 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(year, monthIndex, 0); // Last day of the month
      monthEnd.setHours(23, 59, 59, 999);
      
      // Get festivals that match the exact date range
      const exactMatchQuery = { ...query, date: { $gte: monthStart, $lte: monthEnd } };
      const exactFestivals = await FestivalDate.find(exactMatchQuery).lean();
      
      // Get all recurring festivals for this brand
      const recurringQuery = { 
        brandId, 
        isRecurring: true 
      };
      const recurringFestivals = await FestivalDate.find(recurringQuery).lean();
      
      // Filter recurring festivals that match the requested month
      // For annually: include if month matches (day will be checked in frontend)
      // For monthly: include if day exists in target month
      // For weekly: include if day of week occurs in target month
      const matchingRecurring = recurringFestivals.filter(festival => {
        const festivalDate = new Date(festival.date);
        const festivalMonth = festivalDate.getMonth(); // 0-11
        const festivalDay = festivalDate.getDate(); // 1-31
        const targetMonth = monthIndex - 1; // Convert to 0-11
        
        if (festival.recurrencePattern === 'annually') {
          // Match same month (day will be checked in frontend for each date)
          return festivalMonth === targetMonth;
        } else if (festival.recurrencePattern === 'monthly') {
          // Match same day of month (if day exists in target month)
          const daysInTargetMonth = new Date(year, monthIndex, 0).getDate();
          return festivalDay <= daysInTargetMonth;
        } else if (festival.recurrencePattern === 'weekly') {
          // Match same day of week - always include weekly recurring festivals
          // The frontend will check the day of week for each date
          return true;
        }
        return false;
      });
      
      // Combine exact matches and recurring festivals
      festivalDates = [...exactFestivals, ...matchingRecurring];
      
      // Remove duplicates (in case a recurring festival also has an exact match)
      const uniqueFestivals = new Map();
      festivalDates.forEach(festival => {
        const key = `${festival._id}_${festival.date}`;
        if (!uniqueFestivals.has(key)) {
          uniqueFestivals.set(key, festival);
        }
      });
      festivalDates = Array.from(uniqueFestivals.values());
    } else {
      // No month filter - get all festivals
      festivalDates = await FestivalDate.find(query).sort({ date: 1 }).lean();
    }

    // Format dates for frontend
    const formattedDates = festivalDates.map(festival => ({
      _id: festival._id,
      date: festival.date,
      festivalName: festival.festivalName,
      description: festival.description,
      isRecurring: festival.isRecurring,
      recurrencePattern: festival.recurrencePattern
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

// Add a new festival date
export const addFestivalDate = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { date, festivalName, description, isRecurring, recurrencePattern } = req.body;

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
      brandId,
      date: festivalDate
    });

    if (existingFestival) {
      return res.status(409).json({
        success: false,
        message: 'Festival date already exists for this brand'
      });
    }

    const newFestivalDate = new FestivalDate({
      brandId,
      date: festivalDate,
      festivalName: festivalName.trim(),
      description: description?.trim() || '',
      isRecurring: isRecurring || false,
      recurrencePattern: isRecurring ? (recurrencePattern || 'annually') : null
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

// Update a festival date
export const updateFestivalDate = async (req, res) => {
  try {
    const { festivalDateId } = req.params;
    const { date, festivalName, description, isRecurring, recurrencePattern } = req.body;

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
    if (isRecurring !== undefined) {
      updateData.isRecurring = isRecurring;
      updateData.recurrencePattern = isRecurring ? (recurrencePattern || 'annually') : null;
    }

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

// Delete a festival date
export const deleteFestivalDate = async (req, res) => {
  try {
    const { festivalDateId } = req.params;

    if (!festivalDateId) {
      return res.status(400).json({
        success: false,
        message: 'Festival date ID is required'
      });
    }

    const deletedFestivalDate = await FestivalDate.findByIdAndDelete(festivalDateId);

    if (!deletedFestivalDate) {
      return res.status(404).json({
        success: false,
        message: 'Festival date not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Festival date deleted successfully',
      data: deletedFestivalDate
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

// Get sales data for calendar dates (for hover tooltip)
// Fetches last 3 months of sales data from a target month to reduce DB calls
export const getCalendarSalesData = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { targetMonth } = req.query; // Optional: target month to fetch data for

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

    // Calculate date range: 3 months centered around target month or last 3 months from today
    let referenceDate = new Date();
    if (targetMonth) {
      referenceDate = new Date(targetMonth);
    }
    
    // Calculate 3-month window: 1 month before, target month, 1 month after
    const targetYear = referenceDate.getFullYear();
    const targetMonthIndex = referenceDate.getMonth();
    
    // Start: 1st day of 1 month before target month
    const startDate = new Date(targetYear, targetMonthIndex - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    
    // End: Last day of 1 month after target month
    const endDate = new Date(targetYear, targetMonthIndex + 2, 0); // Day 0 = last day of previous month
    endDate.setHours(23, 59, 59, 999);

    // Get sales data from AdMetrics for the calculated date range
    const salesData = await AdMetrics.find({
      brandId,
      date: { $gte: startDate, $lte: endDate }
    })
      .select('date totalSales refundAmount codOrderCount prepaidOrderCount')
      .sort({ date: 1 })
      .lean();

    // Format data for frontend - key by date string (YYYY-MM-DD)
    const salesByDate = {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    salesData.forEach(metric => {
      const dateStr = metric.date.toISOString().split('T')[0];
      const metricDate = new Date(metric.date);
      metricDate.setHours(0, 0, 0, 0);

      // Only include past dates (no sales for future dates)
      if (metricDate <= todayStart) {
        salesByDate[dateStr] = {
          date: dateStr,
          totalSales: metric.totalSales || 0,
          refundAmount: metric.refundAmount || 0,
          netSales: (metric.totalSales || 0) - (metric.refundAmount || 0),
          codOrderCount: metric.codOrderCount || 0,
          prepaidOrderCount: metric.prepaidOrderCount || 0,
          totalOrders: (metric.codOrderCount || 0) + (metric.prepaidOrderCount || 0)
        };
      }
    });

    // Get all festival dates for this brand (not limited by date range)
    const festivalDates = await FestivalDate.find({ brandId })
      .select('date festivalName description')
      .lean();

    // Format festival dates
    const festivalsByDate = {};
    festivalDates.forEach(festival => {
      const dateStr = festival.date.toISOString().split('T')[0];
      festivalsByDate[dateStr] = {
        festivalName: festival.festivalName,
        description: festival.description
      };
    });

    res.status(200).json({
      success: true,
      data: {
        sales: salesByDate,
        festivals: festivalsByDate
      }
    });
  } catch (error) {
    console.error('Error fetching calendar sales data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar sales data',
      error: error.message
    });
  }
};

