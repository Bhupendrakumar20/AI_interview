// Rate Limiting for Next.js API Routes
// Protects critical endpoints from brute force attacks
// Supports Redis for multi-instance deployments

import { checkRateLimitRedis, initializeRedis, getRedisStatus } from "./redis-rate-limiter.js";

const store = new Map();
let redisClient = null;

/**
 * Initialize Redis connection if available
 */
export async function initRateLimiter() {
  try {
    redisClient = await initializeRedis();
  } catch (error) {
    console.warn("Redis initialization failed, using in-memory rate limiting");
  }
}

/**
 * Next.js compatible rate limiter
 * Uses Redis if available, falls back to in-memory
 * Tracks requests by key (IP, user, combination, etc.)
 * @param {string} key - Identifier to track (IP, userId, etc.)
 * @param {number} max - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} {allowed: boolean, remaining: number}
 */
export async function checkRateLimit(key, max = 100, windowMs = 60000) {
  // Try Redis first
  if (redisClient) {
    try {
      return await checkRateLimitRedis(key, max, windowMs, redisClient);
    } catch (error) {
      console.error("Redis rate limit check failed:", error);
      // Fall back to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  let record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      current: 1,
      limit: max,
      remaining: max - 1,
    };
  }

  if (record.count >= max) {
    return {
      allowed: false,
      current: record.count,
      limit: max,
      remaining: 0,
      resetIn: Math.max(0, record.resetTime - now),
    };
  }

  record.count++;
  return {
    allowed: true,
    current: record.count,
    limit: max,
    remaining: max - record.count,
  };
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
export async function checkSessionJoinRateLimit(ip, sessionCode) {
  const key = `session-join:${ip}:${sessionCode}`;
  const max = 20;
  const windowMs = 5 * 60 * 1000; // 5 minutes
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Auth rate limit checker
 * 5 attempts per 15 minutes per IP
 */
export async function checkAuthRateLimit(ip) {
  const key = `auth:${ip}`;
  const max = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Room creation rate limit checker
 * 10 rooms per hour per user
 */
export async function checkRoomCreationRateLimit(userId) {
  const key = `room-create:${userId}`;
  const max = 10;
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Gemini API rate limit checker
 * 500 requests per hour per user
 */
export async function checkGeminiRateLimit(userId) {
  const key = `gemini:${userId}`;
  const max = 500;
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * General API rate limit checker
 * 100 requests per 15 minutes per IP
 */
export async function checkApiRateLimit(ip) {
  const key = `api:${ip}`;
  const max = 100;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  return checkRateLimit(key, max, windowMs);
}

/**
 * Get Redis status (for monitoring)
 */
export async function getRateLimiterStatus() {
  if (!redisClient) {
    return {
      mode: "in-memory",
      active: true,
      warning: "Single instance mode. Production deployments should use Redis.",
      storeSize: store.size,
    };
  }

  return getRedisStatus(redisClient);
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
