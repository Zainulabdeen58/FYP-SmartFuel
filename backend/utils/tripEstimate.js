// Pure calculations for a trip's fuel estimate (FR-06); no database access.
// This is an estimate: traffic, hills and AC are not included.
import { MAX_ROUTE_SLOWDOWN, MIN_MEASURED_MILEAGE_KM } from "../../shared/constants.js";
import { calculateMileage } from "./fuelReport.js";
import { roundToTwoDecimals } from "./numbers.js";

// What a vehicle's estimates are based on. km/l is the mileage measured from odometer
// readings once enough km were measured, otherwise the stated fuel efficiency.
// `records`: the vehicle's recent fuel records, oldest first. Electric vehicles get nulls.
export function buildEstimateBasis(vehicle, records) {
  if (vehicle.fuelType === "Electric") {
    return { fuelType: vehicle.fuelType, kmPerLitre: null, mileageSource: null, tankRangeKm: null, latestPrice: null };
  }

  const measured = calculateMileage(records, vehicle.fuelEfficiency);
  const useMeasured = measured.kmPerLitre !== null && measured.distanceKm >= MIN_MEASURED_MILEAGE_KM;
  const kmPerLitre = useMeasured ? measured.kmPerLitre : vehicle.fuelEfficiency;
  const latestRecord = records.at(-1);

  return {
    fuelType: vehicle.fuelType,
    kmPerLitre,
    mileageSource: useMeasured ? "odometer" : "stated",
    tankRangeKm: roundToTwoDecimals(kmPerLitre * vehicle.fuelTankCapacity),
    latestPrice: latestRecord ? { pricePerLitre: latestRecord.pricePerLitre, date: latestRecord.date } : null,
  };
}

// Adds litres, rupees and the refuel warning to each route. Without km/l (electric)
// litres and cost stay null.
export function addFuelEstimates(routes, { kmPerLitre, pricePerLitre, tankRangeKm }) {
  return routes.map((route) => {
    const litres = kmPerLitre ? route.distanceKm / kmPerLitre : null;
    return {
      ...route,
      litres: litres === null ? null : roundToTwoDecimals(litres),
      cost: litres === null || !pricePerLitre ? null : roundToTwoDecimals(litres * pricePerLitre),
      needsRefuel: Boolean(tankRangeKm) && route.distanceKm > tankRangeKm,
    };
  });
}

// Index of the route that uses the least fuel. Litres = km ÷ km/l, so that is the
// shortest route, but only among routes taking at most MAX_ROUTE_SLOWDOWN times the
// fastest one's time, so a much slower back road is not recommended. Ties go to the faster.
export function chooseRecommended(routes) {
  if (routes.length === 0) return null;
  const fastestMinutes = Math.min(...routes.map((route) => route.durationMin));

  let bestIndex = null;
  routes.forEach((route, index) => {
    if (route.durationMin > fastestMinutes * MAX_ROUTE_SLOWDOWN) return;
    const best = routes[bestIndex];
    const isBetter =
      !best ||
      route.distanceKm < best.distanceKm ||
      (route.distanceKm === best.distanceKm && route.durationMin < best.durationMin);
    if (isBetter) bestIndex = index;
  });
  return bestIndex;
}
