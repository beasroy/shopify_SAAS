import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js"
import spotifyRoutes from "./routes/shopify.js"


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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

