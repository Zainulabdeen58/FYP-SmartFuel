import Budget from "../models/Budget.js";
import FuelRecord from "../models/FuelRecord.js";
import Vehicle from "../models/Vehicle.js";
import { isOwnerOrAdmin, ownerFilter } from "../utils/access.js";
import {
  checkFuelEfficiency,
  checkFuelTankCapacity,
  checkFuelType,
  checkManufacturer,
  checkModelYear,
  checkRegistrationNumber,
  checkVehicleName,
  checkVehicleTypeFields,
  firstError,
  normalizeManufacturer,
  normalizeRegistrationNumber,
  registrationNumberPattern
} from "../utils/validation.js";

const fields = [
  "vehicleName",
  "registrationNumber",
  "vehicleType",
  "engineCC",
  "manufacturer",
  "modelYear",
  "fuelType",
  "fuelEfficiency",
  "fuelTankCapacity"
];

const DUPLICATE_REGISTRATION = {
  success: false,
  message: "A vehicle with this registration number already exists"
};

function pickVehicleFields(body) {
  return Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

// Ignores spaces/hyphens, so older "LEA 1234" still counts. excludeId skips the vehicle being edited.
function registrationTaken(registrationNumber, excludeId) {
  return Vehicle.exists({
    registrationNumber: { $regex: `^${registrationNumberPattern(registrationNumber)}$` },
    ...(excludeId && { _id: { $ne: excludeId } })
  });
}

// Same checks as the form; on update (partial) only the fields sent.
function vehicleError(data, partial = false) {
  const check = (key, fn) => (partial && data[key] === undefined ? "" : fn(data[key]));
  return firstError(
    check("vehicleName", checkVehicleName),
    check("registrationNumber", checkRegistrationNumber),
    check("manufacturer", checkManufacturer),
    check("modelYear", checkModelYear),
    check("fuelType", checkFuelType),
    check("fuelEfficiency", checkFuelEfficiency),
    check("fuelTankCapacity", checkFuelTankCapacity)
  );
}

// Checked on the vehicle as it will be saved, so older vehicles without a type
// must get one on their next edit. Runs before vehicleError, like the form, so a
// car's tank says "25 to 80 litres" rather than the general "1 to 1000".
function vehicleTypeError(vehicle) {
  return firstError(...Object.values(checkVehicleTypeFields(vehicle)));
}

function dropEngineForElectric(data, fuelType) {
  if (fuelType === "Electric") data.engineCC = undefined;
}

// One spelling: "lea 1234" → "LEA-1234", "HONDA" → "Honda".
function normalizeVehicleText(data) {
  if (data.registrationNumber !== undefined) {
    data.registrationNumber = normalizeRegistrationNumber(data.registrationNumber);
  }
  if (data.manufacturer !== undefined) {
    data.manufacturer = normalizeManufacturer(data.manufacturer);
  }
}

export async function createVehicle(req, res) {
  const data = pickVehicleFields(req.body);
  const error = vehicleTypeError(data) || vehicleError(data);
  if (error) return res.status(400).json({ success: false, message: error });
  dropEngineForElectric(data, data.fuelType);
  normalizeVehicleText(data);
  if (await registrationTaken(data.registrationNumber)) {
    return res.status(409).json(DUPLICATE_REGISTRATION);
  }

  const vehicle = await Vehicle.create({ ...data, user: req.user._id });
  res.status(201).json({ success: true, message: "Vehicle created", vehicle });
}

export async function getVehicles(req, res) {
  const vehicles = await Vehicle.find(ownerFilter(req)).populate("user", "fullName email");
  res.json({ success: true, vehicles });
}

export async function getVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id).populate("user", "fullName email");
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  // vehicle.user is null if the owner was deleted; then only an admin may see it.
  if (!isOwnerOrAdmin(req, vehicle.user?._id)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  res.json({ success: true, vehicle });
}

export async function updateVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  if (!isOwnerOrAdmin(req, vehicle.user)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const data = pickVehicleFields(req.body);
  const updatedVehicle = { ...vehicle.toObject(), ...data };
  const error = vehicleTypeError(updatedVehicle) || vehicleError(data, true);
  if (error) return res.status(400).json({ success: false, message: error });
  dropEngineForElectric(data, updatedVehicle.fuelType);
  normalizeVehicleText(data);
  if (
    data.registrationNumber !== undefined &&
    (await registrationTaken(data.registrationNumber, vehicle._id))
  ) {
    return res.status(409).json(DUPLICATE_REGISTRATION);
  }

  Object.assign(vehicle, data);
  await vehicle.save();
  res.json({ success: true, message: "Vehicle updated", vehicle });
}

export async function deleteVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  if (!isOwnerOrAdmin(req, vehicle.user)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  await FuelRecord.deleteMany({ vehicle: vehicle._id });
  await Budget.deleteMany({ vehicle: vehicle._id });
  await vehicle.deleteOne();
  res.json({ success: true, message: "Vehicle, its fuel records and budgets deleted" });
}
