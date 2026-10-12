import { Router } from "express";
import {
  acceptSuggestion,
  getCrisisAdvice,
  ignoreSuggestion,
  setCrisisMode,
  showIgnoredSuggestions
} from "../controllers/crisisController.js";
import { nonAdminOnly, protect } from "../middleware/auth.js";

// Admins have no trips of their own, so no crisis mode.
const router = Router();
router.use(protect, nonAdminOnly("Admin accounts do not have crisis mode"));
router.get("/", getCrisisAdvice);
router.put("/mode", setCrisisMode);
router.post("/suggestions/:id/accept", acceptSuggestion);
router.post("/suggestions/:id/ignore", ignoreSuggestion);
router.delete("/ignored", showIgnoredSuggestions);
export default router;
