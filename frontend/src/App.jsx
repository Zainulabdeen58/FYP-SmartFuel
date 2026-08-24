import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api from "./api";
import "./SmartFuel.css";

/* =========================
   ICONS
========================= */

const Icon = ({ name, size = 20 }) => {
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),

    car: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 17h14l1-5-2-5H6l-2 5 1 5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M7 12h10" stroke="currentColor" strokeWidth="1.8" />
        <circle
          cx="7"
          cy="17"
          r="1.7"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="17"
          cy="17"
          r="1.7"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),

    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),

    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.7v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 7.4 15a1.7 1.7 0 0 0-1.56-1.03H5.75v-2.7h.09A1.7 1.7 0 0 0 7.4 10.24a1.7 1.7 0 0 0-.34-1.88L7 8.3l1.9-1.9.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V5h2.7v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.9 1.9-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03H20v2.7h-.09A1.7 1.7 0 0 0 19.4 15Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    ),

    shield: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3 20 6v5c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6l8-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),

    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M10 5H5v14h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14 8l4 4-4 4M18 12H9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),

    arrow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12h13M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),

    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),

    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 7h14M10 11v6M14 11v6M9 7l1-2h4l1 2M7 7l1 14h8l1-14"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),

    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle
          cx="11"
          cy="11"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m16 16 4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),

    fuel: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M7 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M5 21h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9 7h6M19 8l2 2v7a2 2 0 0 1-2 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),

    menu: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),

    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),

    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="m5 12 4 4L19 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };

  return icons[name] || null;
};

/* =========================
   AUTH
========================= */

function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const save = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return { user, save, logout };
}

/* =========================
   LAYOUT
========================= */

function Layout({ user, logout, children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    },
    {
      to: "/vehicles",
      label: "Vehicles",
      icon: "car",
    },
    {
      to: "/profile",
      label: "Profile",
      icon: "user",
    },
  ];

  if (user.role === "Admin") {
    links.push({
      to: "/admin",
      label: "Administration",
      icon: "shield",
    });
  }

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
              <span>{user.role}</span>
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

/* =========================
   PROTECTED ROUTE
========================= */

function Protected({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

/* =========================
   AUTH PAGE
========================= */

function AuthPage({ mode, save }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(
    mode === "login"
      ? {
          email: "",
          password: "",
        }
      : {
          fullName: "",
          email: "",
          contactNumber: "",
          role: "Individual",
          password: "",
        },
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";

      const { data } = await api.post(endpoint, form);

      save(data);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-orb orb-one" />
        <div className="auth-orb orb-two" />
      </div>

      <div className="auth-container">
        <div className="auth-showcase">
          <Link to="/login" className="logo auth-logo">
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

          <div className="showcase-content">
            <span className="eyebrow">SMART RESOURCE MANAGEMENT</span>

            <h1>
              Manage your fleet.
              <br />
              <span>Drive smarter.</span>
            </h1>

            <p>
              A modern workspace for managing vehicles, users and fuel resources
              with clarity and control.
            </p>

            <div className="showcase-features">
              <div>
                <span className="feature-check">
                  <Icon name="check" size={14} />
                </span>
                <span>Centralized vehicle records</span>
              </div>

              <div>
                <span className="feature-check">
                  <Icon name="check" size={14} />
                </span>
                <span>Simple resource management</span>
              </div>

              <div>
                <span className="feature-check">
                  <Icon name="check" size={14} />
                </span>
                <span>Secure account access</span>
              </div>
            </div>
          </div>

          <div className="auth-footer">
            © {new Date().getFullYear()} SmartFuel
          </div>
        </div>

        <div className="auth-form-wrap">
          <form className="auth-form" onSubmit={submit}>
            <div className="auth-form-header">
              <span className="form-kicker">
                {mode === "login" ? "WELCOME BACK" : "GET STARTED"}
              </span>

              <h2>
                {mode === "login"
                  ? "Sign in to your workspace"
                  : "Create your account"}
              </h2>

              <p>
                {mode === "login"
                  ? "Enter your details to continue."
                  : "Set up your SmartFuel workspace in a few seconds."}
              </p>
            </div>

            {mode === "register" && (
              <>
                <div className="field">
                  <label>Full name</label>
                  <input
                    placeholder="e.g. John Smith"
                    required
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fullName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="field">
                  <label>Contact number</label>
                  <input
                    placeholder="+92 300 1234567"
                    required
                    value={form.contactNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contactNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="field">
                  <label>Account type</label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value,
                      })
                    }
                  >
                    <option>Individual</option>
                    <option>Admin</option>
                  </select>
                </div>
              </>
            )}

            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                required
                minLength="6"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button className="submit-button" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}

              {!loading && <Icon name="arrow" size={18} />}
            </button>

            <div className="auth-switch">
              {mode === "login" ? (
                <>
                  Don't have an account?
                  <Link to="/register">Create one</Link>
                </>
              ) : (
                <>
                  Already have an account?
                  <Link to="/login">Sign in</Link>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard({ user }) {
  return (
    <section>
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">OVERVIEW</span>

          <h1>
            Good to see you,
            <br />
            <span>{user.fullName}</span>
          </h1>

          <p>Here's what's happening across your SmartFuel workspace.</p>
        </div>

        <div className="date-card">
          <span>ACCOUNT</span>
          <strong>{user.role}</strong>
          <small>Active workspace</small>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span>ACCOUNT TYPE</span>

            <div className="metric-icon green">
              <Icon name="user" size={19} />
            </div>
          </div>

          <strong>{user.role}</strong>

          <div className="metric-bottom">
            <span className="metric-dot green-dot" />
            Active account
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>EMAIL</span>

            <div className="metric-icon blue">
              <Icon name="user" size={19} />
            </div>
          </div>

          <strong className="email-value">{user.email}</strong>

          <div className="metric-bottom">
            <span className="metric-dot blue-dot" />
            Account email
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>RESOURCE</span>

            <div className="metric-icon purple">
              <Icon name="car" size={19} />
            </div>
          </div>

          <strong>Vehicles</strong>

          <div className="metric-bottom">
            <span className="metric-dot purple-dot" />
            Fleet management
          </div>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">QUICK ACCESS</span>
          <h2>Workspace</h2>
        </div>

        <span className="section-description">
          Manage your resources from one place
        </span>
      </div>

      <div className="feature-grid">
        <Link to="/vehicles" className="workspace-card">
          <div className="workspace-card-top">
            <div className="workspace-icon green">
              <Icon name="car" size={23} />
            </div>

            <span className="card-arrow">
              <Icon name="arrow" size={18} />
            </span>
          </div>

          <div>
            <span className="card-label">FLEET</span>
            <h3>Vehicle management</h3>

            <p>
              Create, view, update and manage your registered vehicle records.
            </p>
          </div>

          <div className="workspace-link">
            Manage vehicles
            <Icon name="arrow" size={16} />
          </div>
        </Link>

        <Link to="/profile" className="workspace-card">
          <div className="workspace-card-top">
            <div className="workspace-icon blue">
              <Icon name="settings" size={23} />
            </div>

            <span className="card-arrow">
              <Icon name="arrow" size={18} />
            </span>
          </div>

          <div>
            <span className="card-label">ACCOUNT</span>
            <h3>Profile settings</h3>

            <p>
              Keep your personal account information accurate and up to date.
            </p>
          </div>

          <div className="workspace-link blue-text">
            Manage profile
            <Icon name="arrow" size={16} />
          </div>
        </Link>

        {user.role === "Admin" && (
          <Link to="/admin" className="workspace-card">
            <div className="workspace-card-top">
              <div className="workspace-icon purple">
                <Icon name="shield" size={23} />
              </div>

              <span className="card-arrow">
                <Icon name="arrow" size={18} />
              </span>
            </div>

            <div>
              <span className="card-label">ADMIN</span>
              <h3>Administration</h3>

              <p>Manage registered users and organization vehicle records.</p>
            </div>

            <div className="workspace-link purple-text">
              Open administration
              <Icon name="arrow" size={16} />
            </div>
          </Link>
        )}
      </div>

      <div className="info-banner">
        <div className="info-icon">
          <Icon name="fuel" size={21} />
        </div>

        <div>
          <strong>Smart resource management</strong>
          <p>
            Keep your vehicle information organized and accessible from your
            centralized workspace.
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================
   VEHICLE FORM
========================= */

const emptyVehicle = {
  vehicleName: "",
  registrationNumber: "",
  manufacturer: "",
  modelYear: "",
  fuelType: "Petrol",
  fuelEfficiency: "",
  fuelTankCapacity: "",
};

function VehicleForm({ initial = emptyVehicle, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/vehicles", form);
      onSave(data.vehicle);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save vehicle");
    } finally {
      setLoading(false);
    }
  };

  const labels = {
    vehicleName: "Vehicle name",
    registrationNumber: "Registration number",
    manufacturer: "Manufacturer",
    modelYear: "Model year",
    fuelType: "Fuel type",
    fuelEfficiency: "Fuel efficiency",
    fuelTankCapacity: "Fuel tank capacity",
  };

  return (
    <div className="modal-backdrop">
      <form className="vehicle-modal" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">NEW RECORD</span>
            <h2>Add vehicle</h2>
            <p>Enter the vehicle information below.</p>
          </div>

          <button type="button" className="modal-close" onClick={onCancel}>
            <Icon name="close" />
          </button>
        </div>

        <div className="vehicle-form-grid">
          {Object.entries(form).map(([key, value]) =>
            key === "fuelType" ? (
              <div className="field" key={key}>
                <label>{labels[key]}</label>

                <select
                  value={value}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]: e.target.value,
                    })
                  }
                >
                  <option>Petrol</option>
                  <option>Diesel</option>
                  <option>Electric</option>
                </select>
              </div>
            ) : (
              <div className="field" key={key}>
                <label>{labels[key]}</label>

                <input
                  type={
                    [
                      "modelYear",
                      "fuelEfficiency",
                      "fuelTankCapacity",
                    ].includes(key)
                      ? "number"
                      : "text"
                  }
                  placeholder={`Enter ${labels[key].toLowerCase()}`}
                  required
                  value={value}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]: e.target.value,
                    })
                  }
                />
              </div>
            ),
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>

          <button className="submit-button small" disabled={loading}>
            {loading ? "Saving..." : "Save vehicle"}
            {!loading && <Icon name="check" size={17} />}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================
   VEHICLES
========================= */

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/vehicles");
      setVehicles(data.vehicles);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load vehicles");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm("Delete this vehicle?")) return;

    try {
      await api.delete(`/vehicles/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete vehicle");
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">RESOURCE LIBRARY</span>
          <h1>Vehicles</h1>

          <p>Manage your registered vehicles and their fuel information.</p>
        </div>

        <button
          className="submit-button small"
          onClick={() => setShowForm(true)}
        >
          <Icon name="plus" size={18} />
          Add vehicle
        </button>
      </div>

      {error && <div className="form-error page-error">{error}</div>}

      <div className="vehicle-summary">
        <div>
          <span>Total vehicles</span>
          <strong>{vehicles.length}</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Fuel types</span>
          <strong>
            {new Set(vehicles.map((vehicle) => vehicle.fuelType)).size}
          </strong>
        </div>

        <div className="summary-divider" />

        <div className="summary-note">
          <span className="status-dot" />
          Records synced
        </div>
      </div>

      {showForm && (
        <VehicleForm
          onSave={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="vehicle-list">
        {vehicles.map((v) => (
          <div className="vehicle-row" key={v._id}>
            <div className="vehicle-main">
              <div className="vehicle-avatar">
                <Icon name="car" size={22} />
              </div>

              <div className="vehicle-info">
                <div className="vehicle-title">
                  <h3>{v.vehicleName}</h3>

                  <span className="vehicle-badge">{v.fuelType}</span>
                </div>

                <div className="vehicle-meta">
                  <span>{v.registrationNumber}</span>

                  <span className="meta-separator">•</span>

                  <span>{v.manufacturer}</span>

                  <span className="meta-separator">•</span>

                  <span>{v.modelYear}</span>
                </div>

                <div className="vehicle-details">
                  <span>
                    Efficiency: <strong>{v.fuelEfficiency} km/l</strong>
                  </span>

                  <span>
                    Tank: <strong>{v.fuelTankCapacity}</strong>
                  </span>

                  {v.user && (
                    <span>
                      Owner: <strong>{v.user.fullName}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              className="delete-button"
              onClick={() => remove(v._id)}
              title="Delete vehicle"
            >
              <Icon name="trash" size={17} />
              Delete
            </button>
          </div>
        ))}

        {!vehicles.length && (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="car" size={28} />
            </div>

            <h3>No vehicles yet</h3>

            <p>Add your first vehicle to start managing your fleet.</p>

            <button
              className="submit-button small"
              onClick={() => setShowForm(true)}
            >
              <Icon name="plus" size={17} />
              Add first vehicle
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================
   PROFILE
========================= */

function Profile({ user, saveUser }) {
  const [form, setForm] = useState({
    ...user,
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { data } = await api.put("/users/profile", form);

      localStorage.setItem("user", JSON.stringify(data.user));

      saveUser(data.user);
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>Profile</h1>

          <p>Manage your personal information and account settings.</p>
        </div>
      </div>

      <div className="profile-layout">
        <div className="profile-sidebar">
          <div className="large-avatar">
            {user.fullName?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <h3>{user.fullName}</h3>
          <span>{user.role}</span>

          <div className="profile-status">
            <span className="status-dot" />
            Account active
          </div>
        </div>

        <form className="profile-form" onSubmit={submit}>
          <div className="form-section-heading">
            <div>
              <h2>Personal information</h2>
              <p>Update the information associated with your account.</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="field">
              <label>Full name</label>

              <input
                value={form.fullName}
                required
                onChange={(e) =>
                  setForm({
                    ...form,
                    fullName: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>Email address</label>

              <input
                type="email"
                value={form.email}
                required
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>Contact number</label>

              <input
                value={form.contactNumber}
                required
                onChange={(e) =>
                  setForm({
                    ...form,
                    contactNumber: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>New password</label>

              <input
                type="password"
                placeholder="Leave blank to keep current password"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="profile-role">
            <span>ACCOUNT ROLE</span>
            <strong>{user.role}</strong>
          </div>

          {message && (
            <div className="success-message">
              <Icon name="check" size={16} />
              {message}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="profile-actions">
            <button className="submit-button small" disabled={loading}>
              {loading ? "Updating..." : "Save changes"}
              {!loading && <Icon name="check" size={17} />}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

/* =========================
   ADMIN
========================= */

function Admin() {
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [search, setSearch] = useState({
    user: "",
    registrationNumber: "",
  });

  const [tab, setTab] = useState("users");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load users");
    }
  };

  const loadVehicles = async () => {
    try {
      const { data } = await api.get("/admin/vehicles", {
        params: search,
      });

      setVehicles(data.vehicles);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load vehicles");
    }
  };

  useEffect(() => {
    loadUsers();
    loadVehicles();
  }, []);

  const deleteUser = async (id) => {
    if (confirm("Delete this user and their vehicles?")) {
      try {
        await api.delete(`/admin/users/${id}`);

        loadUsers();
        loadVehicles();
      } catch (err) {
        setError(err.response?.data?.message || "Could not delete user");
      }
    }
  };

  const deleteVehicle = async (id) => {
    if (!confirm("Delete this vehicle?")) return;

    try {
      await api.delete(`/vehicles/${id}`);
      loadVehicles();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete vehicle");
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>

          <h1>Management</h1>

          <p>Manage users and vehicle records across the workspace.</p>
        </div>
      </div>

      {error && <div className="form-error page-error">{error}</div>}

      <div className="admin-stats">
        <div>
          <span>USERS</span>
          <strong>{users.length}</strong>
        </div>

        <div>
          <span>VEHICLES</span>
          <strong>{vehicles.length}</strong>
        </div>

        <div>
          <span>STATUS</span>
          <strong className="online-text">Operational</strong>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={tab === "users" ? "active" : ""}
          onClick={() => setTab("users")}
        >
          <Icon name="user" size={17} />
          Users
        </button>

        <button
          className={tab === "vehicles" ? "active" : ""}
          onClick={() => setTab("vehicles")}
        >
          <Icon name="car" size={17} />
          Vehicles
        </button>
      </div>

      {tab === "users" ? (
        <div className="admin-list">
          {users.map((u) => (
            <div className="admin-row" key={u._id}>
              <div className="admin-person">
                <div className="table-avatar">
                  {u.fullName?.charAt(0)?.toUpperCase()}
                </div>

                <div>
                  <strong>{u.fullName}</strong>
                  <span>{u.email}</span>
                </div>
              </div>

              <div className="admin-contact">{u.contactNumber}</div>

              <span className="role-badge">{u.role}</span>

              <button
                className="delete-button"
                onClick={() => deleteUser(u._id)}
              >
                <Icon name="trash" size={16} />
                Delete
              </button>
            </div>
          ))}

          {!users.length && (
            <div className="empty-state">
              <h3>No users found</h3>
            </div>
          )}
        </div>
      ) : (
        <div>
          <form
            className="admin-search"
            onSubmit={(e) => {
              e.preventDefault();
              loadVehicles();
            }}
          >
            <div className="search-input">
              <Icon name="search" size={18} />

              <input
                placeholder="Search by user name or email"
                value={search.user}
                onChange={(e) =>
                  setSearch({
                    ...search,
                    user: e.target.value,
                  })
                }
              />
            </div>

            <div className="search-input">
              <Icon name="car" size={18} />

              <input
                placeholder="Registration number"
                value={search.registrationNumber}
                onChange={(e) =>
                  setSearch({
                    ...search,
                    registrationNumber: e.target.value,
                  })
                }
              />
            </div>

            <button className="submit-button small">
              <Icon name="search" size={17} />
              Search
            </button>
          </form>

          <div className="admin-list">
            {vehicles.map((v) => (
              <div className="admin-row vehicle-admin-row" key={v._id}>
                <div className="admin-person">
                  <div className="table-avatar car-avatar">
                    <Icon name="car" size={19} />
                  </div>

                  <div>
                    <strong>{v.vehicleName}</strong>

                    <span>{v.registrationNumber}</span>
                  </div>
                </div>

                <div className="admin-contact">
                  {v.manufacturer} · {v.modelYear}
                </div>

                <span className="role-badge">{v.fuelType}</span>

                <button
                  className="delete-button"
                  onClick={() => deleteVehicle(v._id)}
                >
                  <Icon name="trash" size={16} />
                  Delete
                </button>
              </div>
            ))}

            {!vehicles.length && (
              <div className="empty-state">
                <h3>No vehicles found</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================
   APP
========================= */

export default function App() {
  const { user, save, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(user);
  const location = useLocation();

  if (!user && !["/login", "/register"].includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {user ? (
        <Layout user={user} logout={logout}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={user} />} />

            <Route path="/vehicles" element={<Vehicles />} />

            <Route
              path="/profile"
              element={
                <Profile user={currentUser || user} saveUser={setCurrentUser} />
              }
            />

            <Route
              path="/admin"
              element={
                user.role === "Admin" ? (
                  <Admin />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route
            path="/login"
            element={<AuthPage mode="login" save={save} />}
          />

          <Route
            path="/register"
            element={<AuthPage mode="register" save={save} />}
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
}
