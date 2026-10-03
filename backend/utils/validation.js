// Server-side input checks. They mirror frontend/src/validation.js so the API
// rejects the same bad input the forms do, even when a request skips the UI.
// Each check returns "" when the value is valid, otherwise an error message.
import { ROLES } from "../models/User.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,20}$/;
export const MIN_PASSWORD_LENGTH = 6;

const isText = (value) => typeof value === "string" && value.trim() !== "";

export function checkFullName(value) {
  if (!isText(value)) return "Full name is required";
  const length = value.trim().length;
  if (length < 2 || length > 60) return "Full name must be 2 to 60 characters";
  return "";
}

export function checkEmail(value) {
  if (!isText(value)) return "Email is required";
  if (!EMAIL_REGEX.test(value.trim())) return "Enter a valid email address";
  return "";
}

export function checkContactNumber(value) {
  if (!isText(value)) return "Contact number is required";
  if (!PHONE_REGEX.test(value.trim())) return "Enter a valid contact number";
  return "";
}

export function checkPassword(value) {
  if (typeof value !== "string" || value === "") return "Password is required";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return "";
}

export function checkRole(value) {
  return ROLES.includes(value) ? "" : "Invalid account type";
}

export function checkOrganizationName(value) {
  if (!isText(value)) return "Organization name is required for organizational accounts";
  const length = value.trim().length;
  if (length < 2 || length > 100) return "Organization name must be 2 to 100 characters";
  return "";
}

export function firstError(...messages) {
  return messages.find(Boolean) || "";
}

// Makes user-typed search text safe to use inside a MongoDB $regex.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
