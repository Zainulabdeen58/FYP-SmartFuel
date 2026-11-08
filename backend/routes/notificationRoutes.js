import { Router } from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notificationController.js";
import { nonAdminOnly, protect } from "../middleware/auth.js";

// Every event (budgets, trips, crisis mode) belongs to non-admin accounts, so admins have none.
const router = Router();
router.use(protect, nonAdminOnly("Admin accounts do not have notifications"));
router.get("/", getNotifications);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markNotificationRead);
export default router;
