// Rate Limiting for Next.js API Routes
// Protects critical endpoints from brute force attacks

const store = new Map();

/**
 * Next.js compatible rate limiter
 * Tracks requests by key (IP, user, combination, etc.)
 * @param {string} key - Identifier to track (IP, userId, etc.)
 * @param {number} max - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if request is allowed, false if rate limited
 */
export function checkRateLimit(key, max = 100, windowMs = 60000) {
  const now = Date.now();
  let record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= max) {
    return false; // Rate limited
  }

  record.count++;
  return true;
}

/**
 * Get remaining requests for a key
 */
export function getRemainingRequests(key, max = 100) {
  const record = store.get(key);
  if (!record) return max;
  return Math.max(0, max - record.count);
}

/**
 * Get reset time for a key
 */
export function getResetTime(key) {
  const record = store.get(key);
  if (!record) return null;
  return record.resetTime;
}

/**
 * Session join rate limit checker
 * 20 attempts per 5 minutes per IP
 */
export function checkSessionJoinRateLimit(ip, sessionCode) {
  const key = `session-join:${ip}:${sessionCode}`;
  const max = 20;
  const windowMs = 5 * 60 * 1000; // 5 minutes
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Auth rate limit checker
 * 5 attempts per 15 minutes per IP
 */
export function checkAuthRateLimit(ip) {
  const key = `auth:${ip}`;
  const max = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Room creation rate limit checker
 * 10 rooms per hour per user
 */
export function checkRoomCreationRateLimit(userId) {
  const key = `room-create:${userId}`;
  const max = 10;
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Gemini API rate limit checker
 * 500 requests per hour per user
 */
export function checkGeminiRateLimit(userId) {
  const key = `gemini:${userId}`;
  const max = 500;
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * General API rate limit checker
 * 100 requests per 15 minutes per IP
 */
export function checkApiRateLimit(ip) {
  const key = `api:${ip}`;
  const max = 100;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Cleanup old records (call periodically via cron job)
 */
export function cleanupOldRecords() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}
