import express from 'express';
import { getFbAdAccountIds, getGa4PropertyIds, getGoogleAdAccounts } from '../controller/brandSetup.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.get('/google-accounts/:brandId',verifyAuth, getGoogleAdAccounts);
router.get('/ga4-propertyIds/:brandId',verifyAuth,getGa4PropertyIds)
router.get('/fb-ad-accounts/:brandId',verifyAuth,getFbAdAccountIds)

export default router;