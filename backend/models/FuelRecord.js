import mongoose from "mongoose";
import { MAX_ODOMETER_READING, MAX_STATION_LENGTH } from "../../shared/constants.js";

const greaterThanZero = (label) => ({
  validator: (value) => value > 0,
  message: `${label} must be greater than 0`,
});

// `date` is the picked day stored as UTC midnight (parseFuelDate), so always read it in UTC.
const fuelRecordSchema = new mongoose.Schema(
  {
    // The vehicle's owner, also when an admin adds the record.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: [true, "Vehicle is required"] },
    date: { type: Date, required: [true, "Date is required"] },
    quantity: { type: Number, required: [true, "Quantity is required"], validate: greaterThanZero("Quantity") },
    totalCost: { type: Number, required: [true, "Total cost is required"], validate: greaterThanZero("Total cost") },
    // Computed in pre("validate") below; never taken from the request.
    pricePerLitre: { type: Number },
    // Km. Not required here: "odometer not working" entries and older ones have none.
    odometer: {
      type: Number,
      min: [0, "Odometer reading cannot be negative"],
      max: [MAX_ODOMETER_READING, "Odometer reading is too large"],
    },
    station: { type: String, trim: true, maxlength: [MAX_STATION_LENGTH, `Station name must be at most ${MAX_STATION_LENGTH} characters`] },
  },
  { timestamps: true }
);

fuelRecordSchema.index({ user: 1, date: -1 });
fuelRecordSchema.index({ vehicle: 1, date: -1 });

fuelRecordSchema.pre("validate", function () {
  if (this.quantity > 0 && this.totalCost > 0) {
    this.pricePerLitre = Math.round((this.totalCost / this.quantity) * 100) / 100;
  }
});

export default mongoose.model("FuelRecord", fuelRecordSchema);
