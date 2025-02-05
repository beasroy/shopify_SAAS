import express from 'express';
import { getMetricsbyID } from '../controller/report.js';

const router = express.Router();

router.get('/:brandId', getMetricsbyID);

export default router;