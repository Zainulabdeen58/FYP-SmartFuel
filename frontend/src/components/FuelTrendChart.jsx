import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactNumber, formatPeriodLabel } from "../format";
import { AXIS_TICK, GRID_COLOR, TOOLTIP_STYLE } from "./chartTheme";

// One value (litres or rupees) per period. Bars, because they read well even with one month.
// `periods` is report.periods from GET /reports: [{ period, litres, cost }].
function FuelTrendChart({ title, description, periods, valueKey, valueLabel, formatValue, color }) {
  const chartData = periods.map((periodTotals) => ({
    label: formatPeriodLabel(periodTotals.period),
    value: periodTotals[valueKey],
  }));

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis
            tick={AXIS_TICK}
            tickFormatter={formatCompactNumber}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [formatValue(value), valueLabel]} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default FuelTrendChart;
