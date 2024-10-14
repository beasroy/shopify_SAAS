import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();
const SECRET_KEY = process.env.JWT_SECRET || "your-default-secret";

const generateAccessToken = (user) => {
  const expiresIn = '1h'; 
  const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn });
  return { token, expiresIn };
};

export const verifyAuth = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    } 
    const decoded = jwt.verify(token, SECRET_KEY);

    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    if (decoded.exp - currentTime < 300) { // 5 minutes (300 seconds)
      // Generate a new access token
      const newTokenData = generateAccessToken({ id: decoded.id });
      res.cookie('token', newTokenData.token, { httpOnly: true });
    }

    req.user = decoded; 
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token. Please log in again." });
    }
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};
