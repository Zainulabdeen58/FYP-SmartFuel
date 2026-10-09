import { Router } from "express";
import { login, logout, register } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimit.js";

const router = Router();
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", protect, logout);
export default router;
