import { useState } from "react";
import { FUEL_TYPES, REPORT_MONTHS_TO_CHOOSE_FROM, REPORT_PERIOD_PRESETS } from "../constant";
import { formatMonthLabel, formatVehicleLabel } from "../format";
import { currentMonthInPakistan, firstMonthOfRange, listMonths } from "../validation";

// Electric vehicles have no fuel entries, so leave them out.
const FILTERABLE_FUEL_TYPES = FUEL_TYPES.filter((fuelType) => fuelType !== "Electric");

const RANGE_FIELDS = [
  { name: "from", label: "From" },
  { name: "to", label: "To" },
];

// Newest first.
function getChoosableMonths() {
  const currentMonth = currentMonthInPakistan();
  return listMonths(firstMonthOfRange(currentMonth, REPORT_MONTHS_TO_CHOOSE_FROM), currentMonth).reverse();
}

function findMatchingPreset(filters) {
  const currentMonth = currentMonthInPakistan();
  return REPORT_PERIOD_PRESETS.find(
    (preset) => filters.to === currentMonth && filters.from === firstMonthOfRange(currentMonth, preset.months),
  );
}

// Reports filter bar (FR-10). `onChange` gets only the changed filters; `users` is for admins only.
function ReportFilters({ filters, vehicles, users, isAdmin, onChange, onReset }) {
  const matchingPreset = findMatchingPreset(filters);
  // Custom when the user chose it, or when the range matches no preset.
  const [customChosen, setCustomChosen] = useState(false);
  const isCustomRange = customChosen || !matchingPreset;

  // An admin who picked a user sees only that user's vehicles.
  const vehicleOptions = vehicles.filter(
    (vehicle) =>
      vehicle.fuelType !== "Electric" && (!filters.user || (vehicle.user?._id || vehicle.user) === filters.user),
  );

  const choosableMonths = isCustomRange ? getChoosableMonths() : [];

  const choosePeriod = (value) => {
    if (value === "custom") {
      setCustomChosen(true);
      return;
    }
    const currentMonth = currentMonthInPakistan();
    setCustomChosen(false);
    onChange({ from: firstMonthOfRange(currentMonth, Number(value)), to: currentMonth });
  };

  const resetAll = () => {
    setCustomChosen(false);
    onReset();
  };

  return (
    <div className="report-filters">
      <div className="field">
        <label htmlFor="report-period">Period</label>
        <select
          id="report-period"
          value={isCustomRange ? "custom" : matchingPreset.months}
          onChange={(e) => choosePeriod(e.target.value)}
        >
          {REPORT_PERIOD_PRESETS.map((preset) => (
            <option key={preset.months} value={preset.months}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom range</option>
        </select>
      </div>

      {isCustomRange &&
        RANGE_FIELDS.map(({ name, label }) => (
          <div className="field" key={name}>
            <label htmlFor={`report-${name}`}>{label}</label>
            <select id={`report-${name}`} value={filters[name]} onChange={(e) => onChange({ [name]: e.target.value })}>
              {choosableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </div>
        ))}

      {isAdmin && (
        <div className="field">
          <label htmlFor="report-user">User</label>
          {/* Clear the vehicle too: another user's vehicle would show no data. */}
          <select id="report-user" value={filters.user} onChange={(e) => onChange({ user: e.target.value, vehicle: "" })}>
            <option value="">All users</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.fullName} ({user.email})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="report-vehicle">Vehicle</label>
        <select id="report-vehicle" value={filters.vehicle} onChange={(e) => onChange({ vehicle: e.target.value })}>
          <option value="">All vehicles</option>
          {vehicleOptions.map((vehicle) => (
            <option key={vehicle._id} value={vehicle._id}>
              {formatVehicleLabel(vehicle)}
              {isAdmin && vehicle.user?.fullName ? ` · ${vehicle.user.fullName}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="report-fuel-type">Fuel type</label>
        <select id="report-fuel-type" value={filters.fuelType} onChange={(e) => onChange({ fuelType: e.target.value })}>
          <option value="">All fuel types</option>
          {FILTERABLE_FUEL_TYPES.map((fuelType) => (
            <option key={fuelType} value={fuelType}>
              {fuelType}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="secondary-button report-reset" onClick={resetAll}>
        Reset filters
      </button>
    </div>
  );
}

export default ReportFilters;
