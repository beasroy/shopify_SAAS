import express from 'express';
import { getUnifiedSummary, getMetaSummary, getGoogleAdsSummary, getShopifySummary, getAnalyticsSummary, getInstagramSummary } from '../controller/summary.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { errorHandler } from '../middleware/errorHandler.js';
const router = express.Router();

// Individual platform endpoints (recommended - faster & better UX)
router.get('/facebook-ads/:brandId', verifyAuth, getMetaSummary);
router.get('/google-ads/:brandId', verifyAuth, getGoogleAdsSummary);
router.get('/shopify/:brandId', verifyAuth, getShopifySummary);
router.get('/analytics/:brandId', verifyAuth, getAnalyticsSummary);
router.get('/instagram/:brandId', verifyAuth, getInstagramSummary);

// Unified endpoint (legacy - slower but returns all at once)
router.get('/unified/:brandId', verifyAuth, getUnifiedSummary);

router.use(errorHandler);

export default router;
