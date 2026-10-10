// Values used by both the backend and the frontend. Change them here only.
// Plain JavaScript: no npm packages and nothing browser- or Node-only.

// Account types from the SRS.
export const ROLES = ["Individual", "Organizational", "Admin"];

// Roles a user can pick when registering. Admins are made by the seeder
// (`npm run seed:admin`) or by another admin on the Administration page.
export const REGISTER_ROLES = ["Individual", "Organizational"];

export const FUEL_TYPES = ["Petrol", "Diesel", "Electric"];

// bcrypt only uses the first 72 bytes, so longer passwords are refused.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

export const MIN_MODEL_YEAR = 1980;
export const maxModelYear = () => new Date().getFullYear() + 1;

// Efficiency covers trucks (~3 km/l) to motorbikes (~70 km/l); tank covers
// motorbikes (~8 L) to large trucks.
export const VEHICLE_LIMITS = {
  vehicleName: { min: 2, max: 50 },
  registrationNumber: { min: 3, max: 15 },
  manufacturer: { min: 2, max: 50 },
  fuelEfficiency: { min: 1, max: 100 },
  fuelTankCapacity: { min: 1, max: 1000 },
};

// Price per litre outside this range is treated as a typing mistake.
export const MIN_PRICE_PER_LITRE = 100;
export const MAX_PRICE_PER_LITRE = 1000;

export const MAX_STATION_LENGTH = 100;

// Monthly budgets (FR-08). The upper limit catches typing mistakes (extra zeros).
export const MAX_BUDGET_AMOUNT = 10000000; // Rs 1 crore
// Spending at or above this share of the budget shows a warning; 100% or more is over budget.
export const BUDGET_WARNING_PERCENT = 80;
// Budgets can be set for the current month and up to this many months ahead.
export const MAX_BUDGET_MONTHS_AHEAD = 12;
