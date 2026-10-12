import mongoose from "mongoose";
import { ESTIMATE_HISTORY_MONTHS } from "../../shared/constants.js";
import FuelRecord from "../models/FuelRecord.js";
import Trip from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import { isOwnerOrAdmin, ownerFilter } from "../utils/access.js";
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
  queryText
} from "../utils/validation.js";

const fields = ["vehicle", "start", "destination", "date", "purpose", "priority", "status", "pricePerLitre", "selectedRoute"];

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
  res.status(201).json({ success: true, message: savedMessage(trip, "saved"), trip });
}

// ?vehicle=<id>&status=planned|completed; admins may add ?user=<id>. Route lines are left
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
  if (status && checkTripStatus(status)) {
    return res.status(400).json({ success: false, message: checkTripStatus(status) });
  }

  const trips = await Trip.find({
    ...ownerFilter(req, userId),
    ...(vehicleId && { vehicle: vehicleId }),
    ...(status && { status })
  })
    .select("-routes.geometry")
    .populate("vehicle", "vehicleName registrationNumber fuelType vehicleType")
    .populate("user", "fullName email")
    .sort({ date: -1, createdAt: -1 });
  res.json({ success: true, trips });
}

export async function getTrip(req, res) {
  const trip = await Trip.findById(req.params.id)
    .populate("vehicle", "vehicleName registrationNumber fuelType vehicleType")
    .populate("user", "fullName email");
  if (!trip) return res.status(404).json(NOT_FOUND);
  // trip.user is null if the owner was deleted.
  if (!isOwnerOrAdmin(req, trip.user?._id)) return res.status(403).json(NOT_AUTHORIZED);
  res.json({ success: true, trip });
}

// A new vehicle or new places get new routes from the route service; a new price only
// recalculates the rupees of the same routes.
export async function updateTrip(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, trip.user)) return res.status(403).json(NOT_AUTHORIZED);

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
  res.json({ success: true, message: savedMessage(trip, "updated"), trip });
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
  res.json({ success: true, message: savedMessage(trip, "recalculated"), trip });
}

export async function deleteTrip(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, trip.user)) return res.status(403).json(NOT_AUTHORIZED);

  await trip.deleteOne();
  res.json({ success: true, message: "Trip deleted" });
}
