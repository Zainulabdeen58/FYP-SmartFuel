import bcrypt from "bcryptjs";
import { REGISTER_ROLES } from "../../shared/constants.js";
import User from "../models/User.js";
import { createToken } from "../utils/token.js";
import {
  checkContactNumber,
  checkEmail,
  checkFullName,
  checkOrganizationName,
  checkPassword,
  checkRole,
  firstError
} from "../utils/validation.js";

export async function register(req, res) {
  const { fullName, email, contactNumber, role, organizationName, password } = req.body;
  const isOrganization = role === "Organizational";

  const error = firstError(
    checkFullName(fullName),
    checkEmail(email),
    checkContactNumber(contactNumber),
    checkRole(role, REGISTER_ROLES),
    isOrganization ? checkOrganizationName(organizationName) : "",
    checkPassword(password)
  );
  if (error) return res.status(400).json({ success: false, message: error });

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ success: false, message: "Email already registered" });
  }

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    contactNumber: contactNumber.trim(),
    role,
    ...(isOrganization && { organizationName: organizationName.trim() }),
    password: await bcrypt.hash(password, 12)
  });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    token: createToken(user._id.toString()),
    user: user.toPublic()
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  res.json({
    success: true,
    message: "Login successful",
    token: createToken(user._id.toString()),
    user: user.toPublic()
  });
}

export function logout(req, res) {
  res.json({ success: true, message: "Logged out successfully" });
}
