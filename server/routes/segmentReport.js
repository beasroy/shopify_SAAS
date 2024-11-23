import express from 'express';
import { getGoogleProductMetricsByBrand, getGoogleProductMetrics,getGoogleProductMetricsByType, getGoogleProductMetricsByCategory, getSearchTermMetrics, getAudienceMetricsByAge } from '../controller/segmentReport.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

router.post('/productMetrics/:brandId',verifyAuth, getGoogleProductMetrics);
router.post('/brandMetrics/:brandId',verifyAuth, getGoogleProductMetricsByBrand);
router.post('/typeMetrics/:brandId',verifyAuth, getGoogleProductMetricsByType);
router.post('/categoryMetrics/:brandId',verifyAuth,getGoogleProductMetricsByCategory);
router.post('/searchTermMetrics/:brandId',verifyAuth,getSearchTermMetrics);
router.post('/ageMetrics/:brandId',verifyAuth,getAudienceMetricsByAge);

export default router;