import { findPlaceAt, findPlaces } from "../utils/ors.js";
import { checkPlaceSearch, isInPakistan, queryText } from "../utils/validation.js";

// GET /places/search?text=Liberty Market Lahore
export async function searchPlaces(req, res) {
  const text = queryText(req.query.text);
  const error = checkPlaceSearch(text);
  if (error) return res.status(400).json({ success: false, message: error });

  const { places, status, message } = await findPlaces(text);
  if (!places) return res.status(status).json({ success: false, message });
  res.json({ success: true, places });
}

// GET /places/reverse?lat=31.52&lng=74.35: a name for a point picked on the map
// (place is null when nothing named is near).
export async function reversePlace(req, res) {
  const lat = Number(queryText(req.query.lat));
  const lng = Number(queryText(req.query.lng));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInPakistan(lat, lng)) {
    return res.status(400).json({ success: false, message: "Pick a point in Pakistan" });
  }

  const { place, status, message } = await findPlaceAt(lat, lng);
  if (place === undefined) return res.status(status).json({ success: false, message });
  res.json({ success: true, place });
}
