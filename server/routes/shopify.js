import express from 'express';
import { getAov, getTotalRevenue, testGraphQLOrders, getMonthlyPaymentOrders, syncCustomers, getCustomers, exportCustomersToExcel, deleteCustomersByBrand, getMonthlyProductLaunches, getMonthlyReturnedCustomers } from '../controller/shopify.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/aov/:brandId', verifyAuth, getAov);
router.post('/revenue/:brandId', verifyAuth, getTotalRevenue);
router.get('/test-graphql-orders/:brandId', verifyAuth, testGraphQLOrders);
router.post('/payment-orders/:brandId', verifyAuth, getMonthlyPaymentOrders);
router.post('/monthly-launched-products/:brandId', verifyAuth, getMonthlyProductLaunches);
router.post('/monthly-returned-customers/:brandId', verifyAuth, getMonthlyReturnedCustomers);
router.post('/customers/sync/:brandId', verifyAuth, syncCustomers);
router.get('/customers/:brandId', verifyAuth, getCustomers);
router.get('/customers/export/:brandId', verifyAuth, exportCustomersToExcel);
router.delete('/customers/:brandId', verifyAuth, deleteCustomersByBrand);

export default router;