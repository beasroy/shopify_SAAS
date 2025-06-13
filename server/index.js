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
import metaRoutes from "./routes/meta.js"
import googleRoutes from "./routes/google.js"
import googleAdConversionReportRoutes from "./routes/googleAdsConversion.js"
import summaryRoutes from "./routes/summary.js"
import { setupCronJobs } from "./controller/cron-job.js";
import setupBrandRoutes from "./routes/BrandSetup.js";
import userRoutes from "./routes/user.js";
import zohoRoutes from "./routes/zohoTicket.js";
import shopifyAppRoutes from "./routes/app_sync.js"
import webhookRoutes from "./routes/webhook.js"
import pricingRoutes from "./routes/pricing.js"
import { calculateMetricsForSingleBrand } from "./Report/MonthlyReport.js";
import { monthlyAddReportData } from "./Report/MonthlyReport.js";
const app = express();
dotenv.config();
             
connectDB(); 

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: isDevelopment 
    ? ['http://13.203.31.8', 'http://localhost:5173']
    : ['https://parallels.messold.com'],
  credentials: true  
}));

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
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
dataOperationRouter.use("/meta",metaRoutes);
dataOperationRouter.use("/google",googleRoutes);
dataOperationRouter.use("/users",userRoutes);
dataOperationRouter.use("/summary", summaryRoutes)
dataOperationRouter.use("/zoho",zohoRoutes);
dataOperationRouter.use("/app",shopifyAppRoutes)
dataOperationRouter.use("/shopify/webhooks",webhookRoutes)
dataOperationRouter.use("/pricing",pricingRoutes)

if (isDevelopment) {
  console.log('Running in development mode - cron jobs not initialized');
} else {
  setupCronJobs();
  console.log('Cron jobs initialized in production environment');
}

const PORT = process.env.PORT || 5000;

calculateMetricsForSingleBrand("67a60c4eb41925417e85ade6","67eb85f2f583a37ca251622a")

app.get('/', (req, res) => {
  res.send('Hello, World!'); 
});

// Trust proxy in production
if (!isDevelopment) {
  app.set('trust proxy', 1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on ${isDevelopment ? 'http' : 'https'}://0.0.0.0:${PORT}`);
});

