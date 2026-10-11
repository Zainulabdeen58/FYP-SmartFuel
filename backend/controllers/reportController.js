import mongoose from "mongoose";
import FuelRecord from "../models/FuelRecord.js";
import Vehicle from "../models/Vehicle.js";
import { DEFAULT_REPORT_MONTHS, FUEL_TYPES } from "../../shared/constants.js";
import { ownerFilter } from "../utils/access.js";
import { getMonthDateRange } from "../utils/dates.js";
import {
  buildVehicleStats,
  chooseGrouping,
  listPeriods,
  sumRecords,
  sumRecordsByPeriod
} from "../utils/fuelReport.js";
import {
  checkReportRange,
  currentMonthInPakistan,
  firstMonthOfRange,
  isValidMonth,
  queryText
} from "../utils/validation.js";

// Returns { filters } or { error } for a 400 response.
function readReportFilters(req) {
  const toMonth = queryText(req.query.to) || currentMonthInPakistan();
  const fromMonth =
    queryText(req.query.from) || (isValidMonth(toMonth) ? firstMonthOfRange(toMonth, DEFAULT_REPORT_MONTHS) : "");
  const vehicleId = queryText(req.query.vehicle);
  const fuelType = queryText(req.query.fuelType);
  // `user` is only for admins; ignored for everyone else.
  const userId = req.user.role === "Admin" ? queryText(req.query.user) : "";

  const rangeError = checkReportRange(fromMonth, toMonth);
  if (rangeError) return { error: rangeError };
  if (vehicleId && !mongoose.isValidObjectId(vehicleId)) return { error: "Select a valid vehicle" };
  if (userId && !mongoose.isValidObjectId(userId)) return { error: "Select a valid user" };
  if (fuelType && !FUEL_TYPES.includes(fuelType)) return { error: "Select a valid fuel type" };

  return { filters: { fromMonth, toMonth, vehicleId, fuelType, userId } };
}

// GET /reports?from=YYYY-MM&to=YYYY-MM&vehicle=&fuelType=&user=
// Litres and cost per period and per vehicle (FR-09), with filters (FR-10).
export async function getFuelReport(req, res) {
  const { filters, error } = readReportFilters(req);
  if (error) return res.status(400).json({ success: false, message: error });

  const { fromMonth, toMonth, vehicleId, fuelType, userId } = filters;

  const vehicleQuery = {
    ...ownerFilter(req, userId),
    ...(vehicleId && { _id: vehicleId }),
    ...(fuelType && { fuelType })
  };
  const vehicles = await Vehicle.find(vehicleQuery)
    .select("vehicleName registrationNumber fuelType fuelEfficiency user")
    .populate("user", "fullName")
    .sort({ vehicleName: 1 });

  const records = await FuelRecord.find({
    vehicle: { $in: vehicles.map((vehicle) => vehicle._id) },
    date: { $gte: getMonthDateRange(fromMonth).monthStart, $lt: getMonthDateRange(toMonth).nextMonthStart }
  })
    .select("vehicle date quantity totalCost odometer")
    // Oldest first, as the mileage calculation needs.
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const grouping = chooseGrouping(fromMonth, toMonth);

  res.json({
    success: true,
    report: {
      from: fromMonth,
      to: toMonth,
      grouping,
      totals: sumRecords(records),
      periods: sumRecordsByPeriod(records, listPeriods(fromMonth, toMonth, grouping), grouping),
      vehicles: buildVehicleStats(vehicles, records)
    }
  });
}
