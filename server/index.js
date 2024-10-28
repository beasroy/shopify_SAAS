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
import { fetchFBAdReport, fetchTotalSales } from "./Report/Report.js";

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
dataOperationRouter.use("/metrics",fbMetricrRoutes)

// const add_account_id = process.env.GOOGLE_AD_ACCOUNT_ID
// const managerId = process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID
// getAdLevelSpendAndROAS(add_account_id,managerId);

//websocket connection

// const server = http.createServer(app);

// initWebSocket(server);


const brandId = '671b68bed3c4f462d681ef45'; // Replace with actual brand ID
const results = await fetchFBAdReport(brandId);

results.data.forEach(result => {
    // Check if purchase_roas exists in the result
    if (result.purchase_roas) {
        console.log(`Ad Account ID: ${result.adAccountId}`);
        console.log(`Meta Spend: ${result.spend}`)
        console.log("Purchase ROAS:", result.purchase_roas);
    } else if (result.message) {
        // If there's a message, log it as well
        console.log(result.message);
    }
});

const shopifyResult = await fetchTotalSales(brandId)
console.log('shopifyResult',shopifyResult);
 


const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello, World!'); 
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

