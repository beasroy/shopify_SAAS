import express from "express";
import { userLogin, userRegistration } from "../controller/auth.js";

const router = express.Router();
router.post("/signup",userRegistration);
router.post("/login",userLogin)

export default router;

