// Input checks used by both the frontend forms and the backend controllers,
// so a rule changed here applies on both sides.
// Each check returns "" when the value is valid, otherwise an error message.
import {
  FUEL_TYPES,
  MAX_PASSWORD_LENGTH,
  MAX_PRICE_PER_LITRE,
  MAX_STATION_LENGTH,
  MIN_MODEL_YEAR,
  MIN_PASSWORD_LENGTH,
  MIN_PRICE_PER_LITRE,
  ROLES,
  VEHICLE_LIMITS,
  maxModelYear,
} from "./constants.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,20}$/;
// Letters of any language (English, Urdu, ...), spaces and . ' -
const NAME_REGEX = /^[\p{L}\s.'-]+$/u;
// Letters and numbers of any language, spaces and . ' ( ) & / + -
const VEHICLE_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}\s.'()&/+-]*$/u;
// Groups of letters/numbers joined by single spaces or hyphens, e.g. LEA-1234, ICT AB 123.
const REGISTRATION_REGEX = /^[A-Z0-9]+([ -][A-Z0-9]+)*$/i;
// Must start with a letter, e.g. Toyota, Mercedes-Benz, MG.
const MANUFACTURER_REGEX = /^\p{L}[\p{L}\p{N}\s.'&-]*$/u;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isText = (value) => typeof value === "string" && value.trim() !== "";
const isEmpty = (value) => value === undefined || value === null || value === "";

// Form inputs give text ("15") and the API gets numbers (15); both are accepted.
// Anything else (true, [1], {}) becomes NaN and fails the check.
function toNumber(value) {
  if (typeof value === "number") return value;
  if (isText(value)) return Number(value);
  return NaN;
}

export function firstError(...messages) {
  return messages.find(Boolean) || "";
}

// Users

export function checkFullName(value) {
  const error = checkText(value, "Full name", { min: 2, max: 60 });
  if (error) return error;
  if (!NAME_REGEX.test(value.trim())) return "Full name can only contain letters, spaces and . ' -";
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

// For new passwords (register, profile change, admin seeder). Login does not
// apply it, so accounts created under the old 6-character rule can still sign in.
// required: false lets an empty value pass (profile form: password unchanged).
export function checkPassword(value, { required = true } = {}) {
  if (typeof value !== "string" || value === "") {
    return required ? "Password is required" : "";
  }
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

// Registration passes REGISTER_ROLES as `allowed`.
export function checkRole(value, allowed = ROLES) {
  if (!value) return "Account type is required";
  if (value === "Admin" && !allowed.includes("Admin")) {
    return "Admin accounts cannot be created through registration";
  }
  if (!allowed.includes(value)) return "Select a valid account type";
  return "";
}

export function checkOrganizationName(value) {
  return checkText(value, "Organization name", { min: 2, max: 100 });
}

// Numbers

export function checkPositiveNumber(value, label) {
  if (isEmpty(value)) return `${label} is required`;
  const num = toNumber(value);
  if (!Number.isFinite(num)) return `${label} must be a number`;
  if (num <= 0) return `${label} must be greater than 0`;
  return "";
}

function checkNumberRange(value, label, { min, max }, unit) {
  const error = checkPositiveNumber(value, label);
  if (error) return error;
  const num = toNumber(value);
  if (num < min || num > max) return `${label} must be between ${min} and ${max} ${unit}`;
  return "";
}

// Vehicles

function checkText(value, label, { min, max }) {
  if (!isEmpty(value) && typeof value !== "string") return `${label} must be text`;
  if (!isText(value)) return `${label} is required`;
  const length = value.trim().length;
  if (length < min || length > max) return `${label} must be ${min} to ${max} characters`;
  return "";
}

export function checkVehicleName(value) {
  const error = checkText(value, "Vehicle name", VEHICLE_LIMITS.vehicleName);
  if (error) return error;
  if (!VEHICLE_NAME_REGEX.test(value.trim())) {
    return "Vehicle name can only contain letters, numbers, spaces and . ' ( ) & / + -";
  }
  return "";
}

// Non-text values (e.g. the number 123) are refused, so the server's
// duplicate check always compares text.
export function checkRegistrationNumber(value) {
  const error = checkText(value, "Registration number", VEHICLE_LIMITS.registrationNumber);
  if (error) return error;
  const reg = value.trim();
  if (!REGISTRATION_REGEX.test(reg)) {
    return "Use only letters and numbers, separated by a single space or hyphen (e.g. LEA-1234)";
  }
  if (!/[A-Z]/i.test(reg) || !/\d/.test(reg)) {
    return "Registration number must contain both letters and numbers";
  }
  return "";
}

export function checkManufacturer(value) {
  const error = checkText(value, "Manufacturer", VEHICLE_LIMITS.manufacturer);
  if (error) return error;
  if (!MANUFACTURER_REGEX.test(value.trim())) {
    return "Manufacturer must start with a letter and can only contain letters, numbers, spaces and . ' & -";
  }
  return "";
}

export function checkModelYear(value) {
  if (isEmpty(value)) return "Model year is required";
  const year = toNumber(value);
  if (!Number.isInteger(year)) return "Model year must be a whole number";
  if (year < MIN_MODEL_YEAR || year > maxModelYear()) {
    return `Model year must be between ${MIN_MODEL_YEAR} and ${maxModelYear()}`;
  }
  return "";
}

export function checkFuelType(value) {
  if (!value) return "Fuel type is required";
  if (!FUEL_TYPES.includes(value)) return "Select a valid fuel type";
  return "";
}

// Fuel estimates divide by efficiency, so zero is never allowed.
export function checkFuelEfficiency(value) {
  return checkNumberRange(value, "Fuel efficiency", VEHICLE_LIMITS.fuelEfficiency, "km/l");
}

export function checkFuelTankCapacity(value) {
  return checkNumberRange(value, "Fuel tank capacity", VEHICLE_LIMITS.fuelTankCapacity, "litres");
}

// Fuel records

// Today's calendar date in Pakistan as "YYYY-MM-DD" (en-CA formats that way).
// "Today" and "future" are judged in Pakistan time on both sides.
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
  if (isEmpty(value)) return "Date is required";
  if (!parseFuelDate(value)) return "Enter a valid date (YYYY-MM-DD)";
  if (value > todayInPakistan()) return "Date cannot be in the future";
  return "";
}

export function checkTankCapacity(quantity, tankCapacity) {
  return toNumber(quantity) > tankCapacity
    ? `Quantity cannot be more than the tank capacity (${tankCapacity} L)`
    : "";
}

// Catches typing mistakes such as Rs 5 or Rs 5,000 per litre. Only checked
// once quantity and total cost are both valid numbers.
export function checkPricePerLitre(quantity, totalCost) {
  const qty = toNumber(quantity);
  const cost = toNumber(totalCost);
  if (!(qty > 0 && cost > 0)) return "";
  const price = cost / qty;
  if (price < MIN_PRICE_PER_LITRE || price > MAX_PRICE_PER_LITRE) {
    return `Price per litre works out to Rs ${price.toFixed(2)}. It must be between Rs ${MIN_PRICE_PER_LITRE} and Rs ${MAX_PRICE_PER_LITRE}; check the quantity and total cost`;
  }
  return "";
}

export function checkOdometer(value) {
  if (isEmpty(value)) return "";
  const num = toNumber(value);
  if (!Number.isFinite(num)) return "Odometer reading must be a number";
  if (num < 0) return "Odometer reading cannot be negative";
  return "";
}

export function checkStation(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return "Station name must be text";
  if (value.trim().length > MAX_STATION_LENGTH) {
    return `Station name must be at most ${MAX_STATION_LENGTH} characters`;
  }
  return "";
}
