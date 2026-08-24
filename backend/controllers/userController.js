import bcrypt from "bcryptjs";
import User from "../models/User.js";

export async function getProfile(req, res) {
  res.json({ success: true, user: req.user });
}

export async function updateProfile(req, res) {
  try {
    const { fullName, email, contactNumber, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (email && email.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ success: false, message: "Email already in use" });
      user.email = email.toLowerCase();
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (password) user.password = await bcrypt.hash(password, 12);

    await user.save();

    res.json({
      success: true,
      message: "Profile updated",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
