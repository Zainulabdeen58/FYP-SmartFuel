import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";

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
  const { fullName, email, contactNumber, role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) {
    const exists = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: user._id },
    });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }
    user.email = email.toLowerCase();
  }
  if (contactNumber !== undefined) user.contactNumber = contactNumber;
  if (role !== undefined && ["Individual", "Admin"].includes(role)) {
    if (user._id.toString() === req.user._id.toString() && role !== "Admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin role",
      });
    }
    user.role = role;
  }

  await user.save();
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

  await Vehicle.deleteMany({ user: user._id });
  await user.deleteOne();
  res.json({ success: true, message: "User and their vehicle records deleted" });
}

export async function searchVehicles(req, res) {
  const { user, registrationNumber } = req.query;
  const filter = {};

  if (registrationNumber) {
    filter.registrationNumber = { $regex: registrationNumber, $options: "i" };
  }

  if (user) {
    const users = await User.find({
      $or: [
        { fullName: { $regex: user, $options: "i" } },
        { email: { $regex: user, $options: "i" } }
      ]
    }).select("_id");
    filter.user = { $in: users.map((item) => item._id) };
  }

  const vehicles = await Vehicle.find(filter).populate("user", "fullName email").sort({ createdAt: -1 });
  res.json({ success: true, vehicles });
}
