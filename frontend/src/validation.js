import {
  FUEL_TYPES,
  MAX_PRICE_PER_LITRE,
  MIN_PRICE_PER_LITRE,
  ROLES,
} from "./constant";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,20}$/;
// Letters of any language (English, Urdu, ...), spaces and . ' -
// Same rule as NAME_REGEX in backend/utils/validation.js.
const NAME_REGEX = /^[\p{L}\s.'-]+$/u;

export function validateFullName(value) {
  const name = value?.trim() || "";
  if (!name) return "Full name is required";
  if (name.length < 2 || name.length > 60) return "Full name must be 2 to 60 characters";
  if (!NAME_REGEX.test(name)) return "Full name can only contain letters, spaces and . ' -";
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

// Rule for new passwords; keep in step with checkPassword in backend/utils/validation.js.
export function validatePassword(value, { required = true } = {}) {
  if (!value) {
    return required ? "Password is required" : "";
  }
  if (value.length < 8) return "Password must be at least 8 characters";
  if (value.length > 64) return "Password must be at most 64 characters";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Password must contain both letters and numbers";
  }
  return "";
}

// Only needed when the user is setting a new password.
export function validateCurrentPassword(value, newPassword) {
  if (newPassword && !value) return "Enter your current password";
  return "";
}

export function validateRole(value, allowed = ROLES) {
  if (!value) return "Account type is required";
  if (!allowed.includes(value)) return "Select a valid account type";
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

// Fuel records. The server repeats these checks (backend/utils/validation.js).

// Today's date in Pakistan as "YYYY-MM-DD"; the server uses the same day.
export function todayInPakistan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
}

export function validateFuelDate(value) {
  if (!value) return "Date is required";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Enter a valid date";
  if (value > todayInPakistan()) return "Date cannot be in the future";
  return "";
}

export function validateFuelQuantity(value, vehicle) {
  const error = validatePositiveNumber(value, "Quantity");
  if (error) return error;
  if (vehicle && Number(value) > vehicle.fuelTankCapacity) {
    return `Cannot be more than the tank capacity (${vehicle.fuelTankCapacity} L)`;
  }
  return "";
}

export function validatePricePerLitre(quantity, totalCost) {
  const price = Number(totalCost) / Number(quantity);
  if (!(Number(quantity) > 0 && Number(totalCost) > 0)) return "";
  if (price < MIN_PRICE_PER_LITRE || price > MAX_PRICE_PER_LITRE) {
    return `Works out to Rs ${price.toFixed(2)} per litre. It must be between Rs ${MIN_PRICE_PER_LITRE} and Rs ${MAX_PRICE_PER_LITRE}`;
  }
  return "";
}

export function validateOdometer(value) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "Odometer reading must be a number";
  if (num < 0) return "Odometer reading cannot be negative";
  return "";
}

export function validateStation(value) {
  if ((value || "").trim().length > 100) return "Station name must be at most 100 characters";
  return "";
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
