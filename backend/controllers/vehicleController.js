import Vehicle from "../models/Vehicle.js";

const fields = [
  "vehicleName",
  "registrationNumber",
  "manufacturer",
  "modelYear",
  "fuelType",
  "fuelEfficiency",
  "fuelTankCapacity"
];

function pickVehicleFields(body) {
  return Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

export async function createVehicle(req, res) {
  try {
    const vehicle = await Vehicle.create({
      ...pickVehicleFields(req.body),
      user: req.user._id
    });
    res.status(201).json({ success: true, message: "Vehicle created", vehicle });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getVehicles(req, res) {
  const filter = req.user.role === "Admin" ? {} : { user: req.user._id };
  const vehicles = await Vehicle.find(filter).populate("user", "fullName email");
  res.json({ success: true, vehicles });
}

export async function getVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id).populate("user", "fullName email");
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  if (req.user.role !== "Admin" && vehicle.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  res.json({ success: true, vehicle });
}

export async function updateVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  if (req.user.role !== "Admin" && vehicle.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  Object.assign(vehicle, pickVehicleFields(req.body));
  await vehicle.save();
  res.json({ success: true, message: "Vehicle updated", vehicle });
}

export async function deleteVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

  if (req.user.role !== "Admin" && vehicle.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  await vehicle.deleteOne();
  res.json({ success: true, message: "Vehicle deleted" });
}
