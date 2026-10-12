import { Router } from "express";
import {
  createTrip,
  deleteTrip,
  getEstimateBasis,
  getTrip,
  getTrips,
  recalculateTripRoutes,
  updateTrip
} from "../controllers/tripController.js";
import { protect } from "../middleware/auth.js";
import { routeLimiter } from "../middleware/rateLimit.js";

// Admins can look at every trip but not change them (roadmap proposal).
function viewOnlyForAdmins(req, res, next) {
  if (req.user.role === "Admin") {
    return res.status(403).json({ success: false, message: "Admins can view trips but not change them" });
  }
  next();
}

const router = Router();
router.use(protect);
router.route("/").get(getTrips).post(viewOnlyForAdmins, routeLimiter, createTrip);
router.get("/estimate-basis", getEstimateBasis);
router
  .route("/:id")
  .get(getTrip)
  .put(viewOnlyForAdmins, routeLimiter, updateTrip)
  .delete(viewOnlyForAdmins, deleteTrip);
router.post("/:id/routes", viewOnlyForAdmins, routeLimiter, recalculateTripRoutes);
export default router;
