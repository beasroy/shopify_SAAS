import express from 'express';
import { fetchShopifySales} from '../controller/shopify.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.get('/dailysales/:brandId',verifyAuth,fetchShopifySales)

export default router;