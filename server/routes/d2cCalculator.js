import express from 'express';
import { calculateD2C, getRevenue } from '../controller/d2cCalculator.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// Separate endpoint to fetch revenue only (called when date range changes)
router.post('/revenue/:brandId', verifyAuth, getRevenue);

// Combined endpoint for backward compatibility (optional)
router.post('/ebidta-calculate/:brandId', verifyAuth, calculateD2C);

export default router;

