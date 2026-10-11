// 25055.5 → "25,055.5"
export const formatNumber = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

export const formatRupees = (amount) => `Rs ${formatNumber(amount)}`;

export const formatLitres = (litres) => `${formatNumber(litres)} L`;

export const formatKmPerLitre = (kmPerLitre) => `${formatNumber(kmPerLitre)} km/l`;

// "2026-10" → "October 2026" (monthStyle "short": "Oct 2026")
export function formatMonthLabel(month, monthStyle = "long") {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: monthStyle,
    year: "numeric",
  });
}

// Report periods: "2026-10" → "Oct 2026"; a year ("2026") stays as is.
export const formatPeriodLabel = (period) => (period.length === 4 ? period : formatMonthLabel(period, "short"));

// Short numbers for chart axes: 25000 → "25K".
export const formatCompactNumber = (value) =>
  Number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });

// "Civic (LEA-1234)"
export const formatVehicleLabel = (vehicle) => `${vehicle.vehicleName} (${vehicle.registrationNumber})`;

// "Car · 1,300cc", "Car" (electric), or "Type missing" for vehicles saved before types existed.
export function formatVehicleType(vehicle) {
  if (!vehicle.vehicleType) return "Type missing";
  return vehicle.engineCC ? `${vehicle.vehicleType} · ${formatNumber(vehicle.engineCC)}cc` : vehicle.vehicleType;
}
