import Metrics from "../models/Metrics.js"

export const getMetricsbyID = async(req,res)=>{
    const {brandId} = req.params
    try {
        const metrics = await Metrics.find({ brandId });

        if (!metrics) {
            return res.status(404).json({ success: false, message: 'Metrics not found.' });
        }
        res.status(200).json({success: true, data:metrics});
        
    } catch (error) {
        console.error("Error fetching metrics by ID:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}