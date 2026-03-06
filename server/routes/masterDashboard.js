import express from 'express';
import {
    fbAllBrandsAdData, fetchFBAdAccountData,
    fetchGoogleAdAndCampaignMetrics, fetchSalesSummary, getAllBrandsMetaSummary,
    getAllBrandsMetricsFromDB, getBrandWiseFunnelMetrics, getMarketingInsights
} from '../controller/masterDashboard.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

// router.get('/marketing-insights', verifyAuth, getMarketingInsights);
// router.get('/fb-ad-data', verifyAuth, fbAllBrandsAdData);
router.get('/brand-metrics', verifyAuth, getAllBrandsMetricsFromDB);
router.get('/fb-ad-data', verifyAuth, fetchFBAdAccountData);
router.get('/google-ad-data', verifyAuth, fetchGoogleAdAndCampaignMetrics);
router.get('/brand-funnel-metrics', verifyAuth, getBrandWiseFunnelMetrics);
router.get('/meta-sales-summary', verifyAuth, fetchSalesSummary);
export default router;