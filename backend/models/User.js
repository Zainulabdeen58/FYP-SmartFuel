import mongoose from "mongoose";
import { ROLES } from "../../shared/constants.js";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, "Full name is required"], trim: true },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    contactNumber: { type: String, required: [true, "Contact number is required"], trim: true },
    role: { type: String, enum: ROLES, required: [true, "Account type is required"] },
    organizationName: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.role === "Organizational";
        },
        "Organization name is required for organizational accounts",
      ],
    },
    // Holds the bcrypt hash. Plain-password rules (minimum length) are checked
    // with checkPassword (shared/validation.js) before hashing.
    password: { type: String, required: true }
  },
  { timestamps: true }
);

// The user fields sent to the client after login, register and profile updates.
userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    contactNumber: this.contactNumber,
    role: this.role,
    organizationName: this.organizationName,
  };
};

export default mongoose.model("User", userSchema);
