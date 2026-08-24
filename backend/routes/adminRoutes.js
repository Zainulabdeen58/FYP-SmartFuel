import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  searchVehicles
} from "../controllers/adminController.js";

const router = Router();
router.use(protect, adminOnly);
router.get("/users", getUsers);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/vehicles", searchVehicles);

export default router;
