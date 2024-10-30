import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { initWebSocket } from "./webhook/shopifyWebhook.js";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js"
import spotifyRoutes from "./routes/shopify.js"
import analyticsRoutes from "./routes/analytics.js"
import brandRoutes from "./routes/brand.js"
import fbMetricrRoutes from "./routes/FbAnalytics.js"
import excelReportRoutes from "./routes/report.js"
import { calculateMetricsForAllBrands } from "./Report/Report.js";
import cron from 'node-cron';

// import { getAdLevelSpendAndROAS } from "./controller/adMetcris.js";


const app = express();
dotenv.config();


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

// const add_account_id = process.env.GOOGLE_AD_ACCOUNT_ID
// const managerId = process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID
// getAdLevelSpendAndROAS(add_account_id,managerId);

//websocket connection

// const server = http.createServer(app);

// initWebSocket(server);

cron.schedule('08 5 * * *', async () => {
  console.log('Cron job started at:', new Date().toISOString());
  try {
    await calculateMetricsForAllBrands();
    console.log('Cron job finished successfully at:', new Date().toISOString());
  } catch (error) {
    console.error('Error executing metrics calculation:', error);
  }
}, { timezone: 'UTC' });



const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello, World!'); 
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

