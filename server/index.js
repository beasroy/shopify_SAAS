import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import { createServer } from 'http';
import { initializeSocket } from './config/socket.js';
import { initializeNotificationSubscriber } from './config/redis.js';
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
import cacheRoutes from "./routes/cache.js"
import instagramConnectionRoutes from "./routes/instagramConnection.js"
import { calculateMetricsForSingleBrand } from "./Report/MonthlyReport.js";


const app = express();
const server = createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Initialize Redis notification subscriber
initializeNotificationSubscriber();

dotenv.config();
             
connectDB();

const isDevelopment = process.env.NODE_ENV !== 'production';

// app.use(cors({
//   origin: isDevelopment 
//     ? true  // Allow all origins in development
//     : [
//         'https://parallels.messold.com',
//         'https://extensions.shopifycdn.com',
//         'https://*.shopifycdn.com',
//         'https://extensions.shopify.com'
//       ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(cors({
  origin: true, // Temporarily allow all
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
dataOperationRouter.use("/cache",cacheRoutes)
dataOperationRouter.use("/instagram",instagramConnectionRoutes)


if (isDevelopment) {
  console.log('Running in development mode - cron jobs not initialized');
} else {
  setupCronJobs();
  console.log('Cron jobs initialized in production environment');
}

//calculateMetricsForSingleBrand("686921dad089883460c75808","686921dad089883460c75805")

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello, World!'); 
});

// Trust proxy in production
if (!isDevelopment) {
  app.set('trust proxy', 1);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on ${isDevelopment ? 'http' : 'https'}://0.0.0.0:${PORT}`);
  console.log(`Socket.IO server is ready for real-time notifications`);
  console.log(`Redis notification subscriber is ready to receive worker notifications`);
});

