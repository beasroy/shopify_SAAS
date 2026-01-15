import express from 'express';
import { calculateD2C, calculateMetrics, getLastUsedExpenditure, getRevenue } from '../controller/d2cCalculator.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// Separate endpoint to fetch revenue only (called when date range changes)
router.post('/revenue/:brandId', verifyAuth, getRevenue);

// Combined endpoint for backward compatibility (optional)
// router.post('/ebidta-calculate/:brandId', verifyAuth, calculateD2C);
router.get('/ebidta-calculate/:brandId', verifyAuth, getLastUsedExpenditure);
router.post('/calculate-metrics/:brandId', verifyAuth, calculateMetrics);

export default router;

