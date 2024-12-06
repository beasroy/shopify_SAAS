import express from 'express';
import { getFbAdAccountIds, getGa4PropertyIds, getGoogleAdAccounts } from '../controller/brandSetup.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/google-accounts',verifyAuth, getGoogleAdAccounts);
router.post('/ga4-propertyIds',verifyAuth,getGa4PropertyIds)
router.post('/fb-ad-accounts',verifyAuth,getFbAdAccountIds)

export default router;