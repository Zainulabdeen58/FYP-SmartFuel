import mongoose from "mongoose";
import FuelRecord from "../models/FuelRecord.js";
import Vehicle from "../models/Vehicle.js";
import { isOwnerOrAdmin } from "../utils/access.js";
import {
  checkFuelDate,
  checkOdometer,
  checkPositiveNumber,
  checkPricePerLitre,
  checkStation,
  firstError,
  parseFuelDate
} from "../utils/validation.js";

const fields = ["vehicle", "date", "quantity", "totalCost", "odometer", "station"];

const NOT_FOUND = { success: false, message: "Fuel record not found" };
const NOT_AUTHORIZED = { success: false, message: "Not authorized" };

function pickFuelFields(body) {
  return Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

// The vehicle a record belongs to, checked for access and fuel type.
// Returns { vehicle } or { status, message } for the error response.
async function findFuelVehicle(req, vehicleId) {
  if (vehicleId === undefined || vehicleId === null || vehicleId === "") {
    return { status: 400, message: "Vehicle is required" };
  }
  if (typeof vehicleId !== "string" || !mongoose.isValidObjectId(vehicleId)) {
    return { status: 400, message: "Select a valid vehicle" };
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) return { status: 404, message: "Vehicle not found" };
  if (!isOwnerOrAdmin(req, vehicle.user)) return { status: 403, message: "Not authorized" };
  if (vehicle.fuelType === "Electric") {
    return { status: 400, message: "Fuel records are not available for electric vehicles" };
  }
  return { vehicle };
}

// Validates a complete record (new values merged over the stored ones on update).
function checkRecord(record) {
  return firstError(
    checkFuelDate(record.date),
    checkPositiveNumber(record.quantity, "Quantity"),
    checkPositiveNumber(record.totalCost, "Total cost"),
    checkOdometer(record.odometer),
    checkStation(record.station),
    // Only meaningful once quantity and cost are both valid numbers.
    record.quantity > 0 && record.totalCost > 0 ? checkPricePerLitre(record.quantity, record.totalCost) : ""
  );
}

function checkTankCapacity(quantity, vehicle) {
  return quantity > vehicle.fuelTankCapacity
    ? `Quantity cannot be more than the vehicle's tank capacity (${vehicle.fuelTankCapacity} L)`
    : "";
}

// Empty optional fields clear the stored value.
function applyFields(record, data) {
  if (data.date !== undefined) record.date = parseFuelDate(data.date);
  if (data.quantity !== undefined) record.quantity = data.quantity;
  if (data.totalCost !== undefined) record.totalCost = data.totalCost;
  if (data.odometer !== undefined) record.odometer = data.odometer === "" || data.odometer === null ? undefined : data.odometer;
  if (data.station !== undefined) record.station = data.station?.trim() || undefined;
}

const toDateText = (date) => date.toISOString().slice(0, 10);

const queryText = (value) => (typeof value === "string" ? value.trim() : "");

export async function createFuelRecord(req, res) {
  const data = pickFuelFields(req.body);

  const error = checkRecord(data);
  if (error) return res.status(400).json({ success: false, message: error });

  const { vehicle, status, message } = await findFuelVehicle(req, data.vehicle);
  if (!vehicle) return res.status(status).json({ success: false, message });

  const tankError = checkTankCapacity(data.quantity, vehicle);
  if (tankError) return res.status(400).json({ success: false, message: tankError });

  const record = new FuelRecord({ user: vehicle.user, vehicle: vehicle._id });
  applyFields(record, data);
  await record.save();
  res.status(201).json({ success: true, message: "Fuel record added", record });
}

// Query: ?vehicle=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD (all optional, dates inclusive).
export async function getFuelRecords(req, res) {
  const filter = req.user.role === "Admin" ? {} : { user: req.user._id };

  const vehicle = queryText(req.query.vehicle);
  if (vehicle) {
    if (!mongoose.isValidObjectId(vehicle)) {
      return res.status(400).json({ success: false, message: "Select a valid vehicle" });
    }
    filter.vehicle = vehicle;
  }

  const from = queryText(req.query.from);
  const to = queryText(req.query.to);
  if ((from && !parseFuelDate(from)) || (to && !parseFuelDate(to))) {
    return res.status(400).json({ success: false, message: "Enter valid dates (YYYY-MM-DD)" });
  }
  if (from && to && from > to) {
    return res.status(400).json({ success: false, message: "Start date must be on or before end date" });
  }
  if (from || to) {
    filter.date = {
      ...(from && { $gte: parseFuelDate(from) }),
      ...(to && { $lte: parseFuelDate(to) })
    };
  }

  const records = await FuelRecord.find(filter)
    .populate("vehicle", "vehicleName registrationNumber fuelType fuelTankCapacity")
    .populate("user", "fullName email")
    .sort({ date: -1, createdAt: -1 });
  res.json({ success: true, records });
}

export async function getFuelRecord(req, res) {
  const record = await FuelRecord.findById(req.params.id)
    .populate("vehicle", "vehicleName registrationNumber fuelType fuelTankCapacity")
    .populate("user", "fullName email");
  if (!record) return res.status(404).json(NOT_FOUND);

  // record.user is populated here (null if the owner no longer exists).
  if (!isOwnerOrAdmin(req, record.user?._id)) return res.status(403).json(NOT_AUTHORIZED);

  res.json({ success: true, record });
}

export async function updateFuelRecord(req, res) {
  const record = await FuelRecord.findById(req.params.id);
  if (!record) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, record.user)) return res.status(403).json(NOT_AUTHORIZED);

  const data = pickFuelFields(req.body);
  const current = {
    date: toDateText(record.date),
    quantity: record.quantity,
    totalCost: record.totalCost,
    odometer: record.odometer,
    station: record.station
  };
  const error = checkRecord({ ...current, ...data });
  if (error) return res.status(400).json({ success: false, message: error });

  const vehicleChanged = data.vehicle !== undefined && String(data.vehicle) !== String(record.vehicle);
  const quantityChanged = data.quantity !== undefined && data.quantity !== record.quantity;

  // Vehicle rules are checked only when the vehicle or quantity changes, so a record
  // stays editable after its vehicle's tank size or fuel type is changed later.
  if (vehicleChanged || quantityChanged) {
    const { vehicle, status, message } = await findFuelVehicle(req, vehicleChanged ? data.vehicle : String(record.vehicle));
    if (!vehicle) return res.status(status).json({ success: false, message });

    const tankError = checkTankCapacity(data.quantity ?? record.quantity, vehicle);
    if (tankError) return res.status(400).json({ success: false, message: tankError });

    record.vehicle = vehicle._id;
    record.user = vehicle.user;
  }

  applyFields(record, data);
  await record.save();
  res.json({ success: true, message: "Fuel record updated", record });
}

export async function deleteFuelRecord(req, res) {
  const record = await FuelRecord.findById(req.params.id);
  if (!record) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, record.user)) return res.status(403).json(NOT_AUTHORIZED);

  await record.deleteOne();
  res.json({ success: true, message: "Fuel record deleted" });
}
