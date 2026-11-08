// Notifications for critical events (FR-13): a budget nearly used or exceeded, an inefficient
// trip, and crisis mode suggestions. Controllers call these after a change is saved.
// Every event has a key, so the same event never makes a second notification.
import { INEFFICIENT_ROUTE_PERCENT } from "../../shared/constants.js";
import {
  formatDay,
  formatDistance,
  formatLitres,
  formatMonthLabel,
  formatPlaceName,
  formatRupees,
  formatTripPlaces,
  formatVehicleLabel
} from "../../shared/format.js";
import Budget from "../models/Budget.js";
import Notification from "../models/Notification.js";
import Trip from "../models/Trip.js";
import { getBudgetStatus, loadMonthSpending } from "./budgetStatus.js";
import { buildCrisisSuggestions } from "./crisisAdvice.js";
import { roundToTwoDecimals } from "./numbers.js";

// Saves the notification unless the user already has one with this key.
function notifyOnce(userId, key, { type, message, link }) {
  return Notification.updateOne({ user: userId, key }, { $setOnInsert: { type, message, link } }, { upsert: true });
}

// A notification is extra: if saving it fails, the user's own change is already saved,
// so the error is only logged instead of failing the request.
async function runSafely(task) {
  try {
    await task();
  } catch (error) {
    console.error("Could not save a notification:", error);
  }
}

// ---------- Budget (FR-08) ----------

function budgetMessage(budget, spent, status) {
  const budgetName = budget.vehicle
    ? `the ${formatMonthLabel(budget.month)} budget of ${formatVehicleLabel(budget.vehicle)}`
    : `your ${formatMonthLabel(budget.month)} budget`;
  const used = `${formatRupees(spent)} of ${formatRupees(budget.amount)}`;

  return status === "over"
    ? `You have gone over ${budgetName}: ${used} spent.`
    : `You have used ${Math.round((spent / budget.amount) * 100)}% of ${budgetName} (${used}).`;
}

// After fuel spending or a budget of the month changes: one notification when a budget
// reaches 80% and one when it is exceeded. A budget that jumps past 100% gets only the second.
export function notifyBudgetLimits(userId, month) {
  return runSafely(async () => {
    const [budgets, spending] = await Promise.all([
      Budget.find({ user: userId, month }).populate("vehicle", "vehicleName registrationNumber"),
      loadMonthSpending(userId, month)
    ]);

    for (const budget of budgets) {
      const spent = budget.vehicle ? spending.perVehicle.get(String(budget.vehicle._id)) ?? 0 : spending.total;
      const status = getBudgetStatus(spent, budget.amount);
      if (status === "ok") continue;

      const budgetKey = `${month}:${budget.vehicle?._id ?? "overall"}`;
      if (status === "warning" && (await Notification.exists({ user: userId, key: `budget-over:${budgetKey}` }))) {
        continue;
      }
      await notifyOnce(userId, `budget-${status}:${budgetKey}`, {
        type: `budget-${status}`,
        message: budgetMessage(budget, spent, status),
        link: "/dashboard"
      });
    }
  });
}

// ---------- Trips (FR-05, FR-07) ----------

// A planned trip whose chosen route needs INEFFICIENT_ROUTE_PERCENT more fuel than the
// recommended one. Litres follow the km (same vehicle, same mileage), so the routes' km are
// compared; this also covers electric vehicles, which have no litres.
async function notifyInefficientTrip(trip) {
  const chosen = trip.routes[trip.selectedRoute];
  const recommended = trip.routes[trip.recommendedRoute];
  if (trip.status !== "planned" || !chosen || !recommended) return;

  const extraPercent = (chosen.distanceKm / recommended.distanceKm - 1) * 100;
  if (extraPercent < INEFFICIENT_ROUTE_PERCENT) return;

  const tripText = `${formatTripPlaces(trip)} on ${formatDay(trip.date)}`;
  const message =
    chosen.litres === null
      ? `The route you chose for ${tripText} is about ${Math.round(extraPercent)}% longer than the recommended “${recommended.label}” route (${formatDistance(chosen.distanceKm - recommended.distanceKm)} more).`
      : `The route you chose for ${tripText} needs about ${Math.round(extraPercent)}% more fuel than the recommended “${recommended.label}” route (${formatLitres(roundToTwoDecimals(chosen.litres - recommended.litres))} and ${formatRupees(Math.round(chosen.cost - recommended.cost))} more).`;

  await notifyOnce(trip.user, `inefficient-trip:${trip._id}`, {
    type: "inefficient-trip",
    message,
    link: `/trips?trip=${trip._id}`
  });
}

function crisisMessage({ type, trips, saving }) {
  const [firstTrip, ...otherTrips] = trips;
  const savingText = saving.cost > 0
    ? `${formatDistance(saving.km)} of driving and about ${formatRupees(Math.round(saving.cost))}`
    : `${formatDistance(saving.km)} of driving`;

  if (type === "combine") {
    const otherStops = otherTrips.map((trip) => formatPlaceName(trip.destination)).join(", ");
    return `Make your ${trips.length} trips on ${formatDay(firstTrip.date)} one trip (${formatTripPlaces(firstTrip)}, then on to ${otherStops}) to save ${savingText}.`;
  }
  return `${formatTripPlaces(firstTrip)} on ${formatDay(firstTrip.date)} can wait; postponing it saves ${savingText}.`;
}

// While crisis mode is on: the suggestions that combine or postpone this trip. A route that
// needs more fuel already has its own notification (inefficient trip), so it is not repeated.
async function notifyCrisisSuggestions(user, trip) {
  if (!user.crisisMode) return;

  const suggestions = buildCrisisSuggestions(await Trip.findUpcomingPlanned(user._id));
  for (const suggestion of suggestions) {
    const isAboutThisTrip = suggestion.trips.some((suggestedTrip) => suggestedTrip._id.equals(trip._id));
    if (suggestion.type === "route" || !isAboutThisTrip) continue;

    await notifyOnce(user._id, `crisis-suggestion:${suggestion.id}`, {
      type: "crisis-suggestion",
      message: crisisMessage(suggestion),
      link: `/crisis?suggestion=${encodeURIComponent(suggestion.id)}`
    });
  }
}

// After a trip is saved. Only the owner changes a trip (admins may only look), so `user`
// is the trip's owner.
export function notifyAboutTrip(user, trip) {
  return runSafely(async () => {
    await notifyInefficientTrip(trip);
    await notifyCrisisSuggestions(user, trip);
  });
}
