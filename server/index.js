import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js"
import spotifyRoutes from "./routes/shopify.js"
import analyticsRoutes from "./routes/analytics.js"
import brandRoutes from "./routes/brand.js"
import fbMetricrRoutes from "./routes/AdAnalytics.js"
import excelReportRoutes from "./routes/report.js"
import targetReportRoutes from "./routes/BrandPerformance.js"
import segmentReportRoutes from "./routes/segmentReport.js"
import googleAdConversionReportRoutes from "./routes/googleAdsConversion.js"
import { setupCronJobs } from "./controller/cron-job.js";
import setupBrandRoutes from "./routes/BrandSetup.js";
import {getGoogleAdData} from "./Report/Report.js";





const app = express();
dotenv.config();

getGoogleAdData('671b6925d3c4f462d681ef47')
connectDB();

app.use(cors({
  origin: ['http://13.203.31.8', 'http://localhost:5173','https://parallels.messold.com'],  
  credentials: true  
}));


app.use(express.json());
app.use(cookieParser());

const dataOperationRouter = express.Router();
app.use('/api', dataOperationRouter);

dataOperationRouter.use("/auth",authRoutes);
dataOperationRouter.use("/shopify",spotifyRoutes);
dataOperationRouter.use("/analytics",analyticsRoutes);
dataOperationRouter.use("/brands",brandRoutes);
dataOperationRouter.use("/metrics",fbMetricrRoutes);
dataOperationRouter.use("/report",excelReportRoutes);
dataOperationRouter.use("/performance",targetReportRoutes);
dataOperationRouter.use("/segment",segmentReportRoutes);
dataOperationRouter.use("/setup",setupBrandRoutes);
dataOperationRouter.use("/googleAd",googleAdConversionReportRoutes)


setupCronJobs();

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello, World!'); 
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

