import { useState } from "react";
import api from "../api";
import { CRISIS_TRIP_STATUSES, TRIP_PRIORITY_LABELS, TRIP_STATUS_LABELS } from "../constant";
import { formatDay, formatPlaceName, formatTripPlaces, formatVehicleLabel } from "../format";
import useTrip from "../hooks/useTrip";
import { isTripOverdue } from "../validation";
import Icon from "./Icon";
import RouteList from "./RouteList";
import TripMap from "./TripMap";

// Motorways are closed to these in Pakistan; their routes already avoid them.
const NO_MOTORWAY_TYPES = ["Motorcycle", "Rickshaw"];

// One trip: its routes on the map and in a table, and what can be done with it.
// `canChange` is false for admins, who may only look.
function TripDetails({ tripId, canChange, onChanged, onEdit, onDelete, onClose }) {
  const { data: trip, setData: setTrip, error, loading } = useTrip(tripId);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  // "Trip not found" when it was deleted after a notification about it was made.
  if (!trip) {
    return (
      <div className="chart-card trip-details">
        {error ? (
          <div className="trip-missing">
            <div className="form-error">{error}</div>
            <button type="button" className="secondary-button" onClick={onClose}>
              <Icon name="close" size={16} />
              Close
            </button>
          </div>
        ) : (
          <p className="chart-note">{loading ? "Loading trip..." : ""}</p>
        )}
      </div>
    );
  }

  const isPlanned = trip.status === "planned";
  // Postponed or combined by an accepted crisis mode suggestion.
  const isSetAsideInCrisis = CRISIS_TRIP_STATUSES.includes(trip.status);
  const canChooseRoute = canChange && isPlanned && trip.routes.length > 1;

  const change = async (request) => {
    setBusy(true);
    setActionError("");
    try {
      const { data } = await request();
      setTrip(data.trip);
      onChanged();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not update the trip");
    } finally {
      setBusy(false);
    }
  };

  // Shown at once and saved in the background; put back if saving fails.
  const chooseRoute = async (index) => {
    if (index === trip.selectedRoute) return;
    const previousTrip = trip;
    setTrip({ ...trip, selectedRoute: index });
    setActionError("");
    try {
      await api.put(`/trips/${trip._id}`, { selectedRoute: index });
      onChanged();
    } catch (err) {
      setTrip(previousTrip);
      setActionError(err.response?.data?.message || "Could not choose the route");
    }
  };
  const recalculate = () => change(() => api.post(`/trips/${trip._id}/routes`));
  const markCompleted = () => change(() => api.put(`/trips/${trip._id}`, { status: "completed" }));
  const planAgain = () => change(() => api.post(`/trips/${trip._id}/plan-again`));

  return (
    <div className="chart-card trip-details">
      <div className="trip-details-header">
        <div>
          <div className="vehicle-title">
            <h3>
              {trip.start.name} → {trip.destination.name}
            </h3>
          </div>

          <div className="vehicle-meta">
            <span>{formatDay(trip.date)}</span>
            <span className="meta-separator">•</span>
            <span>{trip.vehicle ? formatVehicleLabel(trip.vehicle) : "Deleted vehicle"}</span>
            {trip.user?.fullName && (
              <>
                <span className="meta-separator">•</span>
                <span>{trip.user.fullName}</span>
              </>
            )}
          </div>

          <div className="trip-badges">
            <span className={`vehicle-badge${isSetAsideInCrisis ? " muted" : ""}`}>{TRIP_STATUS_LABELS[trip.status]}</span>
            <span className={`vehicle-badge${trip.priority === "essential" ? "" : " muted"}`}>
              {TRIP_PRIORITY_LABELS[trip.priority]}
            </span>
            {isTripOverdue(trip) && <span className="vehicle-badge missing">Overdue: mark completed or change the date</span>}
          </div>

          {trip.purpose && <p className="chart-note">{trip.purpose}</p>}

          {trip.status === "postponed" && (
            <p className="field-warning">Postponed in crisis mode. Plan it again when the trip is needed.</p>
          )}
          {trip.status === "combined" && trip.combinedInto && (
            <p className="field-warning">
              Combined in crisis mode: done along with {formatTripPlaces(trip.combinedInto)} on{" "}
              {formatDay(trip.combinedInto.date)}.
            </p>
          )}
          {trip.combinedTrips?.length > 0 && (
            <p className="chart-note">
              Also on this trip (combined in crisis mode):{" "}
              {trip.combinedTrips.map((other) => formatPlaceName(other.destination)).join(", ")}.
            </p>
          )}
        </div>

        <button type="button" className="modal-close" onClick={onClose} aria-label="Close trip">
          <Icon name="close" size={18} />
        </button>
      </div>

      {NO_MOTORWAY_TYPES.includes(trip.vehicle?.vehicleType) && (
        <p className="field-warning">
          Motorcycles and rickshaws may not use motorways, so these routes avoid them. Follow the road signs.
        </p>
      )}

      {trip.routeError && (
        <div className="form-error">
          Routes could not be calculated: {trip.routeError}
          {canChange && isPlanned && (
            <button type="button" className="secondary-button" onClick={recalculate} disabled={busy}>
              Try again
            </button>
          )}
        </div>
      )}

      {actionError && <div className="form-error">{actionError}</div>}

      <TripMap
        start={trip.start}
        destination={trip.destination}
        routes={trip.routes}
        selectedRoute={trip.selectedRoute}
        onSelectRoute={canChooseRoute ? chooseRoute : undefined}
      />

      {trip.routes.length > 0 && <RouteList trip={trip} onSelectRoute={canChooseRoute ? chooseRoute : undefined} />}

      {canChange && (
        <div className="row-actions trip-actions">
          {isPlanned && (
            <>
              <button type="button" className="edit-button" onClick={() => onEdit(trip)} disabled={busy}>
                <Icon name="edit" size={17} />
                Edit
              </button>

              <button type="button" className="edit-button" onClick={recalculate} disabled={busy}>
                <Icon name="refresh" size={17} />
                Recalculate
              </button>

              <button type="button" className="edit-button" onClick={markCompleted} disabled={busy}>
                <Icon name="check" size={17} />
                Mark completed
              </button>
            </>
          )}

          {isSetAsideInCrisis && (
            <button type="button" className="edit-button" onClick={planAgain} disabled={busy}>
              <Icon name="refresh" size={17} />
              Plan again
            </button>
          )}

          <button type="button" className="delete-button" onClick={() => onDelete(trip)} disabled={busy}>
            <Icon name="trash" size={17} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default TripDetails;
