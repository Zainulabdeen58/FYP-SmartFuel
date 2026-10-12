// A small in-memory cache whose entries expire, so repeated place searches and
// routes don't use up the route service's free daily quota. It is emptied on restart.
export function createCache(maxEntries) {
  const entries = new Map();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt < Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key, value, lifetimeMs) {
      // Full: drop the oldest entry (a Map keeps insertion order).
      if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
      entries.set(key, { value, expiresAt: Date.now() + lifetimeMs });
    },
  };
}
