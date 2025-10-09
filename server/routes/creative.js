import express from "express";
import { getBrandCreativesBatch, clearCreativesCache } from "../controller/creative.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post('/meta-creative/:brandId', verifyAuth, getBrandCreativesBatch);
router.delete('/meta-creative-cache/:brandId?', verifyAuth, clearCreativesCache);

export default router;