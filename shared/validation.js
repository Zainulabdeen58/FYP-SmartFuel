// Input checks shared by the frontend forms and the backend controllers.
// Each check returns "" when valid, otherwise an error message.
import {
  COMMON_MANUFACTURERS,
  FUEL_TYPES,
  MAX_BUDGET_AMOUNT,
  MAX_BUDGET_MONTHS_AHEAD,
  MAX_ODOMETER_READING,
  MAX_PASSWORD_LENGTH,
  MAX_PLACE_NAME_LENGTH,
  MAX_PRICE_PER_LITRE,
  MAX_REGISTRATION_PART_LENGTH,
  MAX_REGISTRATION_PARTS,
  MAX_REPORT_MONTHS,
  MAX_STATION_LENGTH,
  MAX_TRIP_DAYS_AHEAD,
  MAX_TRIP_PURPOSE_LENGTH,
  MIN_MODEL_YEAR,
  MIN_PASSWORD_LENGTH,
  MIN_PRICE_PER_LITRE,
  MIN_TRIP_DISTANCE_KM,
  PAKISTAN_BOUNDS,
  PLACE_SEARCH_LENGTH,
  ROLES,
  TRIP_PRIORITIES,
  TRIP_STATUSES,
  USUAL_MILEAGE_BY_ENGINE,
  VEHICLE_LIMITS,
  VEHICLE_TYPE_LIMITS,
  VEHICLE_TYPES,
  maxModelYear,
} from "./constants.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,20}$/;
// Letters of any language (English, Urdu, ...), spaces and . ' -
const NAME_REGEX = /^[\p{L}\s.'-]+$/u;
const VEHICLE_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}\s.'()&/+-]*$/u;
const REGISTRATION_REGEX = /^[A-Z0-9 -]+$/i;
const MANUFACTURER_REGEX = /^\p{L}[\p{L}\p{N}\s.'&-]*$/u;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
// Plain numbers only (15, 12.5, -3); refuses "1e3" and "0x10", which Number() would accept.
const NUMBER_TEXT_REGEX = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

const isText = (value) => typeof value === "string" && value.trim() !== "";
const isEmpty = (value) => value === undefined || value === null || value === "";

// Accepts form text ("15") and JSON numbers (15); anything else (true, {}) is NaN.
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && NUMBER_TEXT_REGEX.test(value.trim())) return Number(value);
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

// New passwords only; login skips it so old 6-character passwords still sign in.
// required: false lets "" pass (profile form: password unchanged).
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

// "LEB 07-1234" → ["LEB", "07", "1234"]
function registrationParts(value) {
  return value.toUpperCase().match(/[A-Z]+|\d+/g) || [];
}

// One saved spelling: "lea 1234", "LEA1234" and "LEA-1234" all become "LEA-1234".
export function normalizeRegistrationNumber(value) {
  return registrationParts(value).join("-");
}

// Pakistani numbers (LEA-1234, LEB-07-1234, ICT-AB-123). Non-text is refused so
// the server's duplicate check always compares text.
export function checkRegistrationNumber(value) {
  const error = checkText(value, "Registration number", VEHICLE_LIMITS.registrationNumber);
  if (error) return error;
  if (!REGISTRATION_REGEX.test(value.trim())) {
    return "Use only letters, numbers, spaces and hyphens (e.g. LEA-1234)";
  }

  const parts = registrationParts(value);
  const startsWithLetters = /^[A-Z]/.test(parts[0] || "");
  const hasNumbers = parts.some((part) => /^\d/.test(part));
  if (!startsWithLetters || !hasNumbers) {
    return "Registration number must start with letters and contain numbers (e.g. LEA-1234)";
  }
  if (parts.some((part) => part.length > MAX_REGISTRATION_PART_LENGTH)) {
    return `Each part of the registration number can have at most ${MAX_REGISTRATION_PART_LENGTH} letters or numbers (e.g. LEB-07-1234)`;
  }
  if (parts.length > MAX_REGISTRATION_PARTS) {
    return `Registration number can have at most ${MAX_REGISTRATION_PARTS} parts (e.g. ICT-AB-123)`;
  }
  return "";
}

// Common makes get their usual spelling ("HONDA" → "Honda"); others keep the user's.
export function normalizeManufacturer(value) {
  const name = value.trim().replace(/\s+/g, " ");
  return COMMON_MANUFACTURERS.find((make) => make.toLowerCase() === name.toLowerCase()) || name;
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

export function checkVehicleType(value) {
  if (!value) return "Vehicle type is required";
  if (!VEHICLE_TYPES.includes(value)) return "Select a valid vehicle type";
  return "";
}

export function checkEngineCC(value) {
  if (isEmpty(value)) return "Engine size (cc) is required";
  const engineCC = toNumber(value);
  if (!Number.isInteger(engineCC)) return "Engine size must be a whole number of cc";
  if (engineCC <= 0) return "Engine size must be greater than 0";
  return "";
}

const formatWholeNumber = (value) => value.toLocaleString("en-US");

// The rules that depend on the vehicle type, one error per field: a type, an engine
// size (not for electric) and engine, efficiency and tank within the type's range
// (VEHICLE_TYPE_LIMITS). Used by the form and the server, so both give the same message.
// Missing or non-number efficiency and tank are left to their own checks.
export function checkVehicleTypeFields(vehicle) {
  const type = vehicle.vehicleType;
  const isElectric = vehicle.fuelType === "Electric";
  const limits = VEHICLE_TYPE_LIMITS[type];
  const errors = { vehicleType: checkVehicleType(type), engineCC: "", fuelEfficiency: "", fuelTankCapacity: "" };

  if (limits) {
    const outsideRange = (value, { min, max }) => {
      const number = toNumber(value);
      return Number.isFinite(number) && (number < min || number > max);
    };
    const { engineCC, fuelEfficiency, fuelTankCapacity } = limits;

    if (!isElectric && outsideRange(vehicle.engineCC, engineCC)) {
      errors.engineCC = `${type} engine must be ${formatWholeNumber(engineCC.min)} to ${formatWholeNumber(engineCC.max)} cc`;
    }
    if (outsideRange(vehicle.fuelEfficiency, fuelEfficiency)) {
      errors.fuelEfficiency = `${type} fuel efficiency must be between ${fuelEfficiency.min} and ${fuelEfficiency.max} km/l`;
    }
    if (outsideRange(vehicle.fuelTankCapacity, fuelTankCapacity)) {
      errors.fuelTankCapacity = `${type} fuel tank must be between ${fuelTankCapacity.min} and ${formatWholeNumber(fuelTankCapacity.max)} litres`;
    }
  }

  // The type's range comes first: it is the exact limit for this vehicle.
  if (!isElectric) errors.engineCC ||= checkEngineCC(vehicle.engineCC);
  return errors;
}

// Only a warning (never blocks saving) when efficiency is unusual for the engine size.
export function getMileageWarning(vehicle) {
  const bands = USUAL_MILEAGE_BY_ENGINE[vehicle.vehicleType];
  const engineCC = toNumber(vehicle.engineCC);
  const kmPerLitre = toNumber(vehicle.fuelEfficiency);
  if (!bands || vehicle.fuelType === "Electric" || !(engineCC > 0) || !(kmPerLitre > 0)) return "";

  const band = bands.find((usualBand) => engineCC <= usualBand.maxEngineCC);
  if (kmPerLitre >= band.minKmPerLitre && kmPerLitre <= band.maxKmPerLitre) return "";
  return `${kmPerLitre} km/l is unusual for a ${formatWholeNumber(engineCC)}cc ${vehicle.vehicleType.toLowerCase()} (usually ${band.minKmPerLitre} to ${band.maxKmPerLitre} km/l). Please check it.`;
}

// Fuel records

// Today in Pakistan as "YYYY-MM-DD" (en-CA format), so server and browser agree.
export function todayInPakistan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
}

// "YYYY-MM-DD" → UTC midnight of that day (how fuel dates are stored), or null.
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

// Catches typing mistakes (Rs 5 or Rs 5,000 a litre); skipped until both numbers are valid.
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

// An entry without a reading is a "not working" entry (so are older ones from before readings were required).
export const hasOdometerReading = (record) => record.odometer !== undefined && record.odometer !== null;

// Required unless "My odometer is not working" is ticked (common on old bikes and cars).
export function checkOdometer(value, { notWorking = false } = {}) {
  if (notWorking) return "";
  if (isEmpty(value)) return 'Enter the odometer reading, or tick "My odometer is not working"';
  const reading = toNumber(value);
  if (!Number.isFinite(reading)) return "Odometer reading must be a number";
  if (reading < 0) return "Odometer reading cannot be negative";
  if (reading > MAX_ODOMETER_READING) {
    return `Odometer reading cannot be more than ${MAX_ODOMETER_READING.toLocaleString("en-US")} km`;
  }
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

// Months ("YYYY-MM" text, used by budgets and reports)

export function currentMonthInPakistan() {
  return todayInPakistan().slice(0, 7);
}

// addMonths("2026-11", 2) → "2027-01".
export function addMonths(month, monthsToAdd) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + monthsToAdd, 1)).toISOString().slice(0, 7);
}

export function isValidMonth(value) {
  return typeof value === "string" && MONTH_REGEX.test(value);
}

// Both ends included: ("2026-01", "2026-03") → 3.
export function countMonths(fromMonth, toMonth) {
  const [fromYear, fromMonthNumber] = fromMonth.split("-").map(Number);
  const [toYear, toMonthNumber] = toMonth.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonthNumber - fromMonthNumber) + 1;
}

// First month of a range of `monthCount` months ending with `toMonth`: ("2026-10", 3) → "2026-08".
export function firstMonthOfRange(toMonth, monthCount) {
  return addMonths(toMonth, -(monthCount - 1));
}

// Every month from `fromMonth` to `toMonth`, both included, oldest first.
export function listMonths(fromMonth, toMonth) {
  return Array.from({ length: countMonths(fromMonth, toMonth) }, (_, index) => addMonths(fromMonth, index));
}

// Budgets (FR-08)

// Past months are view-only; only this month up to MAX_BUDGET_MONTHS_AHEAD ahead can change.
export function checkBudgetMonth(value) {
  if (isEmpty(value)) return "Month is required";
  if (!isValidMonth(value)) return "Enter a valid month (YYYY-MM)";
  const current = currentMonthInPakistan();
  if (value < current) return "Budgets for past months cannot be changed";
  if (value > addMonths(current, MAX_BUDGET_MONTHS_AHEAD)) {
    return `Budgets can be set at most ${MAX_BUDGET_MONTHS_AHEAD} months ahead`;
  }
  return "";
}

export function checkBudgetAmount(value) {
  const error = checkPositiveNumber(value, "Budget");
  if (error) return error;
  if (toNumber(value) > MAX_BUDGET_AMOUNT) {
    return `Budget cannot be more than Rs ${MAX_BUDGET_AMOUNT.toLocaleString("en-US")}`;
  }
  return "";
}

// Reports (FR-09, FR-10)

export function checkReportRange(fromMonth, toMonth) {
  if (!isValidMonth(fromMonth) || !isValidMonth(toMonth)) return "Choose valid months (YYYY-MM)";
  if (fromMonth > toMonth) return "The start month must be on or before the end month";
  if (countMonths(fromMonth, toMonth) > MAX_REPORT_MONTHS) {
    return `Choose a range of at most ${MAX_REPORT_MONTHS / 12} years`;
  }
  return "";
}

// Trips (FR-05, FR-06)

export function isInPakistan(lat, lng) {
  const { minLat, maxLat, minLng, maxLng } = PAKISTAN_BOUNDS;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

// A trip's start or destination: { name, lat, lng } inside Pakistan.
// `label` is "Start" or "Destination".
export function checkPlace(place, label) {
  if (!place || typeof place !== "object") {
    return `Choose the ${label.toLowerCase()} from the search or on the map`;
  }
  const nameError = checkText(place.name, `${label} name`, { min: 2, max: MAX_PLACE_NAME_LENGTH });
  if (nameError) return nameError;
  const { lat, lng } = place;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return `Choose the ${label.toLowerCase()} from the search or on the map`;
  }
  if (!isInPakistan(lat, lng)) return `${label} must be in Pakistan`;
  return "";
}

// Straight-line distance between two { lat, lng } points (haversine formula).
export function distanceBetweenKm(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latChange = toRadians(to.lat - from.lat);
  const lngChange = toRadians(to.lng - from.lng);
  const a =
    Math.sin(latChange / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(lngChange / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Checked once both places are valid.
export function checkDifferentPlaces(start, destination) {
  if (checkPlace(start, "Start") || checkPlace(destination, "Destination")) return "";
  return distanceBetweenKm(start, destination) < MIN_TRIP_DISTANCE_KM
    ? "Start and destination are the same place"
    : "";
}

// addDays("2026-10-11", 30) → "2026-11-10".
function addDays(day, daysToAdd) {
  const date = parseFuelDate(day);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

// A planned trip is dated from today up to MAX_TRIP_DAYS_AHEAD; a completed one
// today or earlier. Dates are calendar days in Pakistan time, like fuel entries.
export function checkTripDate(value, status) {
  if (isEmpty(value)) return "Date is required";
  if (!parseFuelDate(value)) return "Enter a valid date (YYYY-MM-DD)";
  const today = todayInPakistan();
  if (status === "completed") {
    return value > today ? "A completed trip cannot be in the future" : "";
  }
  if (value < today) return "A planned trip cannot be in the past";
  if (value > addDays(today, MAX_TRIP_DAYS_AHEAD)) {
    return `Trips can be planned at most ${MAX_TRIP_DAYS_AHEAD} days ahead`;
  }
  return "";
}

export function checkTripStatus(value) {
  return TRIP_STATUSES.includes(value) ? "" : "Status must be planned or completed";
}

export function checkTripPriority(value) {
  if (!value) return "Priority is required";
  return TRIP_PRIORITIES.includes(value) ? "" : "Choose essential or non-essential";
}

// Optional.
export function checkTripPurpose(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return "Purpose must be text";
  if (value.trim().length > MAX_TRIP_PURPOSE_LENGTH) {
    return `Purpose must be at most ${MAX_TRIP_PURPOSE_LENGTH} characters`;
  }
  return "";
}

// The price used for a trip's cost; same range as fuel entries.
export function checkFuelPrice(value) {
  const error = checkPositiveNumber(value, "Fuel price");
  if (error) return error;
  const price = toNumber(value);
  if (price < MIN_PRICE_PER_LITRE || price > MAX_PRICE_PER_LITRE) {
    return `Fuel price must be between Rs ${MIN_PRICE_PER_LITRE} and Rs ${MAX_PRICE_PER_LITRE} per litre`;
  }
  return "";
}

export function checkPlaceSearch(value) {
  return checkText(value, "Search text", PLACE_SEARCH_LENGTH);
}
