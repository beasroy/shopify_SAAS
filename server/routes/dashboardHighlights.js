import express from 'express';
import { getMarketingInsights, getAddToCartAndCheckoutsData } from '../controller/dashboardHighlights.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();


router.get('/marketing/:brandId', verifyAuth, getMarketingInsights);
router.post('/conversion-funnel/:brandId', verifyAuth, getAddToCartAndCheckoutsData);

export default router;

