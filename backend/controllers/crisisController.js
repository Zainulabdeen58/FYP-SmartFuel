import Budget from "../models/Budget.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import { loadMonthSpending } from "../utils/budgetStatus.js";
import { buildCrisisSuggestions, compareTripsWithBudget, totalSaving } from "../utils/crisisAdvice.js";
import { getMonthDateRange } from "../utils/dates.js";
import { currentMonthInPakistan } from "../utils/validation.js";

// The routes block admins, so every query here is limited to req.user's own trips.
// Suggestions are never stored: they are worked out from the trips on every request.

const ACCEPTED_MESSAGES = {
  combine: "Trips combined: the others are now done on the first trip",
  postpone: "Trip postponed",
  route: "Recommended route chosen"
};

// What is left of the month's overall budget after its fuel entries; null without a budget.
async function loadBudgetLeft(userId, month) {
  const [budget, spending] = await Promise.all([
    Budget.findOne({ user: userId, month, vehicle: null }),
    loadMonthSpending(userId, month)
  ]);
  return budget ? budget.amount - spending.total : null;
}

// Returns { suggestion } or { status, message }. The suggestion is worked out again from
// the current trips, so one whose trips changed meanwhile can't be used.
async function findSuggestion(req) {
  if (!req.user.crisisMode) return { status: 400, message: "Turn on crisis mode first" };

  const suggestions = buildCrisisSuggestions(await Trip.findUpcomingPlanned(req.user._id));
  const suggestion = suggestions.find(({ id }) => id === req.params.id);
  if (!suggestion) return { status: 404, message: "This suggestion is no longer available" };
  return { suggestion };
}

// GET /crisis: the suggestions, what they would save and the budget check (only while on).
export async function getCrisisAdvice(req, res) {
  if (!req.user.crisisMode) return res.json({ success: true, crisisMode: false, advice: null });

  const month = currentMonthInPakistan();
  const [upcomingTrips, budgetLeft] = await Promise.all([
    Trip.findUpcomingPlanned(req.user._id),
    loadBudgetLeft(req.user._id, month)
  ]);
  const suggestions = buildCrisisSuggestions(upcomingTrips);
  const { nextMonthStart } = getMonthDateRange(month);
  const tripsThisMonth = upcomingTrips.filter((trip) => trip.date < nextMonthStart);

  res.json({
    success: true,
    crisisMode: true,
    advice: {
      plannedTrips: upcomingTrips.length,
      suggestions,
      totalSaving: totalSaving(suggestions),
      budget: budgetLeft === null ? null : { month, ...compareTripsWithBudget(tripsThisMonth, budgetLeft) },
      hasIgnoredSuggestions: upcomingTrips.some((trip) => trip.ignoredSuggestions?.length > 0)
    }
  });
}

// PUT /crisis/mode { enabled }: turning it off only hides the suggestions; trips stay as they are.
export async function setCrisisMode(req, res) {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "Send enabled as true or false" });
  }

  const user = await User.findByIdAndUpdate(req.user._id, { crisisMode: enabled }, { new: true });
  res.json({
    success: true,
    message: enabled ? "Crisis mode is on" : "Crisis mode is off; your trips are unchanged",
    user: user.toPublic()
  });
}

// POST /crisis/suggestions/:id/accept: combined and postponed trips can be planned again
// from the Trips page (POST /trips/:id/plan-again).
export async function acceptSuggestion(req, res) {
  const { suggestion, status, message } = await findSuggestion(req);
  if (!suggestion) return res.status(status).json({ success: false, message });

  // The first trip is the main one of a combine suggestion.
  const [firstTripId, ...otherTripIds] = suggestion.trips.map((trip) => trip._id);

  if (suggestion.type === "combine") {
    await Trip.updateMany({ _id: { $in: otherTripIds } }, { status: "combined", combinedInto: firstTripId });
  } else if (suggestion.type === "postpone") {
    await Trip.updateOne({ _id: firstTripId }, { status: "postponed" });
  } else {
    await Trip.updateOne({ _id: firstTripId }, { selectedRoute: suggestion.recommendedRoute });
  }

  res.json({ success: true, message: ACCEPTED_MESSAGES[suggestion.type] });
}

// POST /crisis/suggestions/:id/ignore: hides it; the trips don't change.
export async function ignoreSuggestion(req, res) {
  const { suggestion, status, message } = await findSuggestion(req);
  if (!suggestion) return res.status(status).json({ success: false, message });

  const tripIds = suggestion.trips.map((trip) => trip._id);
  await Trip.updateMany({ _id: { $in: tripIds } }, { $addToSet: { ignoredSuggestions: suggestion.type } });
  res.json({ success: true, message: "Suggestion ignored" });
}

// DELETE /crisis/ignored: shows every ignored suggestion again.
export async function showIgnoredSuggestions(req, res) {
  await Trip.updateMany({ user: req.user._id }, { $unset: { ignoredSuggestions: 1 } });
  res.json({ success: true, message: "Ignored suggestions are shown again" });
}
