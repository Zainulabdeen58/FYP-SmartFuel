// Re-exports shared/constants.js so components import everything from here.
export {
  COMMON_MANUFACTURERS,
  DEFAULT_REPORT_MONTHS,
  FUEL_TYPES,
  MAX_BUDGET_MONTHS_AHEAD,
  MAX_STATION_LENGTH,
  REGISTER_ROLES,
  ROLES,
  VEHICLE_LIMITS,
  VEHICLE_TYPES,
} from "../../shared/constants.js";

// Number boxes are text boxes with a number keyboard on phones: type="number"
// changes on mouse-wheel scroll and reads some typed text ("e") as empty.
export const NUMBER_INPUT_PROPS = { type: "text", inputMode: "decimal", autoComplete: "off" };

// Sidebar navigation (Layout.jsx)
export const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/vehicles", label: "Vehicles", icon: "car" },
  { to: "/fuel-records", label: "Fuel Records", icon: "fuel" },
  { to: "/reports", label: "Reports", icon: "chart" },
  { to: "/profile", label: "Profile", icon: "user" },
];

export const ADMIN_LINK = {
  to: "/admin",
  label: "Administration",
  icon: "shield",
};

export const ROLE_LABELS = {
  Individual: "Individual",
  Organizational: "Organization",
  Admin: "Admin",
};

// Vehicle form (VehicleForm.jsx)
// The form shows the fields in this order.
export const EMPTY_VEHICLE = {
  vehicleName: "",
  registrationNumber: "",
  vehicleType: "",
  manufacturer: "",
  modelYear: "",
  fuelType: "Petrol",
  engineCC: "",
  fuelEfficiency: "",
  fuelTankCapacity: "",
};

export const VEHICLE_LABELS = {
  vehicleName: "Vehicle name",
  registrationNumber: "Registration number",
  vehicleType: "Vehicle type",
  engineCC: "Engine size (cc)",
  manufacturer: "Manufacturer",
  modelYear: "Model year",
  fuelType: "Fuel type",
  fuelEfficiency: "Fuel efficiency (km/l)",
  fuelTankCapacity: "Fuel tank capacity (litres)",
};

export const NUMBER_FIELDS = ["modelYear", "engineCC", "fuelEfficiency", "fuelTankCapacity"];

// Fuel record form (FuelRecordForm.jsx)
export const EMPTY_FUEL_RECORD = {
  vehicle: "",
  date: "",
  quantity: "",
  totalCost: "",
  odometer: "",
  odometerNotWorking: false,
  station: "",
};

// Reports page (Reports.jsx): ready-made periods, each ending with this month.
export const REPORT_PERIOD_PRESETS = [
  { months: 1, label: "This month" },
  { months: 3, label: "Last 3 months" },
  { months: 6, label: "Last 6 months" },
  { months: 12, label: "Last 12 months" },
];

// How far back the custom "From" and "To" month pickers go.
export const REPORT_MONTHS_TO_CHOOSE_FROM = 60;

export const FUEL_RECORD_LABELS = {
  vehicle: "Vehicle",
  date: "Date",
  quantity: "Quantity (litres)",
  totalCost: "Total cost (Rs)",
  odometer: "Odometer reading (km)",
  station: "Fuel station (optional)",
};
