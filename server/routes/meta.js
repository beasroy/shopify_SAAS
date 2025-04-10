import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { fetchInterestData } from "../controller/fbInterest.js";
import { handleCampaignData } from "../controller/fbCampaign.js";
import { fetchFbAgeReports, fetchFbAudienceReports, fetchFbCountryReports, fetchFbDeviceReports, fetchFbGenderReports, fetchFbPlacementReports, fetchFbPlatformReports} from "../controller/fbReports.js";


const router = express.Router();

router.post("/interest/:brandId", verifyAuth, fetchInterestData);
router.post("/campaign/:brandId", verifyAuth, handleCampaignData);
router.post("/report/age/:brandId", verifyAuth, fetchFbAgeReports);
router.post("/report/gender/:brandId", verifyAuth, fetchFbGenderReports);
router.post("/report/device/:brandId",verifyAuth, fetchFbDeviceReports);
router.post("/report/country/:brandId",verifyAuth, fetchFbCountryReports);
router.post("/report/audience/:brandId",verifyAuth, fetchFbAudienceReports);
router.post("/report/platform/:brandId",verifyAuth, fetchFbPlatformReports);
router.post("/report/placement/:brandId",verifyAuth, fetchFbPlacementReports);


export default router;