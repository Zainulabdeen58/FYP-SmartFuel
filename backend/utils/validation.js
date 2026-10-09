// Server-side input checks. They mirror frontend/src/validation.js so the API
// rejects the same bad input the forms do, even when a request skips the UI.
// Each check returns "" when the value is valid, otherwise an error message.
import { ROLES } from "../models/User.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,20}$/;
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt only uses the first 72 bytes, so longer passwords are refused.
export const MAX_PASSWORD_LENGTH = 64;

// Letters of any language (English, Urdu, ...), spaces and . ' -
// Same rule as NAME_REGEX in frontend/src/validation.js.
const NAME_REGEX = /^[\p{L}\s.'-]+$/u;

const isText = (value) => typeof value === "string" && value.trim() !== "";

export function checkFullName(value) {
  if (!isText(value)) return "Full name is required";
  const name = value.trim();
  if (name.length < 2 || name.length > 60) return "Full name must be 2 to 60 characters";
  if (!NAME_REGEX.test(name)) return "Full name can only contain letters, spaces and . ' -";
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

// For new passwords (register, profile change). Login does not apply it, so
// accounts created under the old 6-character rule can still sign in.
export function checkPassword(value) {
  if (typeof value !== "string" || value === "") return "Password is required";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Password must contain both letters and numbers";
  }
  return "";
}

export function checkRole(value) {
  return ROLES.includes(value) ? "" : "Invalid account type";
}

// Registration may only create these roles. Admins are made by the seeder
// (`npm run seed:admin`) or by another admin on the Administration page.
export const REGISTER_ROLES = ["Individual", "Organizational"];

export function checkRegisterRole(value) {
  if (value === "Admin") return "Admin accounts cannot be created through registration";
  return REGISTER_ROLES.includes(value) ? "" : "Invalid account type";
}

export function checkOrganizationName(value) {
  if (!isText(value)) return "Organization name is required for organizational accounts";
  const length = value.trim().length;
  if (length < 2 || length > 100) return "Organization name must be 2 to 100 characters";
  return "";
}

// Fuel records (keep in step with frontend/src/constant.js and validation.js).
export const MIN_PRICE_PER_LITRE = 100;
export const MAX_PRICE_PER_LITRE = 1000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Today's calendar date in Pakistan as "YYYY-MM-DD" (en-CA formats that way).
export function todayInPakistan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
}

// Fuel dates are calendar days ("YYYY-MM-DD"), stored as UTC midnight of that day.
// Returns null for anything that is not a real date in that format.
export function parseFuelDate(value) {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? date : null;
}

export function checkFuelDate(value) {
  if (value === undefined || value === null || value === "") return "Date is required";
  if (!parseFuelDate(value)) return "Enter a valid date (YYYY-MM-DD)";
  if (value > todayInPakistan()) return "Date cannot be in the future";
  return "";
}

export function checkPositiveNumber(value, label) {
  if (value === undefined || value === null || value === "") return `${label} is required`;
  if (typeof value !== "number" || !Number.isFinite(value)) return `${label} must be a number`;
  if (value <= 0) return `${label} must be greater than 0`;
  return "";
}

export function checkOdometer(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "number" || !Number.isFinite(value)) return "Odometer reading must be a number";
  if (value < 0) return "Odometer reading cannot be negative";
  return "";
}

export function checkStation(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return "Station name must be text";
  if (value.trim().length > 100) return "Station name must be at most 100 characters";
  return "";
}

// Catches typing mistakes such as Rs 5 or Rs 5,000 per litre.
export function checkPricePerLitre(quantity, totalCost) {
  const price = totalCost / quantity;
  if (price < MIN_PRICE_PER_LITRE || price > MAX_PRICE_PER_LITRE) {
    return `Price per litre works out to Rs ${price.toFixed(2)}. It must be between Rs ${MIN_PRICE_PER_LITRE} and Rs ${MAX_PRICE_PER_LITRE}; check the quantity and total cost`;
  }
  return "";
}

export function firstError(...messages) {
  return messages.find(Boolean) || "";
}

// Makes user-typed search text safe to use inside a MongoDB $regex.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
