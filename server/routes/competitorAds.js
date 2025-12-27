import express from "express";
import {
  fetchAndStoreCompetitorAds,
  getCompetitorAds,
  addCompetitorBrand,
  removeCompetitorBrand,
  getCompetitorBrands,
  searchCompetitorAds
} from "../controller/competitorAds.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

// Competitor brand management
router.get("/competitor-brands/:brandId", verifyAuth, getCompetitorBrands);
router.post("/competitor-brands/:brandId", verifyAuth, addCompetitorBrand);
router.delete("/competitor-brands/:brandId", verifyAuth, removeCompetitorBrand);

// Competitor ads management
router.post("/competitor-ads/:brandId", verifyAuth, fetchAndStoreCompetitorAds);
router.get("/competitor-ads/:brandId", verifyAuth, getCompetitorAds);
router.get("/search-ads/:brandId", verifyAuth, searchCompetitorAds);

export default router;


