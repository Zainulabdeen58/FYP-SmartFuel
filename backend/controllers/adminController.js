import Budget from "../models/Budget.js";
import FuelRecord from "../models/FuelRecord.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import {
  checkContactNumber,
  checkEmail,
  checkFullName,
  checkOrganizationName,
  checkRole,
  escapeRegex,
  firstError,
  queryText,
  registrationNumberPattern
} from "../utils/validation.js";

export async function getUsers(req, res) {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ success: true, users });
}

export async function getUser(req, res) {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, user });
}

export async function updateUser(req, res) {
  const { fullName, email, contactNumber, role, organizationName } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const nextRole = role ?? user.role;
  const error = firstError(
    fullName !== undefined ? checkFullName(fullName) : "",
    email !== undefined ? checkEmail(email) : "",
    contactNumber !== undefined ? checkContactNumber(contactNumber) : "",
    role !== undefined ? checkRole(role) : "",
    // Check the sent value (even null), otherwise the saved one.
    nextRole === "Organizational"
      ? checkOrganizationName(organizationName !== undefined ? organizationName : user.organizationName)
      : ""
  );
  if (error) return res.status(400).json({ success: false, message: error });

  if (user._id.equals(req.user._id) && nextRole !== "Admin") {
    return res.status(400).json({
      success: false,
      message: "You cannot remove your own admin role",
    });
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } })) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }
    user.email = normalizedEmail;
  }
  if (fullName !== undefined) user.fullName = fullName.trim();
  if (contactNumber !== undefined) user.contactNumber = contactNumber.trim();

  user.role = nextRole;
  if (nextRole !== "Organizational") {
    user.organizationName = undefined;
  } else if (organizationName !== undefined) {
    user.organizationName = organizationName.trim();
  }

  await user.save();

  // Drop budgets the new role can't have (admins: none; vehicle budgets: Organizational only).
  if (nextRole === "Admin") {
    await Budget.deleteMany({ user: user._id });
  } else if (nextRole !== "Organizational") {
    await Budget.deleteMany({ user: user._id, vehicle: { $ne: null } });
  }

  res.json({ success: true, message: "User updated", user: { ...user.toObject(), password: undefined } });
}

export async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own account",
    });
  }

  await FuelRecord.deleteMany({ user: user._id });
  await Budget.deleteMany({ user: user._id });
  await Trip.deleteMany({ user: user._id });
  await Vehicle.deleteMany({ user: user._id });
  await user.deleteOne();
  res.json({ success: true, message: "User and their vehicles, fuel records, budgets and trips deleted" });
}

export async function searchVehicles(req, res) {
  const user = queryText(req.query.user);
  const registrationNumber = queryText(req.query.registrationNumber);
  const filter = {};

  if (registrationNumber) {
    // Ignores spaces/hyphens: "LEA 12" also finds "LEA-1234".
    filter.registrationNumber = { $regex: registrationNumberPattern(registrationNumber) };
  }

  if (user) {
    const pattern = escapeRegex(user);
    const users = await User.find({
      $or: [
        { fullName: { $regex: pattern, $options: "i" } },
        { email: { $regex: pattern, $options: "i" } }
      ]
    }).select("_id");
    filter.user = { $in: users.map((item) => item._id) };
  }

  const vehicles = await Vehicle.find(filter).populate("user", "fullName email").sort({ createdAt: -1 });
  res.json({ success: true, vehicles });
}
