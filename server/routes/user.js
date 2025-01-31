import express from 'express';
import { addBrandToUser } from '../controller/user.js';
import { verifyAuth } from '../middleware/verifyAuth';

const router = express.Router();

router.post('/add-brand',verifyAuth,addBrandToUser)

export default router;