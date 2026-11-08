import mongoose from "mongoose";
import {
  ALL_TRIP_STATUSES,
  CRISIS_SUGGESTION_TYPES,
  MAX_PLACE_NAME_LENGTH,
  MAX_TRIP_PURPOSE_LENGTH,
  TRIP_PRIORITIES,
} from "../../shared/constants.js";
import { parseFuelDate, todayInPakistan } from "../../shared/validation.js";

const placeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: MAX_PLACE_NAME_LENGTH },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

// The vehicle fields sent with a trip (populate select).
export const TRIP_VEHICLE_FIELDS = "vehicleName registrationNumber fuelType vehicleType";

// One way from start to destination. litres and cost are null for electric vehicles.
const routeSchema = new mongoose.Schema(
  {
    label: String,
    distanceKm: Number,
    durationMin: Number,
    litres: Number,
    cost: Number,
    // Longer than one full tank.
    needsRefuel: Boolean,
    // Encoded polyline (Google format) of the road line.
    geometry: String,
  },
  { _id: false }
);

// `date` is the picked day stored as UTC midnight (parseFuelDate), like fuel records.
const tripSchema = new mongoose.Schema(
  {
    // The vehicle's owner.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: [true, "Vehicle is required"] },
    start: { type: placeSchema, required: true },
    destination: { type: placeSchema, required: true },
    date: { type: Date, required: [true, "Date is required"] },
    purpose: { type: String, trim: true, maxlength: MAX_TRIP_PURPOSE_LENGTH },
    priority: { type: String, enum: TRIP_PRIORITIES, required: true },
    // "postponed" and "combined" are set only by accepting a crisis mode suggestion.
    status: { type: String, enum: ALL_TRIP_STATUSES, default: "planned" },
    // A "combined" trip is done along with this trip.
    combinedInto: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
    // Crisis mode suggestion types the user ignored (or undid) for this trip.
    ignoredSuggestions: { type: [{ type: String, enum: CRISIS_SUGGESTION_TYPES }], default: undefined },

    // What the fuel estimate is based on, saved so the trip keeps its numbers
    // when the vehicle or prices change later. All null for electric vehicles.
    kmPerLitre: Number,
    mileageSource: { type: String, enum: ["odometer", "stated"] },
    pricePerLitre: Number,
    tankRangeKm: Number,

    routes: [routeSchema],
    // Indexes into `routes`.
    recommendedRoute: Number,
    selectedRoute: Number,
    // Why there are no routes (route service down, limit reached, no road found).
    routeError: String,
    routesCalculatedAt: Date,
  },
  { timestamps: true }
);

tripSchema.index({ user: 1, date: -1 });
tripSchema.index({ vehicle: 1, date: -1 });
tripSchema.index({ combinedInto: 1 }, { sparse: true });

// Call when these trips are deleted: trips that were combined into them are planned on
// their own again.
tripSchema.statics.releaseCombinedTrips = function (deletedTripIds) {
  return this.updateMany(
    { combinedInto: { $in: deletedTripIds }, status: "combined" },
    { status: "planned", $unset: { combinedInto: 1 } }
  );
};

// The user's planned trips from today on (Pakistan time), oldest first, without route lines:
// what crisis mode suggestions are worked out from. Overdue trips are left out.
tripSchema.statics.findUpcomingPlanned = function (userId) {
  return this.find({ user: userId, status: "planned", date: { $gte: parseFuelDate(todayInPakistan()) } })
    .select("-routes.geometry")
    .populate("vehicle", TRIP_VEHICLE_FIELDS)
    .sort({ date: 1, createdAt: 1 })
    .lean();
};

export default mongoose.model("Trip", tripSchema);
