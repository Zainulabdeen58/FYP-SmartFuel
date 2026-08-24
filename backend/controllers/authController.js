import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { createToken } from "../utils/token.js";

export async function register(req, res) {
  try {
    const { fullName, email, contactNumber, role, password } = req.body;

    if (!fullName || !email || !contactNumber || !role || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!["Individual", "Admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      contactNumber,
      role,
      password: hashedPassword
    });

    const token = createToken(user._id.toString());
    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
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

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = createToken(user._id.toString());
    res.json({
      success: true,
      message: "Login successful",
      token,
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

export function logout(req, res) {
  res.json({ success: true, message: "Logged out successfully" });
}
