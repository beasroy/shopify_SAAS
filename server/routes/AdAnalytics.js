import express from 'express';
import { fetchFBAdAccountAndCampaignData, fetchGoogleAdAndCampaignMetrics } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbAdAndCampaign/:brandId',verifyAuth, fetchFBAdAccountAndCampaignData);
router.post('/googleAdAndCampaign/:brandId',verifyAuth, fetchGoogleAdAndCampaignMetrics);


export default router;