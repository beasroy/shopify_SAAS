import express from "express";
import { getLandingPageReport, getSessionsByLocation, getSessionsByReferringChannel,getReturningCustomerRate } from "../controller/analytics.js";

const router = express.Router();

router.get('/landingPage',getLandingPageReport);

router.get('/city',getSessionsByLocation);

router.get('/channel',getSessionsByReferringChannel);

router.get('/returnCustomer',getReturningCustomerRate);

export default router;