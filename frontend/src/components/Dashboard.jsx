import { Link } from "react-router-dom";
import { ROLE_LABELS } from "../constant";
import Icon from "./Icon";

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
          <strong>{ROLE_LABELS[user.role]}</strong>
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

          <strong>{ROLE_LABELS[user.role]}</strong>

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

export default Dashboard;
