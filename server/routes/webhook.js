import express from 'express';
import verifyWebhook, { customersDataRequest , customersRedact , shopRedact } from '../webhooks/shopify.js';



const router = express.Router();

router.post('/customers/data_request', verifyWebhook, customersDataRequest);
router.post('/customers/redact', verifyWebhook, customersRedact);
router.post('/shop/redact', verifyWebhook, shopRedact);

export default router;
