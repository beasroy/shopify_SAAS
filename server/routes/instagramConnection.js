import express from 'express';
import { getInstagramName, createInstagramConnection } from '../controller/instagramConnection';

const router = express.Router();

router.get('/getInstagramName', getInstagramName);
router.post('/createInstagramConnection', createInstagramConnection);

export default router;