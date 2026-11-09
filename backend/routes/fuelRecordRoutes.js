import { Router } from "express";
import {
  createFuelRecord,
  getFuelRecord,
  getFuelRecords,
  updateFuelRecord,
  deleteFuelRecord
} from "../controllers/fuelRecordController.js";
import { nonAdminOnly, protect } from "../middleware/auth.js";

// Admins may view every entry; only vehicle owners record real purchases.
const viewOnlyForAdmins = nonAdminOnly(
  "Admins can view fuel records but not add or change them. Vehicle owners record their own purchases."
);

const router = Router();
router.use(protect);
router.route("/").get(getFuelRecords).post(viewOnlyForAdmins, createFuelRecord);
router
  .route("/:id")
  .get(getFuelRecord)
  .put(viewOnlyForAdmins, updateFuelRecord)
  .delete(viewOnlyForAdmins, deleteFuelRecord);
export default router;
