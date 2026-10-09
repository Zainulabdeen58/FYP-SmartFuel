import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ADMIN_LINK, NAV_LINKS, ROLE_LABELS } from "../constant";
import Icon from "./Icon";
import useTheme from "../hooks/useTheme";

function Layout({ user, logout, children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const links =
    user.role === "Admin" ? [...NAV_LINKS, ADMIN_LINK] : NAV_LINKS;

  return (
    <div className="app-shell">
      <div className="background-grid" />
      <div className="glow glow-one" />
      <div className="glow glow-two" />

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Link
            to="/dashboard"
            className="logo"
            onClick={() => setMobileOpen(false)}
          >
            <div className="logo-symbol">
              <Icon name="fuel" size={20} />
            </div>

            <div>
              <strong>
                Smart<span>Fuel</span>
              </strong>
              <small>Resource management</small>
            </div>
          </Link>

          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <Icon name="close" />
          </button>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">WORKSPACE</span>

          <nav className="side-nav">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={location.pathname === link.to ? "active" : ""}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon">
                  <Icon name={link.icon} size={18} />
                </span>

                <span>{link.label}</span>

                {location.pathname === link.to && (
                  <span className="active-indicator" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">
              {user.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="sidebar-user-info">
              <strong>{user.fullName}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
          </div>

          <button className="sidebar-logout" onClick={logout}>
            <Icon name="logout" size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
            <Icon name="menu" />
          </button>

          <div className="topbar-title">
            <span>SmartFuel Workspace</span>
          </div>

          <div className="topbar-right">
            <div className="status">
              <span className="status-dot" />
              System operational
            </div>

            <button
              className="theme-toggle"
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle color theme"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>

            <Link to="/profile" className="top-avatar">
              {user.fullName?.charAt(0)?.toUpperCase() || "U"}
            </Link>
          </div>
        </header>

        <main className="content page-enter">{children}</main>
      </div>

      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}
    </div>
  );
}

export default Layout;
