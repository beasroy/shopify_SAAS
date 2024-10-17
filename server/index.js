import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js"
import spotifyRoutes from "./routes/shopify.js"
import analyticsRoutes from "./routes/analytics.js"
import brandRoutes from "./routes/brand.js"
import fetchAdAccountData from "./controller/adMetcris.js";


const app = express();
dotenv.config();


connectDB();

app.use(cors({
  origin: ['http://3.109.203.156', 'http://localhost:5173'],  
  credentials: true  
}));

const adAccountIds = ['act_1475581489568840', 'act_578320240630885', 'act_193585543386176', 'act_241464625568212'];
fetchAdAccountData(adAccountIds);
app.use(express.json());
app.use(cookieParser());

app.use("/auth",authRoutes);
app.use("/shopify",spotifyRoutes);
app.use("/analytics",analyticsRoutes);
app.use("/",brandRoutes);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello, World!'); 
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

