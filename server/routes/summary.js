import express from 'express';
import { getUnifiedSummary, getMetaSummary, getGoogleAdsSummary, getAnalyticsSummary } from '../controller/summary.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

// Individual platform endpoints (recommended - faster & better UX)
router.get('/facebook-ads/:brandId', verifyAuth, getMetaSummary);
router.get('/google-ads/:brandId', verifyAuth, getGoogleAdsSummary);
router.get('/analytics/:brandId', verifyAuth, getAnalyticsSummary);

// Unified endpoint (legacy - slower but returns all at once)
router.get('/unified/:brandId', verifyAuth, getUnifiedSummary);

export default router;