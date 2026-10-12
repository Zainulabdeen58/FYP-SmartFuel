// A stand-in for OpenRouteService, for automated tests and offline demos (no key,
// no internet). Run it from backend/:  node dev/fakeOrs.js   (port 5199, or FAKE_ORS_PORT)
// then start the API with ORS_BASE_URL=http://localhost:5199 ORS_API_KEY=test-key.
//   GET /__mode/<mode>  changes how it answers: ok, down, slow, quota, badkey, noroute
//   GET /__stats        requests counted, last Authorization header, recent route requests
import http from "node:http";

const PORT = Number(process.env.FAKE_ORS_PORT) || 5199;
const MODES = ["ok", "down", "slow", "quota", "badkey", "noroute"];
const SLOW_ANSWER_MS = 12000;

const PLACES = [
  { label: "Liberty Market, Lahore, Punjab, Pakistan", lat: 31.5104, lng: 74.3436 },
  { label: "Lahore, Punjab, Pakistan", lat: 31.5204, lng: 74.3587 },
  { label: "Faisal Mosque, Islamabad, Pakistan", lat: 33.7295, lng: 73.0372 },
  { label: "Islamabad, Pakistan", lat: 33.6844, lng: 73.0479 },
  { label: "Saddar, Rawalpindi, Punjab, Pakistan", lat: 33.5973, lng: 73.0479 },
  { label: "Saddar, Karachi, Sindh, Pakistan", lat: 24.8556, lng: 67.0236 },
  { label: "Clifton, Karachi, Sindh, Pakistan", lat: 24.8138, lng: 67.03 },
  { label: "Faisalabad, Punjab, Pakistan", lat: 31.4504, lng: 73.135 },
];

// How a request turns the straight-line distance into a road route. "fastest" is
// like a motorway (longer, quicker); avoiding motorways is like GT Road.
const ROUTE_SHAPES = {
  fastest: { roadFactor: 1.3, speedKmh: 90, bend: 0.12 },
  shortest: { roadFactor: 1.05, speedKmh: 55, bend: 0.02 },
  avoidMotorways: { roadFactor: 1.08, speedKmh: 52, bend: -0.08 },
};

let mode = "ok";
const stats = { requests: 0, lastAuthorization: null, recentRoutes: [] };

function distanceKm([lat1, lng1], [lat2, lng2]) {
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Google encoded polyline, the format ORS uses for route lines.
function encodeNumber(value) {
  let number = value < 0 ? ~(value << 1) : value << 1;
  let text = "";
  while (number >= 0x20) {
    text += String.fromCharCode((0x20 | (number & 0x1f)) + 63);
    number >>= 5;
  }
  return text + String.fromCharCode(number + 63);
}

function encodePolyline(points) {
  let previousLat = 0;
  let previousLng = 0;
  let text = "";
  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    text += encodeNumber(latE5 - previousLat) + encodeNumber(lngE5 - previousLng);
    previousLat = latE5;
    previousLng = lngE5;
  }
  return text;
}

// A gently curved line from start to end, so the routes look different on the map.
function curvedLine([startLat, startLng], [endLat, endLng], bend) {
  const steps = 20;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const offset = Math.sin(Math.PI * t) * bend;
    return [
      startLat + (endLat - startLat) * t - (endLng - startLng) * offset,
      startLng + (endLng - startLng) * t + (endLat - startLat) * offset,
    ];
  });
}

function routeAnswer(body) {
  const [[startLng, startLat], [endLng, endLat]] = body.coordinates;
  const avoidsMotorways = body.options?.avoid_features?.includes("highways");
  const shapeName = avoidsMotorways && body.preference !== "shortest" ? "avoidMotorways" : body.preference || "fastest";
  const shape = ROUTE_SHAPES[shapeName];
  const km = distanceKm([startLat, startLng], [endLat, endLng]) * shape.roadFactor;
  return {
    routes: [
      {
        summary: { distance: Math.round(km * 1000), duration: Math.round((km / shape.speedKmh) * 3600) },
        geometry: encodePolyline(curvedLine([startLat, startLng], [endLat, endLng], shape.bend)),
      },
    ],
  };
}

const toFeature = (place) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [place.lng, place.lat] },
  properties: { label: place.label, name: place.label.split(",")[0] },
});

function searchAnswer(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = mode === "noroute" ? [] : PLACES.filter((place) => words.every((word) => place.label.toLowerCase().includes(word)));
  return { type: "FeatureCollection", features: matches.slice(0, 5).map(toFeature) };
}

function reverseAnswer(lat, lng) {
  const nearest = PLACES.map((place) => ({ place, km: distanceKm([lat, lng], [place.lat, place.lng]) }))
    .sort((a, b) => a.km - b.km)[0];
  return { type: "FeatureCollection", features: nearest.km <= 20 ? [toFeature(nearest.place)] : [] };
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let text = "";
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/__mode/")) {
    const nextMode = url.pathname.slice("/__mode/".length);
    if (!MODES.includes(nextMode)) return send(res, 400, { error: `Modes: ${MODES.join(", ")}` });
    mode = nextMode;
    return send(res, 200, { mode });
  }
  if (url.pathname === "/__stats") return send(res, 200, { mode, ...stats });

  stats.requests += 1;
  stats.lastAuthorization = req.headers.authorization ?? null;
  if (!req.headers.authorization) return send(res, 401, { error: "Missing API key" });
  if (mode === "down") return send(res, 503, { error: "Service unavailable" });
  if (mode === "badkey") return send(res, 403, { error: "Access to this API has been disallowed" });
  if (mode === "quota") return send(res, 429, { error: "Rate limit exceeded" });
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_ANSWER_MS));

  if (req.method === "GET" && url.pathname === "/geocode/search") {
    return send(res, 200, searchAnswer(url.searchParams.get("text") || ""));
  }
  if (req.method === "GET" && url.pathname === "/geocode/reverse") {
    return send(res, 200, reverseAnswer(Number(url.searchParams.get("point.lat")), Number(url.searchParams.get("point.lon"))));
  }
  if (req.method === "POST" && url.pathname.startsWith("/v2/directions/")) {
    const body = await readBody(req);
    const profile = url.pathname.slice("/v2/directions/".length);
    stats.recentRoutes = [
      { profile, preference: body.preference, avoidFeatures: body.options?.avoid_features ?? [] },
      ...stats.recentRoutes,
    ].slice(0, 10);
    if (mode === "noroute") return send(res, 404, { error: { code: 2009, message: "Route could not be found" } });
    return send(res, 200, routeAnswer(body));
  }
  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => console.log(`Fake route service on http://localhost:${PORT} (mode: ${mode})`));
