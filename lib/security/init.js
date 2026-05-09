/**
 * Security Module Initialization
 * Initialize all security modules on app startup
 * Call this once from middleware.js or app initialization
 */

import { initRateLimiter } from "./rate-limiters.js";

/**
 * Initialize all security modules
 * Should be called once on app startup (not on every request)
 */
export async function initializeSecurityModules() {
  try {
    // Initialize rate limiters with Redis if available
    await initRateLimiter();
    console.log("✅ Security modules initialized");
  } catch (error) {
    console.error("⚠️ Failed to initialize security modules:", error.message);
    console.error("   Continuing with fallback security measures...");
    // Don't throw - allow app to continue with in-memory fallbacks
  }
}

/**
 * Get security module status for monitoring
 */
export async function getSecurityStatus() {
  try {
    const { getRateLimiterStatus } = await import("./rate-limiters.js");
    const rateLimitStatus = await getRateLimiterStatus();

    return {
      status: "healthy",
      modules: {
        rateLimit: rateLimitStatus,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "degraded",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Cleanup security modules (for graceful shutdown)
 */
export async function cleanupSecurityModules() {
  try {
    const { closeRedis } = await import("./redis-rate-limiter.js");
    await closeRedis();
    console.log("✅ Security modules cleaned up");
  } catch (error) {
    console.error("⚠️ Error during security module cleanup:", error.message);
  }
}
