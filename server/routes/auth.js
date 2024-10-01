import express from "express";
import { userLogin, userLogout, userRegistration } from "../controller/auth.js";

const router = express.Router();
router.post("/signup",userRegistration);
router.post("/login",userLogin)
router.post("/logout",userLogout)

export default router;

