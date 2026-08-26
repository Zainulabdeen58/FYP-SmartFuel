import { useState } from "react";
import api from "../api";
import Icon from "./Icon";
import {
  hasErrors,
  validateContactNumber,
  validateEmail,
  validateFullName,
  validatePassword,
} from "../validation";

function Profile({ user, saveUser }) {
  const [form, setForm] = useState({
    ...user,
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {
      fullName: validateFullName(form.fullName),
      email: validateEmail(form.email),
      contactNumber: validateContactNumber(form.contactNumber),
      password: validatePassword(form.password, { required: false }),
    };

    setFieldErrors(errors);
    return !hasErrors(errors);
  };

  const submit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!validate()) return;

    setLoading(true);

    try {
      const { data } = await api.put("/users/profile", form);

      localStorage.setItem("user", JSON.stringify(data.user));

      saveUser(data.user);
      setMessage(data.message);
      setForm((prev) => ({ ...prev, password: "" }));
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

        <form className="profile-form" onSubmit={submit} noValidate>
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
                className={fieldErrors.fullName ? "invalid" : ""}
                onChange={(e) => updateField("fullName", e.target.value)}
              />
              {fieldErrors.fullName && (
                <span className="field-error">{fieldErrors.fullName}</span>
              )}
            </div>

            <div className="field">
              <label>Email address</label>

              <input
                type="email"
                value={form.email}
                className={fieldErrors.email ? "invalid" : ""}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="field">
              <label>Contact number</label>

              <input
                value={form.contactNumber}
                className={fieldErrors.contactNumber ? "invalid" : ""}
                onChange={(e) => updateField("contactNumber", e.target.value)}
              />
              {fieldErrors.contactNumber && (
                <span className="field-error">{fieldErrors.contactNumber}</span>
              )}
            </div>

            <div className="field">
              <label>New password</label>

              <input
                type="password"
                placeholder="Leave blank to keep current password"
                value={form.password}
                className={fieldErrors.password ? "invalid" : ""}
                onChange={(e) => updateField("password", e.target.value)}
              />
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
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

export default Profile;
