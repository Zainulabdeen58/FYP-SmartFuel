import { useEffect } from "react";
import api, { setSavedChangeHandler } from "../api";
import useFetch from "./useFetch";

const CHECK_EVERY_MS = 60 * 1000;
const NO_NOTIFICATIONS = { notifications: [], unreadCount: 0 };

// The signed-in user's notifications (FR-13). They are checked again every minute (while the
// tab is visible), when the window gets focus, and after every change the user saves,
// because a saved change (a fuel record, a trip) is what makes a notification.
function useNotifications() {
  const { data, setData, error, reload } = useFetch(
    async () => {
      const { data } = await api.get("/notifications");
      return { notifications: data.notifications, unreadCount: data.unreadCount };
    },
    [],
    { initialData: NO_NOTIFICATIONS },
  );

  useEffect(() => {
    const check = () => {
      if (!document.hidden) reload();
    };
    const timer = setInterval(check, CHECK_EVERY_MS);
    window.addEventListener("focus", check);
    setSavedChangeHandler(check);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      setSavedChangeHandler(null);
    };
  }, [reload]);

  // Shown as read at once; if saving fails, the list is loaded again.
  const markRead = async (notification) => {
    if (notification.read) return;
    setData((current) => ({
      notifications: current.notifications.map((item) =>
        item._id === notification._id ? { ...item, read: true } : item,
      ),
      unreadCount: Math.max(current.unreadCount - 1, 0),
    }));
    try {
      await api.put(`/notifications/${notification._id}/read`);
    } catch {
      reload();
    }
  };

  const markAllRead = async () => {
    setData((current) => ({
      notifications: current.notifications.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
    }));
    try {
      await api.put("/notifications/read-all");
    } catch {
      reload();
    }
  };

  return { ...data, error, markRead, markAllRead };
}

export default useNotifications;
