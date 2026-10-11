import { Link } from "react-router-dom";
import { ROLE_LABELS } from "../constant";
import BudgetCard from "./BudgetCard";
import Icon from "./Icon";

// Quick-access cards; the admin card is shown to admins only.
const WORKSPACE_CARDS = [
  {
    to: "/vehicles",
    icon: "car",
    color: "green",
    label: "FLEET",
    title: "Vehicle management",
    text: "Create, view, update and manage your registered vehicle records.",
    linkText: "Manage vehicles",
  },
  {
    to: "/reports",
    icon: "chart",
    color: "purple",
    label: "ANALYTICS",
    title: "Reports",
    text: "Charts of fuel bought and money spent over time, and a comparison of your vehicles.",
    linkText: "Open reports",
  },
  {
    to: "/profile",
    icon: "settings",
    color: "blue",
    label: "ACCOUNT",
    title: "Profile settings",
    text: "Keep your personal account information accurate and up to date.",
    linkText: "Manage profile",
  },
];

const ADMIN_CARD = {
  to: "/admin",
  icon: "shield",
  color: "purple",
  label: "ADMIN",
  title: "Administration",
  text: "Manage registered users and organization vehicle records.",
  linkText: "Open administration",
};

function WorkspaceCard({ card }) {
  return (
    <Link to={card.to} className="workspace-card">
      <div className="workspace-card-top">
        <div className={`workspace-icon ${card.color}`}>
          <Icon name={card.icon} size={23} />
        </div>

        <span className="card-arrow">
          <Icon name="arrow" size={18} />
        </span>
      </div>

      <div>
        <span className="card-label">{card.label}</span>
        <h3>{card.title}</h3>
        <p>{card.text}</p>
      </div>

      <div className={`workspace-link ${card.color}-text`}>
        {card.linkText}
        <Icon name="arrow" size={16} />
      </div>
    </Link>
  );
}

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

      {user.role !== "Admin" && <BudgetCard user={user} />}

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
        {WORKSPACE_CARDS.map((card) => (
          <WorkspaceCard key={card.to} card={card} />
        ))}
        {user.role === "Admin" && <WorkspaceCard card={ADMIN_CARD} />}
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
