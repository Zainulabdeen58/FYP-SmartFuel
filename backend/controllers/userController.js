import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  checkContactNumber,
  checkEmail,
  checkFullName,
  checkOrganizationName,
  checkPassword,
  firstError
} from "../utils/validation.js";

export async function getProfile(req, res) {
  res.json({ success: true, user: req.user.toPublic() });
}

export async function updateProfile(req, res) {
  const { fullName, email, contactNumber, organizationName, password, currentPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const isOrganization = user.role === "Organizational";
  const error = firstError(
    fullName !== undefined ? checkFullName(fullName) : "",
    email !== undefined ? checkEmail(email) : "",
    contactNumber !== undefined ? checkContactNumber(contactNumber) : "",
    isOrganization && organizationName !== undefined ? checkOrganizationName(organizationName) : "",
    password ? checkPassword(password) : ""
  );
  if (error) return res.status(400).json({ success: false, message: error });

  // A new password needs the current one, so an unattended signed-in browser
  // can't be used to take over the account. 400 (not 401) keeps the frontend
  // from treating a wrong current password as an expired session.
  if (password) {
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ success: false, message: "Enter your current password to set a new one" });
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }
  }

  const normalizedEmail = email !== undefined ? email.trim().toLowerCase() : user.email;
  if (normalizedEmail !== user.email) {
    if (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } })) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }
    user.email = normalizedEmail;
  }

  if (fullName !== undefined) user.fullName = fullName.trim();
  if (contactNumber !== undefined) user.contactNumber = contactNumber.trim();
  if (isOrganization && organizationName !== undefined) user.organizationName = organizationName.trim();
  if (password) user.password = await bcrypt.hash(password, 12);

  await user.save();

  res.json({ success: true, message: "Profile updated", user: user.toPublic() });
}
