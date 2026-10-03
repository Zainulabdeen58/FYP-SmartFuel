import { FUEL_TYPES, ROLES } from "./constant";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,20}$/;
const NAME_REGEX = /^[a-zA-Z\s.'-]{2,60}$/;

export function validateFullName(value) {
  const name = value?.trim() || "";
  if (!name) return "Full name is required";
  if (name.length < 2) return "Full name must be at least 2 characters";
  if (!NAME_REGEX.test(name)) return "Enter a valid full name";
  return "";
}

export function validateEmail(value) {
  const email = value?.trim() || "";
  if (!email) return "Email is required";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address";
  return "";
}

export function validateContactNumber(value) {
  const phone = value?.trim() || "";
  if (!phone) return "Contact number is required";
  if (!PHONE_REGEX.test(phone)) return "Enter a valid contact number";
  return "";
}

export function validatePassword(value, { required = true } = {}) {
  if (!value) {
    return required ? "Password is required" : "";
  }
  if (value.length < 6) return "Password must be at least 6 characters";
  return "";
}

// Only needed when the user is setting a new password.
export function validateCurrentPassword(value, newPassword) {
  if (newPassword && !value) return "Enter your current password";
  return "";
}

export function validateRole(value) {
  if (!value) return "Account type is required";
  if (!ROLES.includes(value)) return "Select a valid account type";
  return "";
}

export function validateOrganizationName(value) {
  const name = value?.trim() || "";
  if (!name) return "Organization name is required";
  if (name.length < 2 || name.length > 100) {
    return "Organization name must be 2 to 100 characters";
  }
  return "";
}

export function validateRequired(value, label) {
  if (!String(value ?? "").trim()) return `${label} is required`;
  return "";
}

export function validateModelYear(value) {
  if (value === "" || value === null || value === undefined) {
    return "Model year is required";
  }
  const year = Number(value);
  const current = new Date().getFullYear();
  if (!Number.isInteger(year)) return "Model year must be a whole number";
  if (year < 1980 || year > current + 1) {
    return `Model year must be between 1980 and ${current + 1}`;
  }
  return "";
}

// Fuel estimates divide by these values, so zero is not allowed.
export function validatePositiveNumber(value, label) {
  if (value === "" || value === null || value === undefined) {
    return `${label} is required`;
  }
  const num = Number(value);
  if (Number.isNaN(num)) return `${label} must be a number`;
  if (num <= 0) return `${label} must be greater than 0`;
  return "";
}

export function validateFuelType(value) {
  if (!value) return "Fuel type is required";
  if (!FUEL_TYPES.includes(value)) {
    return "Select a valid fuel type";
  }
  return "";
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
