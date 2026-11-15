// Tiny in-memory TTL cache. Per server instance only: on serverless it resets on cold starts.
// For a shared cache use Redis/Upstash or Next's fetch cache ({ next: { revalidate } }).
const store = new Map();
const MAX_ENTRIES = 200;

export function getCached(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function setCached(key, value, ttlMs = 10 * 60 * 1000) {
  if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
  store.set(key, { value, expires: Date.now() + ttlMs });
}
