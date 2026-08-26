import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import useForm from "../hooks/useForm";
import Icon from "./Icon";
import {
  validateContactNumber,
  validateEmail,
  validateFullName,
  validatePassword,
  validateRole,
} from "../validation";

function getInitialForm(mode) {
  if (mode === "login") {
    return { email: "", password: "" };
  }

  return {
    fullName: "",
    email: "",
    contactNumber: "",
    role: "Individual",
    password: "",
  };
}

function AuthPage({ mode, save }) {
  const navigate = useNavigate();
  const isLogin = mode === "login";

  const {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    error,
    setError,
    loading,
    updateField,
    handleSubmit: submit,
  } = useForm({
    initialValues: getInitialForm(mode),
    validate: (f) =>
      isLogin
        ? {
            email: validateEmail(f.email),
            password: validatePassword(f.password),
          }
        : {
            fullName: validateFullName(f.fullName),
            contactNumber: validateContactNumber(f.contactNumber),
            role: validateRole(f.role || "Individual"),
            email: validateEmail(f.email),
            password: validatePassword(f.password),
          },
    onSubmit: async (f) => {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin ? f : { ...f, role: f.role || "Individual" };
      const { data } = await api.post(endpoint, payload);
      save(data);
      navigate("/dashboard");
    },
    errorMessage: "Something went wrong. Please try again.",
  });

  useEffect(() => {
    setForm(getInitialForm(mode));
    setFieldErrors({});
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="auth-form-header">
              <span className="form-kicker">
                {isLogin ? "WELCOME BACK" : "GET STARTED"}
              </span>

              <h2>
                {isLogin ? "Sign in to your workspace" : "Create your account"}
              </h2>

              <p>
                {isLogin
                  ? "Enter your details to continue."
                  : "Set up your SmartFuel workspace in a few seconds."}
              </p>
            </div>

            {!isLogin && (
              <>
                <div className="field">
                  <label>Full name</label>
                  <input
                    placeholder="e.g. John Smith"
                    value={form.fullName || ""}
                    className={fieldErrors.fullName ? "invalid" : ""}
                    onChange={(e) => updateField("fullName", e.target.value)}
                  />
                  {fieldErrors.fullName && (
                    <span className="field-error">{fieldErrors.fullName}</span>
                  )}
                </div>

                <div className="field">
                  <label>Contact number</label>
                  <input
                    placeholder="+92 300 1234567"
                    value={form.contactNumber || ""}
                    className={fieldErrors.contactNumber ? "invalid" : ""}
                    onChange={(e) =>
                      updateField("contactNumber", e.target.value)
                    }
                  />
                  {fieldErrors.contactNumber && (
                    <span className="field-error">
                      {fieldErrors.contactNumber}
                    </span>
                  )}
                </div>

                <div className="field">
                  <label>Account type</label>
                  <div className="role-options">
                    <label
                      className={`role-option ${
                        (form.role || "Individual") === "Individual"
                          ? "active"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="Individual"
                        checked={(form.role || "Individual") === "Individual"}
                        onChange={(e) => updateField("role", e.target.value)}
                      />
                      Individual
                    </label>

                    <label
                      className={`role-option ${
                        form.role === "Admin" ? "active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="Admin"
                        checked={form.role === "Admin"}
                        onChange={(e) => updateField("role", e.target.value)}
                      />
                      Admin
                    </label>
                  </div>
                  {fieldErrors.role && (
                    <span className="field-error">{fieldErrors.role}</span>
                  )}
                </div>
              </>
            )}

            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email || ""}
                className={fieldErrors.email ? "invalid" : ""}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={form.password || ""}
                className={fieldErrors.password ? "invalid" : ""}
                onChange={(e) => updateField("password", e.target.value)}
              />
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}

            <button className="submit-button" disabled={loading}>
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}

              {!loading && <Icon name="arrow" size={18} />}
            </button>

            <div className="auth-switch">
              {isLogin ? (
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

export default AuthPage;
