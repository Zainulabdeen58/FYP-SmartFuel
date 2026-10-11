import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactNumber, formatKmPerLitre, formatLitres, formatRupees, formatVehicleLabel } from "../format";
import { AXIS_TICK, GRID_COLOR, TOOLTIP_STYLE } from "./chartTheme";

const COMPARISON_METRICS = {
  litres: {
    label: "Litres",
    getValue: (vehicleStats) => vehicleStats.litres,
    formatValue: formatLitres,
  },
  cost: {
    label: "Spending",
    getValue: (vehicleStats) => vehicleStats.cost,
    formatValue: formatRupees,
  },
  mileage: {
    label: "Mileage",
    getValue: (vehicleStats) => vehicleStats.mileage.kmPerLitre,
    formatValue: formatKmPerLitre,
  },
};

function formatMileage(mileage) {
  const value = formatKmPerLitre(mileage.kmPerLitre);
  if (mileage.source === "estimate") {
    return mileage.skippedGaps > 0 ? `${value} (estimate, readings incomplete)` : `${value} (estimate)`;
  }
  if (mileage.skippedGaps === 0) return value;
  return `${value} (${mileage.skippedGaps} ${mileage.skippedGaps === 1 ? "gap" : "gaps"} skipped)`;
}

// Per-vehicle chart and table (FR-09); clicking a bar filters to that vehicle (FR-10).
// `vehicleStats` is report.vehicles from GET /reports.
function VehicleComparison({ vehicleStats, onSelectVehicle, showOwner }) {
  const [metricKey, setMetricKey] = useState("litres");
  const metric = COMPARISON_METRICS[metricKey];

  const chartData = vehicleStats.map((stats) => ({
    vehicleId: stats.vehicle._id,
    label: stats.vehicle.vehicleName,
    value: metric.getValue(stats),
    // Estimate: taken from the stated fuel efficiency, not odometer readings.
    isEstimate: metricKey === "mileage" && stats.mileage.source === "estimate",
  }));
  const hasEstimates = chartData.some((bar) => bar.isEstimate);
  const hasSkippedGaps = vehicleStats.some((stats) => stats.mileage.skippedGaps > 0);

  return (
    <div className="chart-card">
      <div className="chart-card-header comparison-header">
        <div>
          <h3>Vehicle comparison</h3>
          <p>Click a bar to see only that vehicle.</p>
        </div>

        <div className="metric-toggle" role="group" aria-label="Compare by">
          {Object.entries(COMPARISON_METRICS).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              className={key === metricKey ? "active" : ""}
              onClick={() => setMetricKey(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 52)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickFormatter={formatCompactNumber}
            tickLine={false}
            axisLine={false}
          />
          <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(value, name, bar) => [
              `${metric.formatValue(value)}${bar.payload.isEstimate ? " (estimate)" : ""}`,
              metric.label,
            ]}
          />
          <Bar
            dataKey="value"
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
            cursor="pointer"
            onClick={(bar) => onSelectVehicle(bar.payload.vehicleId)}
          >
            {chartData.map((bar) => (
              <Cell key={bar.vehicleId} fill={bar.isEstimate ? "var(--text-faint)" : "var(--blue)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {hasEstimates && (
        <p className="chart-note">
          Grey bars are estimates from the vehicle's fuel efficiency, because the period has no usable pair of
          odometer readings for it.
        </p>
      )}

      {metricKey === "mileage" && hasSkippedGaps && (
        <p className="chart-note">
          Some stretches between odometer readings were left out: their mileage was more than twice the
          vehicle's fuel efficiency, so fill-ups seem to be missing there. Record every fill-up for exact mileage.
        </p>
      )}

      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              {showOwner && <th>Owner</th>}
              <th>Entries</th>
              <th>Litres</th>
              <th>Spent</th>
              <th>Mileage</th>
            </tr>
          </thead>
          <tbody>
            {vehicleStats.map((stats) => (
              <tr key={stats.vehicle._id}>
                <td>{formatVehicleLabel(stats.vehicle)}</td>
                {showOwner && <td>{stats.vehicle.ownerName || "—"}</td>}
                <td>{stats.entries}</td>
                <td>{formatLitres(stats.litres)}</td>
                <td>{formatRupees(stats.cost)}</td>
                <td>{formatMileage(stats.mileage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VehicleComparison;
