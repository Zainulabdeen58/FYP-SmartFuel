// Values shared with the backend live in shared/constants.js; they are
// re-exported here so components import everything from this file.
export {
  FUEL_TYPES,
  MAX_BUDGET_MONTHS_AHEAD,
  MAX_STATION_LENGTH,
  REGISTER_ROLES,
  ROLES,
  VEHICLE_LIMITS,
} from "../../shared/constants.js";

// Sidebar navigation (Layout.jsx)
export const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/vehicles", label: "Vehicles", icon: "car" },
  { to: "/fuel-records", label: "Fuel Records", icon: "fuel" },
  { to: "/profile", label: "Profile", icon: "user" },
];

export const ADMIN_LINK = {
  to: "/admin",
  label: "Administration",
  icon: "shield",
};

// Display names for the account types (ROLES).
export const ROLE_LABELS = {
  Individual: "Individual",
  Organizational: "Organization",
  Admin: "Admin",
};

// Vehicle form (VehicleForm.jsx)
export const EMPTY_VEHICLE = {
  vehicleName: "",
  registrationNumber: "",
  manufacturer: "",
  modelYear: "",
  fuelType: "Petrol",
  fuelEfficiency: "",
  fuelTankCapacity: "",
};

export const VEHICLE_LABELS = {
  vehicleName: "Vehicle name",
  registrationNumber: "Registration number",
  manufacturer: "Manufacturer",
  modelYear: "Model year",
  fuelType: "Fuel type",
  fuelEfficiency: "Fuel efficiency",
  fuelTankCapacity: "Fuel tank capacity",
};

export const NUMBER_FIELDS = ["modelYear", "fuelEfficiency", "fuelTankCapacity"];

// Fuel record form (FuelRecordForm.jsx)
export const EMPTY_FUEL_RECORD = {
  vehicle: "",
  date: "",
  quantity: "",
  totalCost: "",
  odometer: "",
  station: "",
};

export const FUEL_RECORD_LABELS = {
  vehicle: "Vehicle",
  date: "Date",
  quantity: "Quantity (litres)",
  totalCost: "Total cost (Rs)",
  odometer: "Odometer reading (km, optional)",
  station: "Fuel station (optional)",
};
