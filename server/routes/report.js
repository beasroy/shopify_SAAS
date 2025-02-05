import express from 'express';
import { deleteBrandMetrics, getMetricsbyID } from '../controller/report.js';

const router = express.Router();

router.get('/:brandId', getMetricsbyID);
router.delete('/delete', deleteBrandMetrics);

export default router;