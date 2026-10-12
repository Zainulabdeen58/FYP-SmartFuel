import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { CRISIS_TRIP_STATUSES, TRIP_STATUS_LABELS } from "../constant";
import {
  formatDay,
  formatDistance,
  formatDuration,
  formatLitres,
  formatRupees,
  formatTripPlaces,
  formatVehicleLabel,
} from "../format";
import useTrips from "../hooks/useTrips";
import useVehicles from "../hooks/useVehicles";
import { isTripOverdue } from "../validation";
import Icon from "./Icon";
import TripDetails from "./TripDetails";
import TripForm from "./TripForm";

// Trips page (FR-05, FR-06, FR-11, FR-12). Admins see every trip but cannot change them.
function Trips({ user }) {
  const canChange = user.role !== "Admin";
  const [filters, setFilters] = useState({ vehicle: "", status: "" });
  const { data: vehicles } = useVehicles();
  const { data: trips, error, setError, loading, reload } = useTrips(filters);

  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [openTripId, setOpenTripId] = useState(null);
  // Changes after a save, so the open trip is loaded again.
  const [savedCount, setSavedCount] = useState(0);

  const openTrip = (tripId) => {
    setOpenTripId(tripId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openForm = (trip = null) => {
    setEditingTrip(trip);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTrip(null);
  };

  const remove = async (trip) => {
    if (!confirm("Delete this trip?")) return;

    try {
      await api.delete(`/trips/${trip._id}`);
      if (openTripId === trip._id) setOpenTripId(null);
      reload();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete trip");
    }
  };

  // Totals for planned trips, along each trip's chosen route.
  const plannedRoutes = trips
    .filter((trip) => trip.status === "planned")
    .map((trip) => trip.routes[trip.selectedRoute])
    .filter(Boolean);
  const plannedLitres = plannedRoutes.reduce((sum, route) => sum + (route.litres ?? 0), 0);
  const plannedCost = plannedRoutes.reduce((sum, route) => sum + (route.cost ?? 0), 0);
  const hasFilters = Boolean(filters.vehicle || filters.status);

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">TRIP PLANNER</span>
          <h1>Trips</h1>
          <p>Plan a trip to see its routes on the map, with distance, time and the fuel it needs.</p>
        </div>

        {canChange && (
          <button
            className="submit-button small"
            onClick={() => openForm()}
            disabled={!vehicles.length}
            title={vehicles.length ? "" : "Add a vehicle first"}
          >
            <Icon name="plus" size={18} />
            Plan a trip
          </button>
        )}
      </div>

      {error && <div className="form-error page-error">{error}</div>}

      {showForm && (
        <TripForm
          key={editingTrip?._id || "new"}
          trip={editingTrip}
          vehicles={vehicles}
          crisisMode={user.crisisMode}
          onSave={(savedTrip) => {
            closeForm();
            setSavedCount((count) => count + 1);
            setOpenTripId(savedTrip._id);
            reload();
          }}
          onCancel={closeForm}
        />
      )}

      {openTripId && (
        <TripDetails
          key={`${openTripId}-${savedCount}`}
          tripId={openTripId}
          canChange={canChange}
          onChanged={reload}
          onEdit={openForm}
          onDelete={remove}
          onClose={() => setOpenTripId(null)}
        />
      )}

      <div className="vehicle-summary">
        <div>
          <span>Planned</span>
          <strong>{trips.filter((trip) => trip.status === "planned").length}</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Completed</span>
          <strong>{trips.filter((trip) => trip.status === "completed").length}</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Fuel for planned trips</span>
          <strong>{formatLitres(plannedLitres)}</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Estimated cost</span>
          <strong>{formatRupees(plannedCost)}</strong>
        </div>
      </div>

      <div className="report-filters">
        <div className="field">
          <label htmlFor="trip-filter-vehicle">Vehicle</label>
          <select
            id="trip-filter-vehicle"
            value={filters.vehicle}
            onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })}
          >
            <option value="">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {formatVehicleLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="trip-filter-status">Status</label>
          <select
            id="trip-filter-status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All trips</option>
            {Object.entries(TRIP_STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !trips.length && (
        <div className="empty-state">
          <p>Loading trips...</p>
        </div>
      )}

      {!loading && !trips.length && (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="route" size={28} />
          </div>
          <h3>{hasFilters ? "No trips match these filters" : "No trips yet"}</h3>
          <p>
            {!hasFilters && !vehicles.length
              ? "Add a vehicle first, then plan your first trip."
              : "A trip shows its routes on the map, with the distance, time and fuel each one needs."}
          </p>
          {!hasFilters && canChange && !vehicles.length && (
            <Link className="submit-button small" to="/vehicles">
              <Icon name="car" size={17} />
              Add a vehicle
            </Link>
          )}
        </div>
      )}

      <div className="vehicle-list">
        {trips.map((trip) => {
          const route = trip.routes[trip.selectedRoute];

          return (
            <div className="vehicle-row" key={trip._id}>
              <div className="vehicle-main">
                <div className="vehicle-avatar">
                  <Icon name="route" size={22} />
                </div>

                <div className="vehicle-info">
                  <div className="vehicle-title">
                    <h3>
                      {formatTripPlaces(trip)}
                    </h3>
                    <span className={`vehicle-badge${CRISIS_TRIP_STATUSES.includes(trip.status) ? " muted" : ""}`}>
                      {TRIP_STATUS_LABELS[trip.status]}
                    </span>
                    {trip.priority === "non-essential" && <span className="vehicle-badge muted">Can wait</span>}
                    {isTripOverdue(trip) && <span className="vehicle-badge missing">Overdue</span>}
                  </div>

                  <div className="vehicle-meta">
                    <span>{formatDay(trip.date)}</span>
                    <span className="meta-separator">•</span>
                    <span>{trip.vehicle ? formatVehicleLabel(trip.vehicle) : "Deleted vehicle"}</span>
                    {!canChange && trip.user?.fullName && (
                      <>
                        <span className="meta-separator">•</span>
                        <span>{trip.user.fullName}</span>
                      </>
                    )}
                  </div>

                  <div className="vehicle-details">
                    {route ? (
                      <>
                        <span>
                          Distance: <strong>{formatDistance(route.distanceKm)}</strong>
                        </span>
                        <span>
                          Time: <strong>{formatDuration(route.durationMin)}</strong>
                        </span>
                        {route.litres !== null && (
                          <>
                            <span>
                              Fuel: <strong>{formatLitres(route.litres)}</strong>
                            </span>
                            <span>
                              Cost: <strong>{formatRupees(route.cost)}</strong>
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <span>No routes yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="row-actions">
                <button className="edit-button" onClick={() => openTrip(trip._id)} title="Show on the map">
                  <Icon name="route" size={17} />
                  View
                </button>

                {canChange && (
                  <button className="delete-button" onClick={() => remove(trip)} title="Delete trip">
                    <Icon name="trash" size={17} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Trips;
