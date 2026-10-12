import { Router } from "express";
import { reversePlace, searchPlaces } from "../controllers/placeController.js";
import { protect } from "../middleware/auth.js";
import { placeLimiter } from "../middleware/rateLimit.js";

const router = Router();
router.use(protect, placeLimiter);
router.get("/search", searchPlaces);
router.get("/reverse", reversePlace);
export default router;
