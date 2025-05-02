import express from 'express';
import { addBrandToUser, getUserById } from '../controller/user.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/add-brand',verifyAuth,addBrandToUser);
router.get('/getuser/:userId',getUserById);

export default router;