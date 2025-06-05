import express from 'express';
import { verifyWebhook, customersDataRequest, customersRedact, shopRedact, subscriptionUpdate, appUninstalled, orderCancelled } from '../webhooks/shopify.js';

const router = express.Router();

router.post('/customers/data_request', verifyWebhook, customersDataRequest);
router.post('/customers/redact', verifyWebhook, customersRedact);
router.post('/shop/redact', verifyWebhook, shopRedact);
router.post('/app_subscriptions/update', verifyWebhook, subscriptionUpdate);
router.post('/app_uninstalled', verifyWebhook, appUninstalled);
router.post('/orders/cancelled', verifyWebhook, orderCancelled);

export default router;
