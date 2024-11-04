import Metrics from "../models/Metrics.js"


export const getMetricsbyID = async (req, res) => {
    const { brandId } = req.params;
    const { date } = req.query;

    try {
        const query = { brandId };

        if (date) {
            const inputDate = new Date(date);
            const targetDate = new Date(inputDate);

            if (inputDate < new Date("2024-10-30T00:00:00Z")) {
                targetDate.setUTCDate(targetDate.getUTCDate() - 1); 
            }

            const dayStart = new Date(targetDate);
            dayStart.setUTCHours(0, 0, 0, 0); 

            const dayEnd = new Date(targetDate);
            dayEnd.setUTCHours(23, 59, 59, 999); 

            query.date = { $gte: dayStart, $lte: dayEnd };
        }

        const metrics = await Metrics.find(query);

        if (!metrics || metrics.length === 0) {
            return res.status(404).json({ success: false, message: 'Metrics not found.' });
        }
 
        res.status(200).json({ success: true, data: metrics });

    } catch (error) {
        console.error("Error fetching metrics by ID:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

