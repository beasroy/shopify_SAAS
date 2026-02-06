import express from 'express';
import {
  getFestivalDates,
  addFestivalDate,
  updateFestivalDate,
  deleteFestivalDate,
  generateHolidays,
} from '../controller/festivalDate.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// Get all festival dates for a brand
router.get('/:brandId', verifyAuth, getFestivalDates);

// Generate holidays using Calendarific API (saves to database)
router.post('/generate', verifyAuth, generateHolidays);

// Add a new festival date
router.post('/:brandId', verifyAuth, addFestivalDate);

// Update a festival date
router.patch('/:festivalDateId', verifyAuth, updateFestivalDate);

// Delete a festival date
router.delete('/:festivalDateId', verifyAuth, deleteFestivalDate);

export default router;
