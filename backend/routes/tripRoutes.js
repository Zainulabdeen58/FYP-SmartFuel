import { Router } from "express";
import {
  createTrip,
  deleteTrip,
  getEstimateBasis,
  getTrip,
  getTrips,
  planTripAgain,
  recalculateTripRoutes,
  updateTrip
} from "../controllers/tripController.js";
import { nonAdminOnly, protect } from "../middleware/auth.js";
import { routeLimiter } from "../middleware/rateLimit.js";

// Admins can look at every trip but not change them (roadmap proposal).
const viewOnlyForAdmins = nonAdminOnly("Admins can view trips but not change them");

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
router.post("/:id/plan-again", viewOnlyForAdmins, planTripAgain);
export default router;
