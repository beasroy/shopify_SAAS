import express from 'express';
import { getInstagramName, createInstagramConnection } from '../controller/instagramConnection.js';

const router = express.Router();

router.get('/getInstagramName', getInstagramName);
router.post('/createInstagramConnection', createInstagramConnection);

export default router;