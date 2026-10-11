// Pure calculations for the fuel report (FR-09); no database access.
import { MAX_MILEAGE_FACTOR, MAX_MONTHLY_REPORT_MONTHS } from "../../shared/constants.js";
import { roundToTwoDecimals } from "./numbers.js";
import { countMonths, hasOdometerReading, listMonths } from "./validation.js";

export function chooseGrouping(fromMonth, toMonth) {
  return countMonths(fromMonth, toMonth) > MAX_MONTHLY_REPORT_MONTHS ? "year" : "month";
}

// Every period in the range, so empty months still show as 0.
export function listPeriods(fromMonth, toMonth, grouping) {
  if (grouping === "year") {
    const firstYear = Number(fromMonth.slice(0, 4));
    const lastYear = Number(toMonth.slice(0, 4));
    return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(firstYear + index));
  }
  return listMonths(fromMonth, toMonth);
}

// Uses the UTC month, because dates are stored as UTC midnight of the picked day.
function getPeriodOfDate(date, grouping) {
  const month = date.toISOString().slice(0, 7);
  return grouping === "year" ? month.slice(0, 4) : month;
}

export function sumRecordsByPeriod(records, periods, grouping) {
  const totalsByPeriod = new Map(periods.map((period) => [period, { litres: 0, cost: 0 }]));

  for (const record of records) {
    const periodTotals = totalsByPeriod.get(getPeriodOfDate(record.date, grouping));
    periodTotals.litres += record.quantity;
    periodTotals.cost += record.totalCost;
  }

  return periods.map((period) => ({
    period,
    litres: roundToTwoDecimals(totalsByPeriod.get(period).litres),
    cost: roundToTwoDecimals(totalsByPeriod.get(period).cost)
  }));
}

export function sumRecords(records) {
  return {
    entries: records.length,
    litres: roundToTwoDecimals(records.reduce((total, record) => total + record.quantity, 0)),
    cost: roundToTwoDecimals(records.reduce((total, record) => total + record.totalCost, 0))
  };
}

// Real mileage (full-tank method), gap by gap: the distance between two readings
// divided by the litres bought in that gap (entries without a reading count too).
// A gap above MAX_MILEAGE_FACTOR x the stated efficiency is skipped (fill-ups were not recorded).
// `vehicleRecords`: one vehicle's records, oldest first. kmPerLitre is null if no gap was usable.
export function calculateMileage(vehicleRecords, statedKmPerLitre) {
  const highestBelievableKmPerLitre = statedKmPerLitre * MAX_MILEAGE_FACTOR;
  let previousReading = null;
  let litresSincePreviousReading = 0;
  let countedDistanceKm = 0;
  let countedLitres = 0;
  let skippedGaps = 0;

  for (const record of vehicleRecords) {
    if (previousReading !== null) litresSincePreviousReading += record.quantity;
    if (!hasOdometerReading(record)) continue;

    if (previousReading !== null) {
      const gapDistanceKm = record.odometer - previousReading;
      // Repeated reading (same-day top-up): its fuel carries into the next gap.
      if (gapDistanceKm <= 0) continue;

      if (gapDistanceKm / litresSincePreviousReading <= highestBelievableKmPerLitre) {
        countedDistanceKm += gapDistanceKm;
        countedLitres += litresSincePreviousReading;
      } else {
        skippedGaps += 1;
      }
    }

    previousReading = record.odometer;
    litresSincePreviousReading = 0;
  }

  return {
    kmPerLitre: countedLitres > 0 ? roundToTwoDecimals(countedDistanceKm / countedLitres) : null,
    distanceKm: roundToTwoDecimals(countedDistanceKm),
    skippedGaps
  };
}

// Per-vehicle totals and mileage. With no usable gap, mileage falls back to the stated
// fuel efficiency (source "estimate"). `records` must be oldest first.
export function buildVehicleStats(vehicles, records) {
  // Each vehicle's records, grouped in one pass (they stay oldest first).
  const recordsByVehicle = new Map();
  for (const record of records) {
    const vehicleId = String(record.vehicle);
    if (!recordsByVehicle.has(vehicleId)) recordsByVehicle.set(vehicleId, []);
    recordsByVehicle.get(vehicleId).push(record);
  }

  return vehicles
    .filter((vehicle) => recordsByVehicle.has(String(vehicle._id)))
    .map((vehicle) => {
      const vehicleRecords = recordsByVehicle.get(String(vehicle._id));
      const measured = calculateMileage(vehicleRecords, vehicle.fuelEfficiency);
      const mileage =
        measured.kmPerLitre !== null
          ? { kmPerLitre: measured.kmPerLitre, distanceKm: measured.distanceKm, source: "odometer" }
          : { kmPerLitre: vehicle.fuelEfficiency, distanceKm: null, source: "estimate" };

      return {
        vehicle: {
          _id: vehicle._id,
          vehicleName: vehicle.vehicleName,
          registrationNumber: vehicle.registrationNumber,
          fuelType: vehicle.fuelType,
          ownerName: vehicle.user?.fullName ?? null
        },
        ...sumRecords(vehicleRecords),
        mileage: { ...mileage, skippedGaps: measured.skippedGaps }
      };
    });
}
