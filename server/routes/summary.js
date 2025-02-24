 import express from 'express';
 import { getAnalyticsSummary,getFacebookAdsSummary, getGoogleAdsSummary } from '../controller/summary.js';
 import { verifyAuth } from '../middleware/verifyAuth.js';
 const router = express.Router();
 router.post('/analytics/:brandId', verifyAuth, getAnalyticsSummary)
 router.post('/facebook-ads/:brandId', verifyAuth, getFacebookAdsSummary)
 router.post('/google-ads/:brandId', verifyAuth, getGoogleAdsSummary)
 export default router;