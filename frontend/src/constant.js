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

// Account types (AuthPage.jsx, UserForm.jsx, validation.js).
// Keep in step with ROLES in backend/models/User.js.
export const ROLES = ["Individual", "Organizational", "Admin"];

// Roles a user can pick when registering. Admins are created by another admin.
// Keep in step with REGISTER_ROLES in backend/utils/validation.js.
export const REGISTER_ROLES = ["Individual", "Organizational"];

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

export const FUEL_TYPES = ["Petrol", "Diesel", "Electric"];

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

// Price per litre outside this range is treated as a typing mistake.
// Keep in step with backend/utils/validation.js.
export const MIN_PRICE_PER_LITRE = 100;
export const MAX_PRICE_PER_LITRE = 1000;
