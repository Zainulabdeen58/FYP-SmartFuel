import { Router } from "express";
import {
  createFuelRecord,
  getFuelRecord,
  getFuelRecords,
  updateFuelRecord,
  deleteFuelRecord
} from "../controllers/fuelRecordController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.route("/").post(createFuelRecord).get(getFuelRecords);
router.route("/:id").get(getFuelRecord).put(updateFuelRecord).delete(deleteFuelRecord);
export default router;
