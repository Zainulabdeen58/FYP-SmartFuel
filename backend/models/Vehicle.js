import mongoose from "mongoose";
import { FUEL_TYPES, MIN_MODEL_YEAR, VEHICLE_TYPES, maxModelYear } from "../../shared/constants.js";

// Last guard only; the controller already checks every field.

// Fuel estimates divide by efficiency, so zero must never be stored.
const greaterThanZero = (label) => ({
  validator: (value) => value > 0,
  message: `${label} must be greater than 0`,
});

const vehicleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicleName: { type: String, required: [true, "Vehicle name is required"], trim: true },
    // Unique index blocks duplicates even when two requests arrive at once.
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },
    // Type and engine are optional here so older vehicles still load; the controller requires them.
    vehicleType: { type: String, enum: VEHICLE_TYPES },
    // Engine size in cc; electric vehicles have none.
    engineCC: { type: Number, min: [1, "Engine size must be greater than 0"] },
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
