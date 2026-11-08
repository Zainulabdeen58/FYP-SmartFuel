import { formatMonthLabel, formatNumber } from "../../shared/format.js";

// Helpers the server also uses (in notification messages) live in shared/format.js;
// components import every helper from here.
export {
  formatDay,
  formatDistance,
  formatLitres,
  formatMonthLabel,
  formatNumber,
  formatPlaceName,
  formatRupees,
  formatTripPlaces,
  formatVehicleLabel,
} from "../../shared/format.js";

export const formatKmPerLitre = (kmPerLitre) => `${formatNumber(kmPerLitre)} km/l`;

// Report periods: "2026-10" → "Oct 2026"; a year ("2026") stays as is.
export const formatPeriodLabel = (period) => (period.length === 4 ? period : formatMonthLabel(period, "short"));

// 250 → "4 h 10 min", 45 → "45 min"
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const restMinutes = Math.round(minutes % 60);
  if (hours === 0) return `${restMinutes} min`;
  return restMinutes ? `${hours} h ${restMinutes} min` : `${hours} h`;
}

// When something happened: "Just now", "5 min ago", "3 h ago", then the day ("12 Oct 2026").
export function formatTimeAgo(value) {
  const minutes = Math.floor((Date.now() - new Date(value)) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Short numbers for chart axes: 25000 → "25K".
export const formatCompactNumber = (value) =>
  Number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });

// "Car · 1,300cc", "Car" (electric), or "Type missing" for vehicles saved before types existed.
export function formatVehicleType(vehicle) {
  if (!vehicle.vehicleType) return "Type missing";
  return vehicle.engineCC ? `${vehicle.vehicleType} · ${formatNumber(vehicle.engineCC)}cc` : vehicle.vehicleType;
}
