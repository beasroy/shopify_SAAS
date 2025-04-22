import express from "express";
import { app_sync } from "../controller/app_sync.js";
const router = express.Router();

router.post("/sync-shopify-store",app_sync);

export default router;