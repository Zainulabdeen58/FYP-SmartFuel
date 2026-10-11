// Rules live in shared/validation.js, also used by the backend, so forms and
// the API accept the same input. Each check returns "" or an error message.
export * from "../../shared/validation.js";

// Frontend-only helpers

export function checkCurrentPassword(value, newPassword) {
  if (newPassword && !value) return "Enter your current password";
  return "";
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
