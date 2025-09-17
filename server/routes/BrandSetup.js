import express from 'express';
import { getFbAdAccountIds, getGa4PropertyIds, getGoogleAdAccounts } from '../controller/brandSetup.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/google-accounts/:brandId',verifyAuth, getGoogleAdAccounts);
router.post('/ga4-propertyIds/:brandId',verifyAuth,getGa4PropertyIds)
router.post('/fb-ad-accounts/:brandId',verifyAuth,getFbAdAccountIds)

export default router;