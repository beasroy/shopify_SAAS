import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js"
import spotifyRoutes from "./routes/shopify.js"
import analyticsRoutes from "./routes/analytics.js"
import brandRoutes from "./routes/brand.js"
import fbMetricrRoutes from "./routes/FbAnalytics.js"
// import { getAdLevelSpendAndROAS } from "./controller/adMetcris.js";


const app = express();
dotenv.config();


connectDB();

app.use(cors({
  origin: ['http://3.109.203.156', 'http://localhost:5173','http://parallels.messold.com'],  
  credentials: true  
}));


app.use(express.json());
app.use(cookieParser());

app.use("/auth",authRoutes);
app.use("/shopify",spotifyRoutes);
app.use("/analytics",analyticsRoutes);
app.use("/",brandRoutes);
app.use("/metrics",fbMetricrRoutes)

// const add_account_id = process.env.GOOGLE_AD_ACCOUNT_ID
// const managerId = process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID
// getAdLevelSpendAndROAS(add_account_id,managerId);


const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello, World!'); 
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

