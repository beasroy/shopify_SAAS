import express from 'express';
import { fbAllBrandsAdData, getAllBrandsMetricsFromDB, getMarketingInsights } from '../controller/masterDashboard.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

router.get('/marketing-insights', verifyAuth, getMarketingInsights);
router.get('/fb-ad-data', verifyAuth, fbAllBrandsAdData);
router.get('/brand-metrics', verifyAuth, getAllBrandsMetricsFromDB);

export default  router;