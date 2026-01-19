import express from 'express';
import { getLocationSales } from '../controller/locationAnalytics.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// GET /api/analytics/location-sales?brandId=X&dimension=metro&startDate=2024-01-01&endDate=2024-01-18
router.get('/location-sales', verifyAuth, getLocationSales);

export default router;

