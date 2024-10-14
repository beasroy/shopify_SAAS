import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js"
import spotifyRoutes from "./routes/shopify.js"
import analyticsRoutes from "./routes/analytics.js"


const app = express();
dotenv.config();


connectDB();


app.use(cors({
  origin: 'http://localhost:5173',  // Frontend URL
  credentials: true  // Allow credentials (cookies)
}));
app.use(express.json());
app.use(cookieParser());

app.use("/auth",authRoutes);
app.use("/shopify",spotifyRoutes);
app.use("/analytics",analyticsRoutes);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello, World!'); // Change this to whatever response you want
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

