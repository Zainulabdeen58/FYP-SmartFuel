import mongoose from "mongoose";
import { MAX_STATION_LENGTH } from "../../shared/constants.js";

const greaterThanZero = (label) => ({
  validator: (value) => value > 0,
  message: `${label} must be greater than 0`,
});

// One fuel purchase. `date` is a calendar day stored as UTC midnight
// (see parseFuelDate in shared/validation.js), so its UTC year/month/day are
// the Pakistan-time date the user picked and month totals never shift.
const fuelRecordSchema = new mongoose.Schema(
  {
    // Owner of the vehicle (also when an admin adds the record), so the
    // user's own list is a simple { user } query.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: [true, "Vehicle is required"] },
    date: { type: Date, required: [true, "Date is required"] },
    quantity: { type: Number, required: [true, "Quantity is required"], validate: greaterThanZero("Quantity") },
    totalCost: { type: Number, required: [true, "Total cost is required"], validate: greaterThanZero("Total cost") },
    // Derived from totalCost / quantity on every save; never taken from the request.
    pricePerLitre: { type: Number },
    odometer: { type: Number, min: [0, "Odometer reading cannot be negative"] },
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
