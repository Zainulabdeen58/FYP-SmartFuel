import { Router } from "express";
import {
  createVehicle,
  getVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle
} from "../controllers/vehicleController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.route("/").post(createVehicle).get(getVehicles);
router.route("/:id").get(getVehicle).put(updateVehicle).delete(deleteVehicle);
export default router;
