// Decodes a Google encoded polyline (how the route service sends road lines)
// into [[lat, lng], ...] points for the map.
export function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  // Each number is stored in 5-bit chunks; each point is the change from the previous one.
  const readNumber = () => {
    let result = 0;
    let shift = 0;
    let chunk;
    do {
      chunk = encoded.charCodeAt(index++) - 63;
      result |= (chunk & 0x1f) << shift;
      shift += 5;
    } while (chunk >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += readNumber();
    lng += readNumber();
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
