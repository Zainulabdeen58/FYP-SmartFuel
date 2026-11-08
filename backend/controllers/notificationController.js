import Notification from "../models/Notification.js";

// The routes block admins. Every query is limited to req.user's own notifications, so
// another user's notification answers 404, the same as one that doesn't exist.
// Notifications are made by utils/notifications.js, never through this API.

const MAX_NOTIFICATIONS_SHOWN = 50;

// GET /notifications: the newest notifications and how many of all are unread.
export async function getNotifications(req, res) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .select("type message link read createdAt")
      .sort({ createdAt: -1 })
      .limit(MAX_NOTIFICATIONS_SHOWN),
    Notification.countDocuments({ user: req.user._id, read: false })
  ]);
  res.json({ success: true, notifications, unreadCount });
}

// PUT /notifications/:id/read
export async function markNotificationRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  ).select("type message link read createdAt");
  if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
  res.json({ success: true, notification });
}

// PUT /notifications/read-all
export async function markAllNotificationsRead(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: "All notifications marked as read" });
}
