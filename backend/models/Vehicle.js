import mongoose from "mongoose";
import { FUEL_TYPES, MIN_MODEL_YEAR, maxModelYear } from "../../shared/constants.js";

// The controller checks every field first (shared/validation.js); these schema
// rules are a last guard for code paths that skip the controller.

// Fuel estimates divide by efficiency, so zero must never be stored.
const greaterThanZero = (label) => ({
  validator: (value) => value > 0,
  message: `${label} must be greater than 0`,
});

const vehicleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicleName: { type: String, required: [true, "Vehicle name is required"], trim: true },
    // unique: the database itself refuses a second vehicle with the same number,
    // even if two requests arrive at the same moment.
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },
    manufacturer: { type: String, required: [true, "Manufacturer is required"], trim: true },
    modelYear: {
      type: Number,
      required: [true, "Model year is required"],
      validate: {
        validator: (value) => Number.isInteger(value) && value >= MIN_MODEL_YEAR && value <= maxModelYear(),
        message: () => `Model year must be a whole number between ${MIN_MODEL_YEAR} and ${maxModelYear()}`,
      },
    },
    fuelType: { type: String, enum: FUEL_TYPES, required: [true, "Fuel type is required"] },
    fuelEfficiency: {
      type: Number,
      required: [true, "Fuel efficiency is required"],
      validate: greaterThanZero("Fuel efficiency"),
    },
    fuelTankCapacity: {
      type: Number,
      required: [true, "Fuel tank capacity is required"],
      validate: greaterThanZero("Fuel tank capacity"),
    }
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
