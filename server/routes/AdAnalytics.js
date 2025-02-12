import express from 'express';
import { fetchFBAdAccountAndCampaignData,fetchFBAdAccountData,fetchFBCampaignData, fetchGoogleAdAndCampaignMetrics } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbAdAndCampaign/:brandId',verifyAuth, fetchFBAdAccountAndCampaignData);
router.post('/googleAdAndCampaign/:brandId',verifyAuth, fetchGoogleAdAndCampaignMetrics);
router.post('/fbAd/:brandId',verifyAuth, fetchFBAdAccountData);
router.post('/fbCampaign/:brandId',verifyAuth, fetchFBCampaignData);

export default router;