import { MILEAGE_SOURCE_LABELS } from "../constant";
import { formatDistance, formatDuration, formatLitres, formatRupees } from "../format";

// The trip's routes as a table; it also works when the map can't load.
// `onSelectRoute` is left out for people who may only look.
function RouteList({ trip, onSelectRoute }) {
  const { routes, recommendedRoute, selectedRoute } = trip;
  const hasFuelEstimate = trip.kmPerLitre !== null && trip.kmPerLitre !== undefined;

  return (
    <div className="route-list">
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Distance</th>
              <th>Time</th>
              <th>Fuel</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route, index) => (
              <tr key={route.label} className={index === selectedRoute ? "selected" : ""}>
                <td>
                  <label className="route-choice">
                    {onSelectRoute && (
                      <input
                        type="radio"
                        name="trip-route"
                        checked={index === selectedRoute}
                        onChange={() => onSelectRoute(index)}
                      />
                    )}
                    {route.label}
                    {index === recommendedRoute && <span className="vehicle-badge">Recommended</span>}
                    {route.needsRefuel && <span className="vehicle-badge missing">Refuel on the way</span>}
                  </label>
                </td>
                <td>{formatDistance(route.distanceKm)}</td>
                <td>{formatDuration(route.durationMin)}</td>
                <td>{route.litres === null ? "—" : formatLitres(route.litres)}</td>
                <td>{route.cost === null ? "—" : formatRupees(route.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {routes.length === 1 && <p className="chart-note">Only one route was found.</p>}

      {hasFuelEstimate ? (
        <p className="chart-note">
          Estimate with {trip.kmPerLitre} km/l ({MILEAGE_SOURCE_LABELS[trip.mileageSource]}) and{" "}
          {formatRupees(trip.pricePerLitre)} per litre. Recommended is the route that uses the least fuel
          without taking much longer than the fastest. Traffic, hills and AC are not included.
        </p>
      ) : (
        <p className="chart-note">Electric vehicle: no fuel estimate.</p>
      )}
    </div>
  );
}

export default RouteList;
