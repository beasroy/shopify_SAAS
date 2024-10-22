import express from 'express';
import { addBrands,getBrands } from '../controller/brand.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

router.post('/add',verifyAuth, addBrands);
router.get('/all', getBrands);

export default router;