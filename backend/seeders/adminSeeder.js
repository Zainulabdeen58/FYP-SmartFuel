// Creates the Admin account. Registration cannot create admins, so this is the
// only way to make the first one (later admins can be made from the
// Administration page). Reads the details from backend/.env:
//   ADMIN_NAME, ADMIN_EMAIL, ADMIN_CONTACT, ADMIN_PASSWORD
// Run: npm run seed:admin
// Safe to run again: an existing admin is left unchanged (its password is not reset).
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { checkContactNumber, checkEmail, checkFullName, checkPassword, firstError } from "../utils/validation.js";

function checkAdminPassword(value) {
  if (!value) return "ADMIN_PASSWORD is not set";
  // Same rule as every other new password (8-64 characters, letters and numbers).
  const error = checkPassword(value);
  if (error) return `ADMIN_PASSWORD: ${error}`;
  // Refuse placeholder passwords copied from examples or docs.
  if (/change.?me|password|admin123|12345678/i.test(value)) {
    return "ADMIN_PASSWORD looks like a placeholder; choose a real password";
  }
  return "";
}

function fail(message) {
  console.error(`Admin seeder: ${message}`);
  process.exit(1);
}

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_CONTACT, ADMIN_PASSWORD } = process.env;

const error = firstError(
  ADMIN_NAME ? checkFullName(ADMIN_NAME) : "ADMIN_NAME is not set",
  ADMIN_EMAIL ? checkEmail(ADMIN_EMAIL) : "ADMIN_EMAIL is not set",
  ADMIN_CONTACT ? checkContactNumber(ADMIN_CONTACT) : "ADMIN_CONTACT is not set",
  checkAdminPassword(ADMIN_PASSWORD)
);
if (error) fail(`${error}. Add the ADMIN_* values to backend/.env (see .env.example).`);

const email = ADMIN_EMAIL.trim().toLowerCase();

await connectDB();

try {
  const existing = await User.findOne({ email }).select("role");

  if (existing?.role === "Admin") {
    console.log(`Admin seeder: ${email} is already an admin. Nothing changed.`);
  } else if (existing) {
    process.exitCode = 1;
    console.error(
      `Admin seeder: ${email} belongs to a ${existing.role} account. ` +
        "Use another ADMIN_EMAIL, or change that user's role from the Administration page."
    );
  } else {
    await User.create({
      fullName: ADMIN_NAME.trim(),
      email,
      contactNumber: ADMIN_CONTACT.trim(),
      role: "Admin",
      password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    });
    console.log(`Admin seeder: admin account created for ${email}.`);
  }
} finally {
  await mongoose.disconnect();
}
