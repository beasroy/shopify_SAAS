import express from 'express';
import { addBrands } from '../controller/brand.js';
const router = express.Router();

router.post('/brand', addBrands);

export default router;