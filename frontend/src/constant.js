// Sidebar navigation (Layout.jsx)
export const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/vehicles", label: "Vehicles", icon: "car" },
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
