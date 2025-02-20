import express from 'express';
import { getMetricsbyID } from '../controller/report.js';
import AdMetrics from '../models/AdMetrics.js';

const router = express.Router();

router.get('/:brandId', getMetricsbyID);
router.delete('/delete/:brandId', async (req, res) => {
    try {
        const { brandId } = req.params;
        
        // Delete all records associated with the given brandId
        const result = await AdMetrics.deleteMany({ brandId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No records found for this brand' });
        }
        
        res.status(200).json({ message: 'AdMetrics data deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


export default router;