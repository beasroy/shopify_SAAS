import express from 'express';
import {
  getFestivalDates,
  addFestivalDate,
  updateFestivalDate,
  deleteFestivalDate,
  getCalendarSalesData
} from '../controller/festivalDate.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// Get all festival dates for a brand
router.get('/:brandId', verifyAuth, getFestivalDates);

// Get calendar sales data (for hover tooltips)
router.get('/sales/:brandId', verifyAuth, getCalendarSalesData);

// Add a new festival date
router.post('/:brandId', verifyAuth, addFestivalDate);

// Update a festival date
router.patch('/:festivalDateId', verifyAuth, updateFestivalDate);

// Delete a festival date
router.delete('/:festivalDateId', verifyAuth, deleteFestivalDate);

export default router;

