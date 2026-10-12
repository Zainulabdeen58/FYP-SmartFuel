// Crisis mode suggestions (FR-07): pure functions, no database access.
// `trips` are the user's planned trips from today on, oldest first, with their routes.
// Every saving is an estimate: { km, litres, cost }, with litres and cost 0 for electric vehicles.
import {
  COMBINE_TRIP_RADIUS_KM,
  MIN_CRISIS_SAVING_KM,
  ROAD_DISTANCE_FACTOR
} from "../../shared/constants.js";
import { distanceBetweenKm } from "./validation.js";
import { roundToTwoDecimals } from "./numbers.js";

const dayOf = (trip) => trip.date.toISOString().slice(0, 10);
const isIgnored = (trip, type) => Boolean(trip.ignoredSuggestions?.includes(type));

// Road km of the trip: its chosen route, or the straight line × ROAD_DISTANCE_FACTOR
// when it has no routes (route service down or not set up).
function tripKm(trip) {
  const route = trip.routes?.[trip.selectedRoute];
  return route ? route.distanceKm : distanceBetweenKm(trip.start, trip.destination) * ROAD_DISTANCE_FACTOR;
}

// Fuel and money for driving `km` in this trip's vehicle, at the trip's fuel price.
function fuelFor(trip, km) {
  const litres = trip.kmPerLitre ? km / trip.kmPerLitre : 0;
  return { km, litres, cost: litres * (trip.pricePerLitre || 0) };
}

const roundSaving = ({ km, litres, cost }) => ({
  km: roundToTwoDecimals(km),
  litres: roundToTwoDecimals(litres),
  cost: roundToTwoDecimals(cost)
});

// Only what the crisis page shows of a trip.
const toTripSummary = (trip) => ({
  _id: trip._id,
  start: trip.start,
  destination: trip.destination,
  date: trip.date,
  priority: trip.priority,
  vehicle: trip.vehicle
});

function makeSuggestion(type, trips, saving, extra = {}) {
  return {
    id: `${type}:${trips.map((trip) => trip._id).join("+")}`,
    type,
    trips: trips.map(toTripSummary),
    saving: roundSaving(saving),
    ...extra
  };
}

// Same-day trips with close starts and close destinations. Each trip is compared with the
// first trip of a group, so a group can't spread out step by step.
function findCombinableGroups(trips) {
  const groups = [];
  for (const trip of trips) {
    if (isIgnored(trip, "combine")) continue;

    const group = groups.find(
      ([first]) =>
        dayOf(first) === dayOf(trip) &&
        distanceBetweenKm(first.start, trip.start) <= COMBINE_TRIP_RADIUS_KM &&
        distanceBetweenKm(first.destination, trip.destination) <= COMBINE_TRIP_RADIUS_KM
    );
    if (group) group.push(trip);
    else groups.push([trip]);
  }
  return groups.filter((group) => group.length > 1);
}

// The trip the others are added to: an essential one first, then the longest
// (the others become short extra stops on it).
function chooseMainTrip(group) {
  const essentialFirst = (trip) => (trip.priority === "essential" ? 0 : 1);
  return [...group].sort((a, b) => essentialFirst(a) - essentialFirst(b) || tripKm(b) - tripKm(a))[0];
}

// The other trips are not driven; instead the main trip drives on from its destination
// to each of theirs.
function combineSaving(main, others) {
  const saving = { km: 0, litres: 0, cost: 0 };
  for (const other of others) {
    const notDriven = fuelFor(other, tripKm(other));
    const extraStop = fuelFor(main, distanceBetweenKm(main.destination, other.destination) * ROAD_DISTANCE_FACTOR);
    saving.km += notDriven.km - extraStop.km;
    saving.litres += notDriven.litres - extraStop.litres;
    saving.cost += notDriven.cost - extraStop.cost;
  }
  return saving;
}

function combineSuggestion(group) {
  const main = chooseMainTrip(group);
  const others = group.filter((trip) => trip !== main);
  const saving = combineSaving(main, others);
  // Combining an electric vehicle's trip into a petrol one can cost fuel instead of saving it.
  if (saving.km < MIN_CRISIS_SAVING_KM || saving.litres < 0) return null;
  return makeSuggestion("combine", [main, ...others], saving);
}

// A trip that can wait: postponing it saves all of its fuel.
function postponeSuggestion(trip) {
  if (trip.priority !== "non-essential" || isIgnored(trip, "postpone")) return null;
  const saving = fuelFor(trip, tripKm(trip));
  if (saving.km < MIN_CRISIS_SAVING_KM) return null;
  return makeSuggestion("postpone", [trip], saving);
}

// The chosen route is longer than the recommended one (the user picked another).
function routeSuggestion(trip) {
  if (isIgnored(trip, "route")) return null;
  const chosen = trip.routes?.[trip.selectedRoute];
  const recommended = trip.routes?.[trip.recommendedRoute];
  if (!chosen || !recommended) return null;

  const saving = fuelFor(trip, chosen.distanceKm - recommended.distanceKm);
  if (saving.km < MIN_CRISIS_SAVING_KM) return null;
  return makeSuggestion("route", [trip], saving, {
    routeLabel: recommended.label,
    recommendedRoute: trip.recommendedRoute
  });
}

// Every suggestion for these trips. A trip is in at most one suggestion: combining comes
// first, then postponing, then the route; an ignored suggestion lets the next one show.
export function buildCrisisSuggestions(trips) {
  const suggestions = [];
  const tripsInSuggestions = new Set();

  for (const group of findCombinableGroups(trips)) {
    const suggestion = combineSuggestion(group);
    if (!suggestion) continue;
    suggestions.push(suggestion);
    group.forEach((trip) => tripsInSuggestions.add(String(trip._id)));
  }

  for (const trip of trips) {
    if (tripsInSuggestions.has(String(trip._id))) continue;
    const suggestion = postponeSuggestion(trip) || routeSuggestion(trip);
    if (suggestion) suggestions.push(suggestion);
  }
  return suggestions;
}

// What all suggestions together would save (no trip is in two suggestions).
export function totalSaving(suggestions) {
  return roundSaving(
    suggestions.reduce(
      (total, { saving }) => ({
        km: total.km + saving.km,
        litres: total.litres + saving.litres,
        cost: total.cost + saving.cost
      }),
      { km: 0, litres: 0, cost: 0 }
    )
  );
}

// This month's planned trips compared with what is left of the month's budget.
export function compareTripsWithBudget(tripsThisMonth, budgetLeft) {
  const plannedCost = tripsThisMonth.reduce((total, trip) => total + fuelFor(trip, tripKm(trip)).cost, 0);
  return {
    plannedCost: roundToTwoDecimals(plannedCost),
    remaining: roundToTwoDecimals(budgetLeft),
    isShort: plannedCost > budgetLeft
  };
}
