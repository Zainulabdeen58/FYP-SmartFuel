import { createPortal } from "react-dom";
import api from "../api";
import useForm from "../hooks/useForm";
import Icon from "./Icon";
import {
  validateContactNumber,
  validateEmail,
  validateFullName,
  validateRole,
} from "../validation";

function UserForm({ user, onSave, onCancel, lockRole = false }) {
  const {
    form,
    fieldErrors,
    error,
    loading,
    updateField,
    handleSubmit: submit,
  } = useForm({
    initialValues: {
      fullName: user.fullName || "",
      email: user.email || "",
      contactNumber: user.contactNumber || "",
      role: user.role || "Individual",
    },
    validate: (f) => ({
      fullName: validateFullName(f.fullName),
      email: validateEmail(f.email),
      contactNumber: validateContactNumber(f.contactNumber),
      role: validateRole(f.role),
    }),
    onSubmit: async (f) => {
      const { data } = await api.put(`/admin/users/${user._id}`, f);
      onSave(data.user);
    },
    errorMessage: "Could not update user",
  });

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <form
        className="vehicle-modal"
        onSubmit={submit}
        noValidate
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">USER DETAILS</span>
            <h2>Edit user</h2>
            <p>View and update this user account.</p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="vehicle-form-grid">
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
            <label>Account type</label>
            <select
              value={form.role}
              disabled={lockRole}
              className={fieldErrors.role ? "invalid" : ""}
              onChange={(e) => updateField("role", e.target.value)}
            >
              <option value="Individual">Individual</option>
              <option value="Admin">Admin</option>
            </select>
            {fieldErrors.role && (
              <span className="field-error">{fieldErrors.role}</span>
            )}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>

          <button className="submit-button small" disabled={loading}>
            {loading ? "Saving..." : "Update user"}
            {!loading && <Icon name="check" size={17} />}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export default UserForm;
