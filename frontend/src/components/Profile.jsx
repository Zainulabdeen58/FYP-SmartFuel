import { useState } from "react";
import api from "../api";
import { ROLE_LABELS } from "../constant";
import useForm from "../hooks/useForm";
import Icon from "./Icon";
import {
  validateContactNumber,
  validateCurrentPassword,
  validateEmail,
  validateFullName,
  validateOrganizationName,
  validatePassword,
} from "../validation";

function Profile({ user, saveUser }) {
  const [message, setMessage] = useState("");
  const isOrganization = user.role === "Organizational";

  const {
    form,
    fieldErrors,
    error,
    loading,
    updateField,
    handleSubmit,
  } = useForm({
    initialValues: {
      fullName: user.fullName || "",
      email: user.email || "",
      contactNumber: user.contactNumber || "",
      organizationName: user.organizationName || "",
      currentPassword: "",
      password: "",
    },
    validate: (f) => ({
      fullName: validateFullName(f.fullName),
      email: validateEmail(f.email),
      contactNumber: validateContactNumber(f.contactNumber),
      organizationName: isOrganization
        ? validateOrganizationName(f.organizationName)
        : "",
      password: validatePassword(f.password, { required: false }),
      currentPassword: validateCurrentPassword(f.currentPassword, f.password),
    }),
    onSubmit: async (f, { setForm }) => {
      const payload = {
        fullName: f.fullName,
        email: f.email,
        contactNumber: f.contactNumber,
        ...(isOrganization && { organizationName: f.organizationName }),
        ...(f.password && {
          password: f.password,
          currentPassword: f.currentPassword,
        }),
      };

      const { data } = await api.put("/users/profile", payload);

      saveUser(data.user);
      setMessage(data.message);
      setForm((prev) => ({ ...prev, password: "", currentPassword: "" }));
    },
    errorMessage: "Could not update profile",
  });

  const submit = (e) => {
    setMessage("");
    handleSubmit(e);
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
          <span>{ROLE_LABELS[user.role]}</span>

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

            {isOrganization && (
              <div className="field">
                <label>Organization name</label>

                <input
                  value={form.organizationName}
                  className={fieldErrors.organizationName ? "invalid" : ""}
                  onChange={(e) =>
                    updateField("organizationName", e.target.value)
                  }
                />
                {fieldErrors.organizationName && (
                  <span className="field-error">
                    {fieldErrors.organizationName}
                  </span>
                )}
              </div>
            )}

            <div className="field">
              <label>New password</label>

              <input
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
                value={form.password}
                className={fieldErrors.password ? "invalid" : ""}
                onChange={(e) => updateField("password", e.target.value)}
              />
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </div>

            <div className="field">
              <label>Current password</label>

              <input
                type="password"
                autoComplete="current-password"
                placeholder="Needed only to set a new password"
                value={form.currentPassword}
                className={fieldErrors.currentPassword ? "invalid" : ""}
                onChange={(e) => updateField("currentPassword", e.target.value)}
              />
              {fieldErrors.currentPassword && (
                <span className="field-error">{fieldErrors.currentPassword}</span>
              )}
            </div>
          </div>

          <div className="profile-role">
            <span>ACCOUNT ROLE</span>
            <strong>{ROLE_LABELS[user.role]}</strong>
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
