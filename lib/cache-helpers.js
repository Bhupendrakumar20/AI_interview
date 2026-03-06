// Simple in-memory cache with TTL (Time To Live)
const cache = new Map();

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function getCachedData(key) {
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  // Check if cache has expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

export function setCachedData(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

export function generateCacheKey(prefix, params) {
  // Create a unique key based on prefix and params
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
}

export function clearCache(prefix) {
  // Clear all cache entries with a specific prefix
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
