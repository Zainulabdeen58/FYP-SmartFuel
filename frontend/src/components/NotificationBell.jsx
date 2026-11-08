import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NOTIFICATION_KEEP_DAYS, NOTIFICATION_KINDS } from "../constant";
import { formatTimeAgo } from "../format";
import useNotifications from "../hooks/useNotifications";
import Icon from "./Icon";

// Top bar bell (FR-13): the unread count, and the list that opens on click. Opening a
// notification marks it read and goes to the page it is about.
function NotificationBell() {
  const { notifications, unreadCount, error, markRead, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  // The list closes on a click outside it or on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event) => {
      if (!boxRef.current.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const openNotification = (notification) => {
    markRead(notification);
    setIsOpen(false);
    navigate(notification.link);
  };

  return (
    <div className="notification-bell" ref={boxRef}>
      <button
        type="button"
        className="icon-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" className="text-button" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {!notifications.length && (
            <p className="notification-empty">
              {error || "No notifications yet. You will get one when a budget nears its limit, a trip takes a costly route, or crisis mode has a suggestion."}
            </p>
          )}

          <ul className="notification-list">
            {notifications.map((notification) => {
              const kind = NOTIFICATION_KINDS[notification.type];
              return (
                <li key={notification._id}>
                  <button
                    type="button"
                    className={`notification-item ${notification.type}${notification.read ? "" : " unread"}`}
                    onClick={() => openNotification(notification)}
                  >
                    <span className="notification-icon">
                      <Icon name={kind.icon} size={16} />
                    </span>
                    <span className="notification-text">
                      <strong>{kind.title}</strong>
                      <span>{notification.message}</span>
                      <small>{formatTimeAgo(notification.createdAt)}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="notification-footnote">Notifications are deleted after {NOTIFICATION_KEEP_DAYS} days.</p>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
