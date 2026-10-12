// Values shared by the backend and frontend; change them here only.
// Plain JavaScript only: no npm packages, nothing browser- or Node-only.

export const ROLES = ["Individual", "Organizational", "Admin"];

// No Admin: admins come from the seeder (npm run seed:admin) or another admin.
export const REGISTER_ROLES = ["Individual", "Organizational"];

export const FUEL_TYPES = ["Petrol", "Diesel", "Electric"];

// bcrypt only uses the first 72 bytes, so longer passwords are refused.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

export const MIN_MODEL_YEAR = 1980;
export const maxModelYear = () => new Date().getFullYear() + 1;

// Efficiency in km/l, tank in litres. Registration numbers get hyphens added
// when saved ("ABC1234" → "ABC-1234"), so they may be a little longer than typed.
export const VEHICLE_LIMITS = {
  vehicleName: { min: 2, max: 50 },
  registrationNumber: { min: 3, max: 20 },
  manufacturer: { min: 2, max: 50 },
  fuelEfficiency: { min: 1, max: 100 },
  fuelTankCapacity: { min: 1, max: 1000 },
};

// Registration numbers like LEA-1234, LEB-07-1234, ICT-AB-123.
export const MAX_REGISTRATION_PARTS = 4;
export const MAX_REGISTRATION_PART_LENGTH = 4;

// Common makes in Pakistan: suggested in the form, and "HONDA" is saved as "Honda".
export const COMMON_MANUFACTURERS = [
  "Audi", "BAIC", "BMW", "Changan", "Chery", "Daihatsu", "DFSK", "FAW", "Haval",
  "Hino", "Honda", "Hyundai", "Isuzu", "JAC", "Kia", "Mercedes-Benz", "MG",
  "Mitsubishi", "Nissan", "Peugeot", "Prince", "Proton", "Road Prince", "Sazgar",
  "Super Power", "Suzuki", "Toyota", "Unique", "United", "Volvo", "Yamaha",
];

export const VEHICLE_TYPES = ["Motorcycle", "Rickshaw", "Car", "SUV/Jeep", "Van/Pickup", "Bus/Truck"];

// Possible range per type (approximate, kept wide); values outside are refused.
// Electric vehicles skip only the engine check.
export const VEHICLE_TYPE_LIMITS = {
  Motorcycle: {
    engineCC: { min: 50, max: 1300 },
    fuelEfficiency: { min: 20, max: 100 },
    fuelTankCapacity: { min: 5, max: 25 },
  },
  Rickshaw: {
    engineCC: { min: 50, max: 400 },
    fuelEfficiency: { min: 15, max: 45 },
    fuelTankCapacity: { min: 5, max: 20 },
  },
  Car: {
    engineCC: { min: 600, max: 3000 },
    fuelEfficiency: { min: 6, max: 30 },
    fuelTankCapacity: { min: 25, max: 80 },
  },
  "SUV/Jeep": {
    engineCC: { min: 1000, max: 5000 },
    fuelEfficiency: { min: 4, max: 20 },
    fuelTankCapacity: { min: 40, max: 120 },
  },
  "Van/Pickup": {
    engineCC: { min: 800, max: 3500 },
    fuelEfficiency: { min: 5, max: 20 },
    fuelTankCapacity: { min: 30, max: 100 },
  },
  "Bus/Truck": {
    engineCC: { min: 2000, max: 15000 },
    fuelEfficiency: { min: 1.5, max: 8 },
    fuelTankCapacity: { min: 80, max: 1000 },
  },
};

// Usual km/l by engine size; outside it is only a warning, since old, CNG or
// modified vehicles differ. Bands go small to large; the first that fits is used.
export const USUAL_MILEAGE_BY_ENGINE = {
  Motorcycle: [
    { maxEngineCC: 125, minKmPerLitre: 35, maxKmPerLitre: 80 },
    { maxEngineCC: Infinity, minKmPerLitre: 20, maxKmPerLitre: 50 },
  ],
  Car: [
    { maxEngineCC: 1000, minKmPerLitre: 13, maxKmPerLitre: 25 },
    { maxEngineCC: 1600, minKmPerLitre: 9, maxKmPerLitre: 18 },
    { maxEngineCC: Infinity, minKmPerLitre: 6, maxKmPerLitre: 14 },
  ],
};

// Rs per litre; outside this range is treated as a typing mistake.
export const MIN_PRICE_PER_LITRE = 100;
export const MAX_PRICE_PER_LITRE = 1000;

export const MAX_STATION_LENGTH = 100;

// km; meters show at most 7 digits, so more is a typing mistake.
export const MAX_ODOMETER_READING = 9999999;

// Monthly budgets (FR-08). The upper limit catches extra zeros typed by mistake.
export const MAX_BUDGET_AMOUNT = 10000000; // Rs 1 crore
// Warning from this % of the budget; over budget from 100%.
export const BUDGET_WARNING_PERCENT = 80;
export const MAX_BUDGET_MONTHS_AHEAD = 12;

// Reports (FR-09, FR-10), in whole months; the default includes this month.
export const DEFAULT_REPORT_MONTHS = 12;
export const MAX_REPORT_MONTHS = 120;
// Ranges longer than this are shown per year instead of per month.
export const MAX_MONTHLY_REPORT_MONTHS = 24;
// A gap between readings with mileage above this × the stated efficiency means
// fill-ups were missed, so the gap is left out of the measured mileage.
export const MAX_MILEAGE_FACTOR = 2;

// Trips (FR-05, FR-06). Priority tells the later crisis mode (FR-07) which trips can wait.
export const TRIP_PRIORITIES = ["essential", "non-essential"];
export const TRIP_STATUSES = ["planned", "completed"];
export const MAX_TRIP_PURPOSE_LENGTH = 200;
export const MAX_PLACE_NAME_LENGTH = 150;
export const PLACE_SEARCH_LENGTH = { min: 3, max: 100 };
// A planned trip can be dated from today up to this many days ahead.
export const MAX_TRIP_DAYS_AHEAD = 365;
// Start and destination closer than this (straight line) count as the same place.
export const MIN_TRIP_DISTANCE_KM = 0.2;
// The rectangle around Pakistan (it also takes in border areas of neighbouring
// countries). Trip places must be inside it, and the map stays inside it.
export const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.2, minLng: 60.8, maxLng: 77.9 };
// Fuel estimates use the mileage measured over this many months of fuel entries,
// once at least MIN_MEASURED_MILEAGE_KM were measured; otherwise the stated efficiency.
export const ESTIMATE_HISTORY_MONTHS = 12;
export const MIN_MEASURED_MILEAGE_KM = 300;
// The recommended route may take at most this many times as long as the fastest route.
export const MAX_ROUTE_SLOWDOWN = 1.5;

// Crisis mode (FR-07). Accepting a suggestion gives trips one of these statuses; nothing
// is deleted, and "Plan again" makes the trip planned again.
export const CRISIS_TRIP_STATUSES = ["postponed", "combined"];
export const ALL_TRIP_STATUSES = [...TRIP_STATUSES, ...CRISIS_TRIP_STATUSES];
export const CRISIS_SUGGESTION_TYPES = ["combine", "postpone", "route"];
// Same-day trips whose starts are this close, and whose destinations are this close,
// can be combined into one trip.
export const COMBINE_TRIP_RADIUS_KM = 5;
// Roads are longer than the straight line. Used for the extra stop of a combined trip
// and for trips without routes.
export const ROAD_DISTANCE_FACTOR = 1.3;
// Suggestions that save less driving than this are not worth showing.
export const MIN_CRISIS_SAVING_KM = 1;
