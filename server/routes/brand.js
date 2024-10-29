import express from 'express';
import { addBrands,getBrandbyId,getBrands, updateBrands } from '../controller/brand.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

router.post('/add',verifyAuth, addBrands);
router.get('/all', getBrands);
router.patch('/update/:brandid',verifyAuth,updateBrands);
router.get('/:brandId',verifyAuth,getBrandbyId)

export default router;

