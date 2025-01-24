import express from 'express';
import { getGoogleProductMetricsByBrand, getGoogleProductMetrics,getGoogleProductMetricsByType, getGoogleProductMetricsByCategory, getSearchTermMetrics, getAudienceMetricsByAge, getAudienceMetricsByGender } from '../controller/segmentReport.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { fetchAgeMetrics, fetchGenderMetrics, fetchSearchTermMetrics } from '../controller/googleAdsReport.js';
const router = express.Router();

router.post('/productMetrics/:brandId',verifyAuth, getGoogleProductMetrics);
router.post('/brandMetrics/:brandId',verifyAuth, getGoogleProductMetricsByBrand);
router.post('/typeMetrics/:brandId',verifyAuth, getGoogleProductMetricsByType);
router.post('/categoryMetrics/:brandId',verifyAuth,getGoogleProductMetricsByCategory);
router.post('/searchTermMetrics/:brandId',verifyAuth,getSearchTermMetrics);
router.post('/ageMetrics/:brandId',verifyAuth,getAudienceMetricsByAge);
router.post('/genderMetrics/:brandId',verifyAuth,getAudienceMetricsByGender);
router.post('/searchTerm/:brandId',verifyAuth,fetchSearchTermMetrics);
router.post('/age/:brandId',verifyAuth,fetchAgeMetrics)
router.post('/gender/:brandId',verifyAuth,fetchGenderMetrics)
export default router;