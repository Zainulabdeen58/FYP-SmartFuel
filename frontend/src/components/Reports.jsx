import { Link } from "react-router-dom";
import api from "../api";
import { formatLitres, formatPeriodLabel, formatRupees } from "../format";
import useFetch from "../hooks/useFetch";
import useFuelReport from "../hooks/useFuelReport";
import useReportFilters from "../hooks/useReportFilters";
import useVehicles from "../hooks/useVehicles";
import FuelTrendChart from "./FuelTrendChart";
import Icon from "./Icon";
import ReportFilters from "./ReportFilters";
import VehicleComparison from "./VehicleComparison";

// "Sept 2026" for one month, "Nov 2025 – Oct 2026" for a range.
function formatReportPeriod(report) {
  if (report.from === report.to) return formatPeriodLabel(report.from);
  const perYear = report.grouping === "year" ? " (per year)" : "";
  return `${formatPeriodLabel(report.from)} – ${formatPeriodLabel(report.to)}${perYear}`;
}

// Reports page (FR-09), filters kept in the URL (FR-10). Admins see every user's data.
function Reports({ user }) {
  const isAdmin = user.role === "Admin";
  const { filters, updateFilters, resetFilters } = useReportFilters();
  const { data, error, loading } = useFuelReport(filters);
  // On an error, hide the last report so it isn't shown under filters it doesn't match.
  const report = error ? null : data;

  // Options for the filter dropdowns.
  const { data: vehicles } = useVehicles();
  const { data: users } = useFetch(
    async () => {
      const { data } = await api.get("/admin/users");
      return data.users;
    },
    [],
    { immediate: isAdmin, initialData: [] },
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">ANALYTICS</span>
          <h1>Reports</h1>
          <p>How much fuel you buy and spend over time, and how your vehicles compare.</p>
        </div>
      </div>

      <ReportFilters
        filters={filters}
        vehicles={vehicles}
        users={users}
        isAdmin={isAdmin}
        onChange={updateFilters}
        onReset={resetFilters}
      />

      {error && <div className="form-error page-error">{error}</div>}

      {loading && !report && !error && (
        <div className="empty-state">
          <p>Loading report...</p>
        </div>
      )}

      {report && report.totals.entries === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="chart" size={28} />
          </div>
          <h3>No fuel entries for these filters</h3>
          <p>Choose a longer period or other filters, or add a fuel entry.</p>
          <Link className="submit-button small" to="/fuel-records">
            <Icon name="fuel" size={17} />
            Go to fuel records
          </Link>
        </div>
      )}

      {report && report.totals.entries > 0 && (
        <>
          <div className="vehicle-summary">
            <div>
              <span>Entries</span>
              <strong>{report.totals.entries}</strong>
            </div>

            <div className="summary-divider" />

            <div>
              <span>Fuel bought</span>
              <strong>{formatLitres(report.totals.litres)}</strong>
            </div>

            <div className="summary-divider" />

            <div>
              <span>Total spent</span>
              <strong>{formatRupees(report.totals.cost)}</strong>
            </div>

            <div className="summary-divider" />

            <div>
              <span>Period</span>
              <strong>{formatReportPeriod(report)}</strong>
            </div>
          </div>

          <div className="report-grid">
            <FuelTrendChart
              title="Fuel bought"
              description={`Litres per ${report.grouping}`}
              periods={report.periods}
              valueKey="litres"
              valueLabel="Fuel bought"
              formatValue={formatLitres}
              color="var(--green)"
            />

            <FuelTrendChart
              title="Fuel spending"
              description={`Rupees per ${report.grouping}`}
              periods={report.periods}
              valueKey="cost"
              valueLabel="Spent"
              formatValue={formatRupees}
              color="var(--purple)"
            />
          </div>

          <VehicleComparison
            vehicleStats={report.vehicles}
            onSelectVehicle={(vehicleId) => updateFilters({ vehicle: vehicleId })}
            showOwner={isAdmin}
          />
        </>
      )}
    </section>
  );
}

export default Reports;
