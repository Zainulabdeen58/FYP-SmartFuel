import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_START_VIEW, PAKISTAN_BOUNDS } from "../constant";
import { decodePolyline } from "../polyline";

const { minLat, maxLat, minLng, maxLng } = PAKISTAN_BOUNDS;
const MAP_LIMITS = [
  [minLat, minLng],
  [maxLat, maxLng],
];

// OpenStreetMap and the route service must always be credited on the map.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | ' +
  'Routes: <a href="https://openrouteservice.org/">openrouteservice.org</a>';

// Zooms to the trip's places and routes when they move (not when a place is renamed).
function FitToTrip({ start, destination, routeLines }) {
  const map = useMap();
  const startPoint = start && `${start.lat},${start.lng}`;
  const destinationPoint = destination && `${destination.lat},${destination.lng}`;

  // No animation: a map closed mid-animation (e.g. the form after saving) throws an error.
  useEffect(() => {
    const points = [...[start, destination].filter(Boolean).map((place) => [place.lat, place.lng]), ...routeLines.flat()];
    if (points.length === 1) map.setView(points[0], 12, { animate: false });
    if (points.length > 1) map.fitBounds(points, { padding: [30, 30], animate: false });
  }, [map, startPoint, destinationPoint, routeLines]);

  return null;
}

// A click picks a point (in the trip form). The mouse wheel zooms only after the
// first click, so scrolling the page doesn't zoom the map by accident.
function MapClicks({ onPickPoint }) {
  const map = useMapEvents({
    click(event) {
      map.scrollWheelZoom.enable();
      onPickPoint?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

// The trip on an OpenStreetMap map: A and B pins and the route lines. The selected
// route is drawn solid on top; clicking another line selects it (`onSelectRoute`).
function TripMap({ start = null, destination = null, routes = [], selectedRoute = null, onSelectRoute, onPickPoint }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const routeLines = useMemo(() => routes.map((route) => decodePolyline(route.geometry || "")), [routes]);
  // Selected route last, so it lies on top of the others.
  const drawOrder = routes.map((_, index) => index).sort((a, b) => (a === selectedRoute) - (b === selectedRoute));

  return (
    <div className="trip-map">
      <MapContainer
        center={MAP_START_VIEW.center}
        zoom={MAP_START_VIEW.zoom}
        minZoom={5}
        maxBounds={MAP_LIMITS}
        maxBoundsViscosity={1}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={ATTRIBUTION}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />

        {drawOrder.map((index) => {
          const isSelected = index === selectedRoute;
          return (
            <Polyline
              // A new key when selection changes, because Leaflet sets a line's class only once.
              key={`${index}-${isSelected}`}
              positions={routeLines[index]}
              pathOptions={{ className: isSelected ? "route-line selected" : "route-line", weight: isSelected ? 6 : 4 }}
              eventHandlers={onSelectRoute ? { click: () => onSelectRoute(index) } : {}}
            >
              <Tooltip sticky>{routes[index].label}</Tooltip>
            </Polyline>
          );
        })}

        {start && (
          <CircleMarker center={[start.lat, start.lng]} radius={8} pathOptions={{ className: "trip-pin start" }}>
            <Tooltip>Start: {start.name}</Tooltip>
          </CircleMarker>
        )}
        {destination && (
          <CircleMarker center={[destination.lat, destination.lng]} radius={8} pathOptions={{ className: "trip-pin destination" }}>
            <Tooltip>Destination: {destination.name}</Tooltip>
          </CircleMarker>
        )}

        <FitToTrip start={start} destination={destination} routeLines={routeLines} />
        <MapClicks onPickPoint={onPickPoint} />
      </MapContainer>

      {tilesFailed && <p className="map-note">The map could not load. The route details are below.</p>}
    </div>
  );
}

export default TripMap;
