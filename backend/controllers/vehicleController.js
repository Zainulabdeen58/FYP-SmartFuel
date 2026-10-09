import FuelRecord from "../models/FuelRecord.js";
import Vehicle from "../models/Vehicle.js";
import { isOwnerOrAdmin } from "../utils/access.js";

const fields = [
  "vehicleName",
  "registrationNumber",
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

// Registration numbers are stored trimmed and uppercase (see the Vehicle schema),
// so compare in the same form. excludeId skips the vehicle being updated.
function registrationTaken(registrationNumber, excludeId) {
  return Vehicle.exists({
    registrationNumber: registrationNumber.trim().toUpperCase(),
    ...(excludeId && { _id: { $ne: excludeId } })
  });
}

// Registration number must be text (a number like 123 would skip the duplicate check).
function isValidRegistration(value) {
  return typeof value === "string" && value.trim() !== "";
}

const INVALID_REGISTRATION = { success: false, message: "Registration number is required" };

export async function createVehicle(req, res) {
  const data = pickVehicleFields(req.body);
  if (!isValidRegistration(data.registrationNumber)) {
    return res.status(400).json(INVALID_REGISTRATION);
  }
  if (await registrationTaken(data.registrationNumber)) {
    return res.status(409).json(DUPLICATE_REGISTRATION);
  }

  const vehicle = await Vehicle.create({ ...data, user: req.user._id });
  res.status(201).json({ success: true, message: "Vehicle created", vehicle });
}

export async function getVehicles(req, res) {
  const filter = req.user.role === "Admin" ? {} : { user: req.user._id };
  const vehicles = await Vehicle.find(filter).populate("user", "fullName email");
  res.json({ success: true, vehicles });
}

export async function getVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id).populate("user", "fullName email");
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  // vehicle.user is null if the owner was deleted; only an admin may see such a record.
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
  if (data.registrationNumber !== undefined) {
    if (!isValidRegistration(data.registrationNumber)) {
      return res.status(400).json(INVALID_REGISTRATION);
    }
    if (await registrationTaken(data.registrationNumber, vehicle._id)) {
      return res.status(409).json(DUPLICATE_REGISTRATION);
    }
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
  await vehicle.deleteOne();
  res.json({ success: true, message: "Vehicle and its fuel records deleted" });
}
