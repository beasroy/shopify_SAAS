import express from "express";
import { getMonthlyProductLaunches } from "../controller/Product.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post('/monthly-launched-products/:brandId', verifyAuth, getMonthlyProductLaunches);

export default router;