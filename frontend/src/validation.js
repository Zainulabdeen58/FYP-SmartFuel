// Form checks. The rules live in shared/validation.js, which the backend uses
// too, so a form and the API always accept and refuse the same input.
// Each check returns "" when the value is valid, otherwise an error message.
export * from "../../shared/validation.js";

// Frontend-only helpers below.

// Only needed when the user is setting a new password.
export function checkCurrentPassword(value, newPassword) {
  if (newPassword && !value) return "Enter your current password";
  return "";
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
