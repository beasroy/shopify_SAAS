import express from 'express';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { addTarget, deleteBrandTarget, getTargetByBrand, updateBrandTarget } from '../controller/BrandPerformance.js';
const router = express.Router();


router.get('/brandTarget',verifyAuth,getTargetByBrand);
router.post('/addTarget',verifyAuth,addTarget);
router.patch('/updateTarget/:brandId',verifyAuth, updateBrandTarget);
router.delete('/deleteTarget/:brandId',verifyAuth, deleteBrandTarget)

export default router