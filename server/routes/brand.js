import express from 'express';
import { addBrands,getBrandbyId,getBrands, updateBrands, filterBrands , getCurrency, deleteBrand} from '../controller/brand.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

router.post('/add',verifyAuth, addBrands);
router.get('/all', getBrands);
router.patch('/update/:brandid',verifyAuth,updateBrands);
router.get('/:brandId',verifyAuth,getBrandbyId)
router.post('/filter',verifyAuth, filterBrands);
router.get('/currency/:brandId',verifyAuth, getCurrency);
router.delete('/delete/:brandId',verifyAuth, deleteBrand);

export default router;

