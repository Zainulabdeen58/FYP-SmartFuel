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

// 289.18 → "289 km"; short distances keep one decimal ("2.4 km").
export const formatDistance = (km) =>
  `${Number(km).toLocaleString("en-US", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;

// 250 → "4 h 10 min", 45 → "45 min"
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const restMinutes = Math.round(minutes % 60);
  if (hours === 0) return `${restMinutes} min`;
  return restMinutes ? `${hours} h ${restMinutes} min` : `${hours} h`;
}

// Stored days are UTC midnight of the picked day, so format them in UTC: "11 Oct 2026".
export const formatDay = (value) =>
  new Date(value).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

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
