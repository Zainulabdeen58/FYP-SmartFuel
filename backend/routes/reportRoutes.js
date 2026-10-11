import { Router } from "express";
import { getFuelReport } from "../controllers/reportController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", getFuelReport);
export default router;
