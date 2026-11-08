// Display helpers shared by the frontend and the backend (notification messages), so the
// server writes numbers, days and places exactly as the pages show them.

// 25055.5 → "25,055.5"
export const formatNumber = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

export const formatRupees = (amount) => `Rs ${formatNumber(amount)}`;

export const formatLitres = (litres) => `${formatNumber(litres)} L`;

// 289.18 → "289 km"; short distances keep one decimal ("2.4 km").
export const formatDistance = (km) =>
  `${Number(km).toLocaleString("en-US", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;

// "2026-10" → "October 2026" (monthStyle "short": "Oct 2026")
export function formatMonthLabel(month, monthStyle = "long") {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: monthStyle,
    year: "numeric",
  });
}

// Stored days are UTC midnight of the picked day, so format them in UTC: "11 Oct 2026".
export const formatDay = (value) =>
  new Date(value).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

// "Liberty Market, Lahore, Punjab" → "Liberty Market"
export const formatPlaceName = (place) => place.name.split(",")[0];

// "Liberty Market → Faisal Mosque"
export const formatTripPlaces = (trip) => `${formatPlaceName(trip.start)} → ${formatPlaceName(trip.destination)}`;

// "Civic (LEA-1234)"
export const formatVehicleLabel = (vehicle) => `${vehicle.vehicleName} (${vehicle.registrationNumber})`;
