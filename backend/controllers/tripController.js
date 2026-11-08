import mongoose from "mongoose";
import { ALL_TRIP_STATUSES, CRISIS_TRIP_STATUSES, ESTIMATE_HISTORY_MONTHS } from "../../shared/constants.js";
import FuelRecord from "../models/FuelRecord.js";
import Trip, { TRIP_VEHICLE_FIELDS } from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import { isOwnerOrAdmin, ownerFilter } from "../utils/access.js";
import { notifyAboutTrip } from "../utils/notifications.js";
import { findRoutes } from "../utils/ors.js";
import { addFuelEstimates, buildEstimateBasis, chooseRecommended } from "../utils/tripEstimate.js";
import {
  checkDifferentPlaces,
  checkFuelPrice,
  checkPlace,
  checkTripDate,
  checkTripPriority,
  checkTripPurpose,
  checkTripStatus,
  firstError,
  parseFuelDate,
  queryText,
  todayInPakistan
} from "../utils/validation.js";

const fields = ["vehicle", "start", "destination", "date", "purpose", "priority", "status", "pricePerLitre", "selectedRoute"];

// Enough of another trip to name it ("Liberty Market → Faisal Mosque, 12 Oct").
const LINKED_TRIP_FIELDS = "start destination date status";

const NOT_FOUND = { success: false, message: "Trip not found" };
const NOT_AUTHORIZED = { success: false, message: "Not authorized" };

function pickTripFields(body) {
  return Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

const toDateText = (date) => date.toISOString().slice(0, 10);

// Not sent counts as unchanged.
const samePlace = (sent, saved) =>
  sent === undefined || (sent?.name === saved.name && sent?.lat === saved.lat && sent?.lng === saved.lng);

// Returns { vehicle } (the user's own; any for an admin) or { status, message } for the error.
async function findTripVehicle(req, vehicleId) {
  if (vehicleId === undefined || vehicleId === null || vehicleId === "") {
    return { status: 400, message: "Vehicle is required" };
  }
  if (typeof vehicleId !== "string" || !mongoose.isValidObjectId(vehicleId)) {
    return { status: 400, message: "Select a valid vehicle" };
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) return { status: 404, message: "Vehicle not found" };
  if (!isOwnerOrAdmin(req, vehicle.user)) return { status: 403, message: "Not authorized" };
  return { vehicle };
}

// km/l, tank range and latest price from the vehicle's recent fuel records.
async function loadEstimateBasis(vehicle) {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - ESTIMATE_HISTORY_MONTHS);
  const records = await FuelRecord.find({ vehicle: vehicle._id, date: { $gte: since } })
    .select("date quantity odometer pricePerLitre")
    .sort({ date: 1, createdAt: 1 })
    .lean();
  return buildEstimateBasis(vehicle, records);
}

// The trip as it will be saved (on update: new values merged over the stored ones).
// The date rule runs only for a new trip or a changed date or status, so a planned trip
// whose day has passed can still be edited or marked completed.
function checkTrip(trip, { isElectric, checkDate }) {
  return firstError(
    checkPlace(trip.start, "Start"),
    checkPlace(trip.destination, "Destination"),
    checkDifferentPlaces(trip.start, trip.destination),
    checkTripStatus(trip.status),
    checkDate ? checkTripDate(trip.date, trip.status) : "",
    checkTripPriority(trip.priority),
    checkTripPurpose(trip.purpose),
    isElectric ? "" : checkFuelPrice(trip.pricePerLitre)
  );
}

// Saves the estimate basis on the trip, then asks the route service for its routes.
// Never fails: when the service can't help, the trip keeps no routes and a routeError.
async function calculateRoutes(trip, vehicle) {
  const basis = await loadEstimateBasis(vehicle);
  trip.kmPerLitre = basis.kmPerLitre;
  trip.mileageSource = basis.mileageSource;
  trip.tankRangeKm = basis.tankRangeKm;

  const { routes, message } = await findRoutes({
    start: trip.start,
    destination: trip.destination,
    vehicleType: vehicle.vehicleType
  });
  trip.routesCalculatedAt = new Date();

  if (!routes) {
    trip.routes = [];
    trip.recommendedRoute = null;
    trip.selectedRoute = null;
    trip.routeError = message;
    return;
  }
  trip.routes = addFuelEstimates(routes, trip);
  trip.recommendedRoute = chooseRecommended(trip.routes);
  trip.selectedRoute = trip.recommendedRoute;
  trip.routeError = undefined;
}

// A trip as the client shows it: with its vehicle and owner, and its crisis mode links
// (the trip it was combined into, and the trips combined into it). Every trip response
// uses this, so the details stay complete after any change.
async function withDetails(trip) {
  const [, combinedTrips] = await Promise.all([
    trip.populate([
      { path: "vehicle", select: TRIP_VEHICLE_FIELDS },
      { path: "user", select: "fullName email" },
      { path: "combinedInto", select: LINKED_TRIP_FIELDS }
    ]),
    Trip.find({ combinedInto: trip._id }).select(LINKED_TRIP_FIELDS).sort({ createdAt: 1 }).lean()
  ]);
  return { ...trip.toObject(), combinedTrips };
}

const savedMessage = (trip, action) =>
  trip.routeError ? `Trip ${action}, but routes could not be calculated: ${trip.routeError}` : `Trip ${action}`;

// GET /trips/estimate-basis?vehicle=<id>: what the trip form prefills (km/l, latest price).
export async function getEstimateBasis(req, res) {
  const { vehicle, status, message } = await findTripVehicle(req, queryText(req.query.vehicle));
  if (!vehicle) return res.status(status).json({ success: false, message });
  res.json({ success: true, basis: await loadEstimateBasis(vehicle) });
}

export async function createTrip(req, res) {
  const data = pickTripFields(req.body);
  const { vehicle, status, message } = await findTripVehicle(req, data.vehicle);
  if (!vehicle) return res.status(status).json({ success: false, message });

  // A new trip is always planned.
  const isElectric = vehicle.fuelType === "Electric";
  const error = checkTrip({ ...data, status: "planned" }, { isElectric, checkDate: true });
  if (error) return res.status(400).json({ success: false, message: error });

  const trip = new Trip({
    user: vehicle.user,
    vehicle: vehicle._id,
    start: data.start,
    destination: data.destination,
    date: parseFuelDate(data.date),
    purpose: data.purpose?.trim() || undefined,
    priority: data.priority,
    status: "planned",
    pricePerLitre: isElectric ? null : Number(data.pricePerLitre)
  });
  await calculateRoutes(trip, vehicle);
  await trip.save();
  await notifyAboutTrip(req.user, trip);
  res.status(201).json({ success: true, message: savedMessage(trip, "saved"), trip: await withDetails(trip) });
}

// ?vehicle=<id>&status=<any trip status>; admins may add ?user=<id>. Route lines are left
// out (GET /trips/:id has them).
export async function getTrips(req, res) {
  const userId = req.user.role === "Admin" ? queryText(req.query.user) : "";
  const vehicleId = queryText(req.query.vehicle);
  const status = queryText(req.query.status);

  if (userId && !mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Select a valid user" });
  }
  if (vehicleId && !mongoose.isValidObjectId(vehicleId)) {
    return res.status(400).json({ success: false, message: "Select a valid vehicle" });
  }
  if (status && !ALL_TRIP_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Choose a valid status" });
  }

  const trips = await Trip.find({
    ...ownerFilter(req, userId),
    ...(vehicleId && { vehicle: vehicleId }),
    ...(status && { status })
  })
    .select("-routes.geometry")
    .populate("vehicle", TRIP_VEHICLE_FIELDS)
    .populate("user", "fullName email")
    .sort({ date: -1, createdAt: -1 });
  res.json({ success: true, trips });
}

export async function getTrip(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, trip.user)) return res.status(403).json(NOT_AUTHORIZED);
  res.json({ success: true, trip: await withDetails(trip) });
}

// A new vehicle or new places get new routes from the route service; a new price only
// recalculates the rupees of the same routes.
export async function updateTrip(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, trip.user)) return res.status(403).json(NOT_AUTHORIZED);
  if (CRISIS_TRIP_STATUSES.includes(trip.status)) {
    return res.status(400).json({ success: false, message: `This trip is ${trip.status}: plan it again before changing it` });
  }

  const data = pickTripFields(req.body);
  const vehicleChanged = data.vehicle !== undefined && String(data.vehicle) !== String(trip.vehicle);
  const { vehicle, status, message } = await findTripVehicle(req, vehicleChanged ? data.vehicle : String(trip.vehicle));
  if (!vehicle) return res.status(status).json({ success: false, message });

  const isElectric = vehicle.fuelType === "Electric";
  const current = {
    start: trip.start.toObject(),
    destination: trip.destination.toObject(),
    date: toDateText(trip.date),
    purpose: trip.purpose,
    priority: trip.priority,
    status: trip.status,
    pricePerLitre: trip.pricePerLitre
  };
  const dateOrStatusChanged =
    (data.date !== undefined && data.date !== current.date) ||
    (data.status !== undefined && data.status !== current.status);
  const error = checkTrip({ ...current, ...data }, { isElectric, checkDate: dateOrStatusChanged });
  if (error) return res.status(400).json({ success: false, message: error });

  const placesChanged = !samePlace(data.start, trip.start) || !samePlace(data.destination, trip.destination);
  const needsNewRoutes = vehicleChanged || placesChanged;
  if (
    data.selectedRoute !== undefined &&
    !needsNewRoutes &&
    !(Number.isInteger(data.selectedRoute) && data.selectedRoute >= 0 && data.selectedRoute < trip.routes.length)
  ) {
    return res.status(400).json({ success: false, message: "Select one of the trip's routes" });
  }

  if (vehicleChanged) {
    trip.vehicle = vehicle._id;
    trip.user = vehicle.user;
  }
  if (data.start !== undefined) trip.start = data.start;
  if (data.destination !== undefined) trip.destination = data.destination;
  if (data.date !== undefined) trip.date = parseFuelDate(data.date);
  if (data.purpose !== undefined) trip.purpose = data.purpose?.trim() || undefined;
  if (data.priority !== undefined) trip.priority = data.priority;
  if (data.status !== undefined) trip.status = data.status;

  const priceChanged = !isElectric && data.pricePerLitre !== undefined && Number(data.pricePerLitre) !== trip.pricePerLitre;
  trip.pricePerLitre = isElectric ? null : Number(data.pricePerLitre ?? trip.pricePerLitre);

  if (needsNewRoutes) {
    await calculateRoutes(trip, vehicle);
  } else {
    if (priceChanged) trip.routes = addFuelEstimates(trip.routes.map((route) => route.toObject()), trip);
    if (data.selectedRoute !== undefined) trip.selectedRoute = data.selectedRoute;
  }

  await trip.save();
  // Trips combined into this one were done along with it.
  if (trip.status === "completed" && current.status !== "completed") {
    await Trip.updateMany({ combinedInto: trip._id, status: "combined" }, { status: "completed" });
  }
  await notifyAboutTrip(req.user, trip);
  res.json({ success: true, message: savedMessage(trip, "updated"), trip: await withDetails(trip) });
}

// POST /trips/:id/routes: asks for the routes again (after a route service problem, or
// for newer mileage). Only for planned trips; a completed trip keeps its numbers.
export async function recalculateTripRoutes(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, trip.user)) return res.status(403).json(NOT_AUTHORIZED);
  if (trip.status !== "planned") {
    return res.status(400).json({ success: false, message: "Only planned trips can be recalculated" });
  }

  const vehicle = await Vehicle.findById(trip.vehicle);
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  await calculateRoutes(trip, vehicle);
  await trip.save();
  await notifyAboutTrip(req.user, trip);
  res.json({ success: true, message: savedMessage(trip, "recalculated"), trip: await withDetails(trip) });
}

// POST /trips/:id/plan-again: undoes an accepted crisis mode suggestion (postponed or
// combined → planned). That suggestion is then ignored for this trip, so it isn't made again.
// The date is not checked: a trip whose day has passed shows as overdue.
export async function planTripAgain(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, trip.user)) return res.status(403).json(NOT_AUTHORIZED);
  if (!CRISIS_TRIP_STATUSES.includes(trip.status)) {
    return res.status(400).json({ success: false, message: "Only postponed or combined trips can be planned again" });
  }

  const undoneSuggestion = trip.status === "postponed" ? "postpone" : "combine";
  trip.ignoredSuggestions = [...(trip.ignoredSuggestions || []), undoneSuggestion];
  trip.status = "planned";
  trip.combinedInto = undefined;
  await trip.save();
  await notifyAboutTrip(req.user, trip);

  const isOverdue = toDateText(trip.date) < todayInPakistan();
  res.json({
    success: true,
    message: isOverdue ? "Trip planned again; its day has passed, so change the date" : "Trip planned again",
    trip: await withDetails(trip)
  });
}

export async function deleteTrip(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, trip.user)) return res.status(403).json(NOT_AUTHORIZED);

  await trip.deleteOne();
  await Trip.releaseCombinedTrips([trip._id]);
  res.json({ success: true, message: "Trip deleted" });
}
