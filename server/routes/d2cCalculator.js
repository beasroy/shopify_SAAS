import express from 'express';
import { calculateD2C, calculateMetrics, getLastUsedExpenditure, getLastLandedCostForCOGS, getRevenue } from '../controller/d2cCalculator.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// Separate endpoint to fetch revenue only (called when date range changes)
router.post('/revenue/:brandId', verifyAuth, getRevenue);

// Combined endpoint for backward compatibility (optional)
// router.post('/ebidta-calculate/:brandId', verifyAuth, calculateD2C);
// router.get('/ebidta-calculate/:brandId', verifyAuth, getLastUsedExpenditure);
router.post('/calculate-metrics/:brandId', verifyAuth, calculateMetrics);
router.get('/last-used-expenditure/:brandId', verifyAuth, getLastUsedExpenditure);
router.get('/last-landed-cost-for-cogs/:brandId', verifyAuth, getLastLandedCostForCOGS);

export default router;

