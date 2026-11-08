import mongoose from "mongoose";
import { NOTIFICATION_KEEP_DAYS, NOTIFICATION_TYPES } from "../../shared/constants.js";

// One message to one user about a critical event (FR-13). Made by utils/notifications.js.
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    // Names the event (e.g. "budget-over:2026-10:overall"), so it is notified only once.
    key: { type: String, required: true },
    message: { type: String, required: true },
    // The page it is about, e.g. "/trips?trip=<id>".
    link: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// One notification per event per user, even when two requests arrive together.
notificationSchema.index({ user: 1, key: 1 }, { unique: true });
notificationSchema.index({ user: 1, createdAt: -1 });
// MongoDB deletes old notifications by itself.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_KEEP_DAYS * 24 * 60 * 60 });

export default mongoose.model("Notification", notificationSchema);
