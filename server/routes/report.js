import express from 'express';
import { getMetricsbyID } from '../controller/report.js';
import AdMetrics from '../models/AdMetrics.js';
import {monthlyFetchTotalSales} from "../Report/MonthlyReport.js"
import moment from "moment";

const router = express.Router();

router.get('/:brandId', getMetricsbyID);

router.delete('/delete/byDate', async (req, res) => {
    try {
        // Get the date range from query parameters
        // Example: /api/metrics/delete/byDate?startDate=2025-02-21&endDate=2025-02-21
        const { startDate, endDate } = req.query;

        if (!startDate) {
            return res.status(400).json({ message: 'startDate is required' });
        }

        // Create date objects
        const start = new Date(startDate);
        const end = new Date(endDate || startDate); // If no endDate, use startDate
        
        // Set time to start of day for startDate and end of day for endDate
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Delete records within the date range
        const result = await AdMetrics.deleteMany({
            date: {
                $gte: start,
                $lte: end
            }
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                message: 'No records found for the specified date range' 
            });
        }

        res.status(200).json({ 
            message: 'AdMetrics data deleted successfully', 
            deletedCount: result.deletedCount,
            dateRange: {
                from: start.toISOString(),
                to: end.toISOString()
            }
        });

    } catch (error) {
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});
router.delete('/delete/:brandId', async (req, res) => {
    try {
        const { brandId } = req.params;
        
        // Delete all records associated with the given brandId
        const result = await AdMetrics.deleteMany({ brandId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No records found for this brand' });
        }
        
        res.status(200).json({ message: 'AdMetrics data deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/monthly/:brandId', async (req, res) => {
    try {
      const { brandId } = req.params;
      const { startDate, endDate } = req.body;
      
      if (!brandId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Brand ID is required' 
        });
      }
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }
      
      // Validate date format
      if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || 
          !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      const salesData = await monthlyFetchTotalSales(brandId, startDate, endDate);
      
      return res.status(200).json({
        success: true,
        data: salesData
      });
      
    } catch (error) {
      console.error('API Error:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message || 'Server error while fetching sales data'
      });
    }
  });
  



export default router;