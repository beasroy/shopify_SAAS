import express from 'express';
import { fetchFBAdAccountData, fetchGoogleAdAndCampaignMetrics } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbAd/:brandId',verifyAuth, fetchFBAdAccountData);
router.post('/googleAdAndCampaign/:brandId',verifyAuth, fetchGoogleAdAndCampaignMetrics);


export default router;