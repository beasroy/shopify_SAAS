import express from 'express';
import { getGoogleAdAccounts } from '../controller/brandSetup.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/google-accounts',verifyAuth, getGoogleAdAccounts);

export default router;