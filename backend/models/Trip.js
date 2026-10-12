import mongoose from "mongoose";
import {
  MAX_PLACE_NAME_LENGTH,
  MAX_TRIP_PURPOSE_LENGTH,
  TRIP_PRIORITIES,
  TRIP_STATUSES,
} from "../../shared/constants.js";

const placeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: MAX_PLACE_NAME_LENGTH },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

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
    status: { type: String, enum: TRIP_STATUSES, default: "planned" },

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

export default mongoose.model("Trip", tripSchema);
