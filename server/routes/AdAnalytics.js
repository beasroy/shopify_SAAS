import express from 'express';
import { fetchFBAdAccountData, getGoogleAdMetrics, getGoogleCampaignMetrics,fetchFBCampaignData } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbad/:brandId',verifyAuth, fetchFBAdAccountData);
router.post('/fbCampaign/:brandId',verifyAuth, fetchFBCampaignData);
router.post('/googlead/:brandId',verifyAuth, getGoogleAdMetrics);
router.post('/googleCampaign/:brandId',verifyAuth, getGoogleCampaignMetrics)

export default router;