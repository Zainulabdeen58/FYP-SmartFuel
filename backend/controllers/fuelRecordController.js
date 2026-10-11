import mongoose from "mongoose";
import FuelRecord from "../models/FuelRecord.js";
import Vehicle from "../models/Vehicle.js";
import { isOwnerOrAdmin, ownerFilter } from "../utils/access.js";
import {
  checkFuelDate,
  checkOdometer,
  checkPositiveNumber,
  checkPricePerLitre,
  checkStation,
  checkTankCapacity,
  firstError,
  hasOdometerReading,
  parseFuelDate,
  queryText
} from "../utils/validation.js";

// odometerNotWorking (the form's checkbox) is not stored: an entry without a reading is one.
const fields = ["vehicle", "date", "quantity", "totalCost", "odometer", "odometerNotWorking", "station"];

const NOT_FOUND = { success: false, message: "Fuel record not found" };
const NOT_AUTHORIZED = { success: false, message: "Not authorized" };

function pickFuelFields(body) {
  return Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

// Returns { vehicle } (access and fuel type checked) or { status, message } for the error.
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

// Checks the full record (on update: new values merged over the stored ones).
function checkRecord(record) {
  return firstError(
    checkFuelDate(record.date),
    checkPositiveNumber(record.quantity, "Quantity"),
    checkPositiveNumber(record.totalCost, "Total cost"),
    typeof record.odometerNotWorking === "boolean" ? "" : "odometerNotWorking must be true or false",
    checkOdometer(record.odometer, { notWorking: record.odometerNotWorking === true }),
    checkStation(record.station),
    checkPricePerLitre(record.quantity, record.totalCost)
  );
}

const formatDay = (date) =>
  date.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

// Odometer never goes backwards: at least the highest earlier-dated reading and at most
// the lowest later-dated one (same vehicle; same-day entries aren't compared).
async function checkOdometerOrder({ vehicleId, date, odometer, excludedRecordId }) {
  const otherReadings = {
    vehicle: vehicleId,
    odometer: { $ne: null },
    ...(excludedRecordId && { _id: { $ne: excludedRecordId } })
  };

  const [highestEarlierReading, lowestLaterReading] = await Promise.all([
    FuelRecord.findOne({ ...otherReadings, date: { $lt: date } }).sort({ odometer: -1 }),
    FuelRecord.findOne({ ...otherReadings, date: { $gt: date } }).sort({ odometer: 1 })
  ]);

  if (highestEarlierReading && odometer < highestEarlierReading.odometer) {
    return `Odometer must be at least ${highestEarlierReading.odometer.toLocaleString("en-US")} km (your entry on ${formatDay(highestEarlierReading.date)})`;
  }
  if (lowestLaterReading && odometer > lowestLaterReading.odometer) {
    return `Odometer must be at most ${lowestLaterReading.odometer.toLocaleString("en-US")} km (your entry on ${formatDay(lowestLaterReading.date)})`;
  }
  return "";
}

function applyFields(record, data) {
  if (data.date !== undefined) record.date = parseFuelDate(data.date);
  if (data.quantity !== undefined) record.quantity = data.quantity;
  if (data.totalCost !== undefined) record.totalCost = data.totalCost;
  if (data.odometerNotWorking === true) record.odometer = undefined;
  else if (data.odometer !== undefined) record.odometer = data.odometer;
  // An empty station clears the stored one.
  if (data.station !== undefined) record.station = data.station?.trim() || undefined;
}

const toDateText = (date) => date.toISOString().slice(0, 10);

export async function createFuelRecord(req, res) {
  const data = pickFuelFields(req.body);
  data.odometerNotWorking ??= false;

  const error = checkRecord(data);
  if (error) return res.status(400).json({ success: false, message: error });

  const { vehicle, status, message } = await findFuelVehicle(req, data.vehicle);
  if (!vehicle) return res.status(status).json({ success: false, message });

  const tankError = checkTankCapacity(data.quantity, vehicle.fuelTankCapacity);
  if (tankError) return res.status(400).json({ success: false, message: tankError });

  if (!data.odometerNotWorking) {
    const orderError = await checkOdometerOrder({
      vehicleId: vehicle._id,
      date: parseFuelDate(data.date),
      odometer: Number(data.odometer)
    });
    if (orderError) return res.status(400).json({ success: false, message: orderError });
  }

  const record = new FuelRecord({ user: vehicle.user, vehicle: vehicle._id });
  applyFields(record, data);
  await record.save();
  res.status(201).json({ success: true, message: "Fuel record added", record });
}

// ?vehicle=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD (all optional, dates inclusive).
export async function getFuelRecords(req, res) {
  const filter = ownerFilter(req);

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

  // record.user is populated (null if the owner was deleted).
  if (!isOwnerOrAdmin(req, record.user?._id)) return res.status(403).json(NOT_AUTHORIZED);

  res.json({ success: true, record });
}

export async function updateFuelRecord(req, res) {
  const record = await FuelRecord.findById(req.params.id);
  if (!record) return res.status(404).json(NOT_FOUND);
  if (!isOwnerOrAdmin(req, record.user)) return res.status(403).json(NOT_AUTHORIZED);

  const data = pickFuelFields(req.body);
  // Sending a reading without the checkbox value means the odometer works.
  if (data.odometer !== undefined && data.odometerNotWorking === undefined) data.odometerNotWorking = false;

  const current = {
    date: toDateText(record.date),
    quantity: record.quantity,
    totalCost: record.totalCost,
    odometer: record.odometer,
    // No reading (also older entries from before readings were required) = "not working".
    odometerNotWorking: !hasOdometerReading(record),
    station: record.station
  };
  const updated = { ...current, ...data };
  const error = checkRecord(updated);
  if (error) return res.status(400).json({ success: false, message: error });

  const vehicleChanged = data.vehicle !== undefined && String(data.vehicle) !== String(record.vehicle);
  const quantityChanged = data.quantity !== undefined && data.quantity !== record.quantity;
  const dateChanged = data.date !== undefined && data.date !== current.date;
  const odometerChanged = data.odometer !== undefined && Number(data.odometer) !== record.odometer;

  // Vehicle rules run only when vehicle or quantity changes, so old records stay editable after the vehicle is edited.
  if (vehicleChanged || quantityChanged) {
    const { vehicle, status, message } = await findFuelVehicle(req, vehicleChanged ? data.vehicle : String(record.vehicle));
    if (!vehicle) return res.status(status).json({ success: false, message });

    const tankError = checkTankCapacity(data.quantity ?? record.quantity, vehicle.fuelTankCapacity);
    if (tankError) return res.status(400).json({ success: false, message: tankError });

    record.vehicle = vehicle._id;
    record.user = vehicle.user;
  }

  // Likewise, reading order is checked only when the reading, date or vehicle changes.
  if (!updated.odometerNotWorking && (odometerChanged || dateChanged || vehicleChanged)) {
    const orderError = await checkOdometerOrder({
      vehicleId: record.vehicle,
      date: parseFuelDate(updated.date),
      odometer: Number(updated.odometer),
      excludedRecordId: record._id
    });
    if (orderError) return res.status(400).json({ success: false, message: orderError });
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
