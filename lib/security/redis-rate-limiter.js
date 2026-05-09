/**
 * Redis-Based Distributed Rate Limiting
 * For multi-instance deployments
 * Falls back to in-memory if Redis unavailable
 */

import redis from "redis";

let redisClient = null;

/**
 * Initialize Redis client
 */
export async function initializeRedis() {
  try {
    if (!process.env.REDIS_URL) {
      console.warn(
        "REDIS_URL not set. Using in-memory rate limiting (single instance only)"
      );
      return null;
    }

    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis error:", err);
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected for distributed rate limiting");
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn("Failed to connect to Redis:", error.message);
    return null;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Redis-backed rate limiter
 */
export async function checkRateLimitRedis(
  key,
  limit,
  windowMs,
  redisConn = redisClient
) {
  if (!redisConn) {
    // Fallback to in-memory (not distributed)
    return checkRateLimitMemory(key, limit, windowMs);
  }

  try {
    const current = await redisConn.incr(key);

    if (current === 1) {
      // First request in window, set expiration
      await redisConn.expire(key, Math.ceil(windowMs / 1000));
    }

    if (current > limit) {
      // Rate limit exceeded
      const ttl = await redisConn.ttl(key);
      return {
        allowed: false,
        current,
        limit,
        remaining: Math.max(0, limit - current),
        resetIn: ttl * 1000,
      };
    }

    return {
      allowed: true,
      current,
      limit,
      remaining: limit - current,
    };
  } catch (error) {
    console.error("Redis rate limit error:", error);
    // Fallback to in-memory on Redis error
    return checkRateLimitMemory(key, limit, windowMs);
  }
}

/**
 * In-memory rate limiter (single instance)
 */
const memoryStore = new Map();

function checkRateLimitMemory(key, limit, windowMs) {
  const now = Date.now();
  let bucket = memoryStore.get(key);

  if (!bucket || now > bucket.resetTime) {
    // Create new bucket
    bucket = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  bucket.count++;

  if (bucket.count > limit) {
    const remaining = Math.max(0, now - bucket.resetTime);
    return {
      allowed: false,
      current: bucket.count,
      limit,
      remaining: 0,
      resetIn: Math.max(0, bucket.resetTime - now),
    };
  }

  memoryStore.set(key, bucket);

  return {
    allowed: true,
    current: bucket.count,
    limit,
    remaining: limit - bucket.count,
  };
}

/**
 * Cleanup old entries (for in-memory)
 */
export function cleanupOldBuckets() {
  const now = Date.now();
  for (const [key, bucket] of memoryStore.entries()) {
    if (now > bucket.resetTime) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Get rate limit status
 */
export async function getRateLimitStatus(key, redisConn = redisClient) {
  if (!redisConn) {
    const bucket = memoryStore.get(key);
    if (!bucket) return null;

    return {
      key,
      count: bucket.count,
      resetTime: bucket.resetTime,
      resetIn: Math.max(0, bucket.resetTime - Date.now()),
    };
  }

  try {
    const count = await redisConn.get(key);
    const ttl = await redisConn.ttl(key);

    if (!count) return null;

    return {
      key,
      count: parseInt(count),
      ttl,
      resetIn: ttl > 0 ? ttl * 1000 : 0,
    };
  } catch (error) {
    console.error("Failed to get rate limit status:", error);
    return null;
  }
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(key, redisConn = redisClient) {
  if (!redisConn) {
    memoryStore.delete(key);
    return { success: true };
  }

  try {
    await redisConn.del(key);
    return { success: true };
  } catch (error) {
    console.error("Failed to reset rate limit:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset all rate limits (for user)
 */
export async function resetAllRateLimits(userKeyPrefix, redisConn = redisClient) {
  if (!redisConn) {
    // In-memory: delete all keys matching prefix
    for (const key of memoryStore.keys()) {
      if (key.startsWith(userKeyPrefix)) {
        memoryStore.delete(key);
      }
    }
    return { success: true };
  }

  try {
    // Redis: use SCAN to find and delete keys
    let cursor = "0";
    let deleted = 0;

    do {
      const reply = await redisConn.scan(cursor, {
        MATCH: `${userKeyPrefix}*`,
        COUNT: 100,
      });

      cursor = reply.cursor;
      const keys = reply.keys;

      if (keys.length > 0) {
        deleted += await redisConn.del(keys);
      }
    } while (cursor !== "0");

    return { success: true, deletedCount: deleted };
  } catch (error) {
    console.error("Failed to reset all rate limits:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Redis connection status
 */
export async function getRedisStatus(redisConn = redisClient) {
  if (!redisConn) {
    return {
      connected: false,
      mode: "in-memory",
      warning: "Running in single-instance mode. Use Redis for multi-instance.",
    };
  }

  try {
    const info = await redisConn.info("server");
    return {
      connected: true,
      mode: "redis",
      info,
    };
  } catch (error) {
    return {
      connected: false,
      mode: "redis",
      error: error.message,
    };
  }
}
