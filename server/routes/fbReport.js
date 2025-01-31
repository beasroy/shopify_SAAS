import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { fetchFbAgeReports, fetchFbAudienceReports, fetchFbCountryReports, fetchFbDeviceReports, fetchFbGenderReports, fetchFbPlacementReports, fetchFbPlatformReports} from "../controller/fbReports.js";

const router = express.Router();

router.post("/age/:brandId", verifyAuth, fetchFbAgeReports);
router.post("/gender/:brandId", verifyAuth, fetchFbGenderReports);
router.post("/device/:brandId",verifyAuth, fetchFbDeviceReports);
router.post("/country/:brandId",verifyAuth, fetchFbCountryReports);
router.post("/audience/:brandId",verifyAuth, fetchFbAudienceReports);
router.post("/platform/:brandId",verifyAuth, fetchFbPlatformReports);
router.post("/placement/:brandId",verifyAuth, fetchFbPlacementReports);

export default router;