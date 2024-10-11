import express from "express";
import { getBatchReports } from "../controller/analytics.js";

const router = express.Router();

// router.get('/landingPage',getLandingPageReport);

// router.get('/city',getSessionsByLocation);

// router.get('/channel',getSessionsByReferringChannel);

// router.get('/returnCustomer',getReturningCustomerRate);

router.post('/report',getBatchReports)

export default router;