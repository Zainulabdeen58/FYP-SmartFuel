// The only file that talks to OpenRouteService (ORS): place search and road routes.
// The API key stays on the server (ORS_API_KEY). Every function returns its result
// or { status, message } for the client; ORS problems never become a 401, because
// the frontend signs the user out on any 401.
// Places are { lat, lng } everywhere else; ORS wants [lng, lat], converted only here.
import { createCache } from "./ttlCache.js";
import { roundToTwoDecimals } from "./numbers.js";

const REQUEST_TIMEOUT_MS = 10000;
const SEARCH_RESULTS = 5;
// ORS looks for a road within this many metres of each point (its default is 350).
const ROAD_SEARCH_RADIUS_M = 5000;
const PLACE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const ROUTE_CACHE_MS = 60 * 60 * 1000;

const cache = createCache(500);

// Tests set ORS_BASE_URL to a fake server; in NODE_ENV=test without it, nothing is called.
function baseUrl() {
  if (process.env.ORS_BASE_URL) return process.env.ORS_BASE_URL;
  return process.env.NODE_ENV === "test" ? "" : "https://api.openrouteservice.org";
}

export const isRouteServiceSetUp = () => Boolean(process.env.ORS_API_KEY && baseUrl());

const NOT_SET_UP = {
  status: 503,
  message: "The route service is not set up. You can still pick places on the map.",
};

function orsError(status, data) {
  const code = data?.error?.code;
  if (status === 401 || status === 403) {
    console.error("OpenRouteService rejected the API key. Check ORS_API_KEY in backend/.env.");
    return NOT_SET_UP;
  }
  if (status === 429) {
    return { status: 429, message: "The route service limit is used up. Please try again later." };
  }
  // 2004: request too large, 2009: no route found, 2010: no road near a point.
  if (code === 2004) return { status: 400, message: "This trip is too long for the route service." };
  if (code === 2009 || code === 2010 || status === 404) {
    return { status: 422, message: "No road route was found between these places. Pick points closer to a road." };
  }
  console.error(`OpenRouteService error: HTTP ${status}${code ? `, code ${code}` : ""}`);
  return { status: 503, message: "The route service is not working right now. Please try again later." };
}

// GET when there is no body, POST with a JSON body otherwise.
async function orsRequest(path, { query, body } = {}) {
  if (!isRouteServiceSetUp()) return NOT_SET_UP;

  const url = new URL(path, baseUrl());
  for (const [name, value] of Object.entries(query || {})) url.searchParams.set(name, value);

  let response;
  try {
    response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: process.env.ORS_API_KEY,
        Accept: "application/json, application/geo+json",
        ...(body && { "Content-Type": "application/json" }),
      },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      status: 503,
      message:
        error.name === "TimeoutError"
          ? "The route service took too long. Please try again."
          : "The route service could not be reached. Check the internet connection and try again.",
    };
  }

  const data = await response.json().catch(() => null);
  if (response.ok && data) return { data };
  return orsError(response.status, data);
}

// Remembers successful answers only, so a failure is retried next time.
async function cached(key, lifetimeMs, load) {
  const saved = cache.get(key);
  if (saved) return saved;
  const result = await load();
  if (!result.status) cache.set(key, result, lifetimeMs);
  return result;
}

// ORS place → { name, lat, lng }. The label ("Liberty Market, Lahore, Punjab, Pakistan")
// tells same-named places apart; the country is left out.
function toPlace(feature) {
  const [lng, lat] = feature.geometry.coordinates;
  return { name: feature.properties.label.replace(/, Pakistan$/, ""), lat, lng };
}

// Places in Pakistan matching the text, best first.
export function findPlaces(text) {
  return cached(`search:${text.toLowerCase()}`, PLACE_CACHE_MS, async () => {
    const { data, status, message } = await orsRequest("/geocode/search", {
      query: { text, "boundary.country": "PK", size: SEARCH_RESULTS },
    });
    if (!data) return { status, message };
    return { places: (data.features || []).map(toPlace) };
  });
}

// The nearest named place to a point on the map, or null.
export function findPlaceAt(lat, lng) {
  const point = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  return cached(`reverse:${point}`, PLACE_CACHE_MS, async () => {
    const { data, status, message } = await orsRequest("/geocode/reverse", {
      query: { "point.lat": lat, "point.lon": lng, "boundary.country": "PK", size: 1 },
    });
    if (!data) return { status, message };
    const feature = data.features?.[0];
    return { place: feature ? toPlace(feature) : null };
  });
}

// ORS gives alternative routes only for trips under 100 km, so every trip asks for
// separate variants and drops duplicates. Motorways are closed to motorcycles and
// rickshaws in Pakistan, so those always avoid them (ORS has no motorcycle profile).
function routeVariants(vehicleType) {
  if (vehicleType === "Motorcycle" || vehicleType === "Rickshaw") {
    return [
      { label: "Fastest", profile: "driving-car", preference: "fastest", avoidMotorways: true },
      { label: "Shortest", profile: "driving-car", preference: "shortest", avoidMotorways: true },
    ];
  }
  const profile = vehicleType === "Bus/Truck" ? "driving-hgv" : "driving-car";
  return [
    { label: "Fastest", profile, preference: "fastest" },
    { label: "Shortest", profile, preference: "shortest" },
    { label: "Avoids motorways", profile, preference: "fastest", avoidMotorways: true },
  ];
}

async function requestRoute(variant, start, destination) {
  const { data, status, message } = await orsRequest(`/v2/directions/${variant.profile}`, {
    body: {
      coordinates: [
        [start.lng, start.lat],
        [destination.lng, destination.lat],
      ],
      preference: variant.preference,
      radiuses: [ROAD_SEARCH_RADIUS_M, ROAD_SEARCH_RADIUS_M],
      instructions: false,
      geometry_simplify: true,
      // ORS "highways" are motorways (M-2 etc.); it avoids them where it can.
      ...(variant.avoidMotorways && { options: { avoid_features: ["highways"] } }),
    },
  });
  if (!data) return { status, message };

  const route = data.routes?.[0];
  if (!route?.geometry) {
    return { status: 503, message: "The route service sent an unexpected answer. Please try again later." };
  }
  return {
    route: {
      label: variant.label,
      distanceKm: roundToTwoDecimals(route.summary.distance / 1000),
      durationMin: Math.round(route.summary.duration / 60),
      geometry: route.geometry,
    },
  };
}

// Within 1% of the distance and 3% of the time: the same road.
const isSameRoute = (a, b) =>
  Math.abs(a.distanceKm - b.distanceKm) <= a.distanceKm * 0.01 &&
  Math.abs(a.durationMin - b.durationMin) <= Math.max(1, a.durationMin * 0.03);

// Different road routes for the trip: { routes } or the first error.
export function findRoutes({ start, destination, vehicleType }) {
  const variants = routeVariants(vehicleType);
  const key = `routes:${JSON.stringify(variants)}:${start.lat},${start.lng}:${destination.lat},${destination.lng}`;

  return cached(key, ROUTE_CACHE_MS, async () => {
    const results = await Promise.all(variants.map((variant) => requestRoute(variant, start, destination)));
    const routes = [];
    for (const { route } of results) {
      if (route && !routes.some((kept) => isSameRoute(kept, route))) routes.push(route);
    }
    if (routes.length === 0) return results[0];
    return { routes };
  });
}
