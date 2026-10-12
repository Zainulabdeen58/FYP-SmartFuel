// Rules live in shared/validation.js, also used by the backend, so forms and
// the API accept the same input. Each check returns "" or an error message.
import { todayInPakistan } from "../../shared/validation.js";

export * from "../../shared/validation.js";

// Frontend-only helpers

export function checkCurrentPassword(value, newPassword) {
  if (newPassword && !value) return "Enter your current password";
  return "";
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

// A planned trip whose day has passed: it should be marked completed or moved.
export const isTripOverdue = (trip) => trip.status === "planned" && trip.date.slice(0, 10) < todayInPakistan();
