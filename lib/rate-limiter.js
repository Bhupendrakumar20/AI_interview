/**
 * Rate Limiter & Request Queue for Gemini API
 * 
 * Model-Aware Rate Limiting for Multi-User Deployments:
 * Gemini 2.5 Flash:     10 RPM, 250k TPM → 24s per request (1 user per 4s)
 * Gemini 1.5 Flash:     15 RPM, 1M TPM  → 4s per request (25 users @ 0.6 RPM each)
 * Gemini 2.5 Flash-Lite: 15 RPM, 250k TPM → 4s per request (25 users @ 0.6 RPM each)
 * Gemini 2.5 Pro:       5 RPM, 250k TPM → 12s per request (1 user per 2s)
 * 
 * Features:
 * 1. Per-user rate limiting with fair distribution
 * 2. Global request queuing (prevents 429 errors)
 * 3. Exponential backoff on failures
 * 4. Auto-cleanup of inactive users
 * 5. Model-aware configuration
 */

// Model specifications (from Google AI Studio)
const MODEL_SPECS = {
  "gemini-2-5-flash": {
    name: "Gemini 2.5 Flash",
    rpm: 10,
    rpd: 250,
    tpm: 250000,
  },
  "gemini-1-5-flash": {
    name: "Gemini 1.5 Flash",
    rpm: 15,
    rpd: 1500,
    tpm: 1000000,
  },
  "gemini-2-5-flash-lite": {
    name: "Gemini 2.5 Flash-Lite",
    rpm: 15,
    rpd: 1000,
    tpm: 250000,
  },
  "gemini-2-5-pro": {
    name: "Gemini 2.5 Pro",
    rpm: 5,
    rpd: 100,
    tpm: 250000,
  },
  "gemini-2-0-flash": {
    name: "Gemini 2.0 Flash (Estimated)",
    rpm: 15, // Estimated based on 1.5 Flash
    rpd: 1000,
    tpm: 250000,
  },
};

// Current model being used
const CURRENT_MODEL = process.env.GEMINI_MODEL || "gemini-2-0-flash";

/**
 * Get model specs - returns the specification for current or specified model
 */
function getModelSpec(modelName = CURRENT_MODEL) {
  // Normalize model name
  const normalized = Object.keys(MODEL_SPECS).find(
    key => modelName.includes(key) || key.includes(modelName)
  );
  
  const spec = MODEL_SPECS[normalized] || MODEL_SPECS["gemini-1-5-flash"];
  console.log(`📋 [ModelSpec] Using: ${spec.name} (${spec.rpm} RPM, ${spec.tpm.toLocaleString()} TPM)`);
  return spec;
}

class RateLimiter {
  constructor(requestsPerMinute = 15) {
    this.requestsPerMinute = requestsPerMinute;
    this.minIntervalMs = (60 * 1000) / requestsPerMinute;
    this.lastRequestTime = 0;
    this.queue = [];
    this.processing = false;
  }

  /**
   * Wait for rate limit if needed
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLastRequest;
      console.log(`⏳ [RateLimiter] Waiting ${waitTime.toFixed(0)}ms (${(waitTime/1000).toFixed(1)}s) to respect rate limit...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute function with rate limiting and exponential backoff
   */
  async execute(fn, fnName = "API call") {
    await this.waitForRateLimit();

    let lastError;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 [RateLimiter] Executing ${fnName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        const result = await fn();
        console.log(`✅ [RateLimiter] Success on attempt ${attempt + 1}`);
        return result;
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || error.toString();

        // Check if it's a 429 (rate limit) error
        if (errorMsg.includes("429") || errorMsg.includes("TooManyRequests")) {
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(
              `⚠️ [RateLimiter] Rate limited (429). Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            this.lastRequestTime = Date.now();
          } else {
            console.error(`❌ [RateLimiter] Failed after ${maxRetries} retries due to rate limit`);
            throw new Error(
              `API rate limit exceeded after ${maxRetries} retries. Your model's request quota has been reached.`
            );
          }
        } else if (errorMsg.includes("quota") || errorMsg.includes("403")) {
          console.error(`❌ [RateLimiter] Quota exceeded or permission denied: ${errorMsg}`);
          throw new Error(
            "API quota exceeded or permission denied. Upgrade your Google AI Studio plan at https://ai.google.dev/pricing"
          );
        } else {
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 500;
            console.warn(`⚠️ [RateLimiter] Error: ${errorMsg}. Retrying in ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          } else {
            console.error(`❌ [RateLimiter] Failed after ${maxRetries} retries: ${errorMsg}`);
            throw error;
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * Add request to queue
   */
  async queueRequest(fn, fnName = "API call") {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, fnName, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queue sequentially
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, fnName, resolve, reject } = this.queue.shift();

      try {
        const result = await this.execute(fn, fnName);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }
}

/**
 * Per-User Rate Limiter Manager
 * Distributes global rate limits fairly among multiple users
 * For 25 users with 15 RPM model: each user gets 0.6 RPM (1 request per 100 seconds)
 */
class PerUserRateLimiterManager {
  constructor(modelName = CURRENT_MODEL, maxConcurrentUsers = 25) {
    this.modelSpec = getModelSpec(modelName);
    this.maxConcurrentUsers = maxConcurrentUsers;
    
    // Calculate per-user rate limit
    this.globalRequestsPerMinute = this.modelSpec.rpm;
    this.perUserRequestsPerMinute = this.modelSpec.rpm / maxConcurrentUsers;
    
    this.limiters = new Map(); // Map<userId, RateLimiter>
    this.cleanupInterval = null;
    this.startCleanup();
    
    console.log(`📊 [PerUserRateLimiter] Initialized:`);
    console.log(`   Model: ${this.modelSpec.name}`);
    console.log(`   Global: ${this.globalRequestsPerMinute} RPM`);
    console.log(`   Max Concurrent Users: ${maxConcurrentUsers}`);
    console.log(`   Per User: ${this.perUserRequestsPerMinute.toFixed(2)} RPM (1 request per ${(60000 / this.globalRequestsPerMinute * maxConcurrentUsers / 1000).toFixed(1)}s)`);
  }

  /**
   * Get or create rate limiter for a specific user
   */
  getLimiterForUser(userId) {
    if (!userId) {
      userId = "anonymous";
    }

    if (!this.limiters.has(userId)) {
      const limiter = new RateLimiter(this.globalRequestsPerMinute);
      this.limiters.set(userId, limiter);
      console.log(`👤 [PerUserRateLimiter] Created limiter for user: ${userId}`);
    }

    return this.limiters.get(userId);
  }

  /**
   * Execute function with per-user rate limiting
   * All users share the same global queue for fair distribution
   */
  async execute(fn, fnName = "API call", userId = "anonymous") {
    const limiter = this.getLimiterForUser(userId);
    console.log(`👤 [PerUserRateLimiter] User: ${userId}, Function: ${fnName}`);
    return limiter.queueRequest(fn, fnName);
  }

  /**
   * Get current stats for a user
   */
  getStats(userId) {
    const limiter = this.limiters.get(userId);
    if (!limiter) {
      return { userId, status: "No active limiter" };
    }

    const now = Date.now();
    const timeSinceLastRequest = now - limiter.lastRequestTime;

    return {
      userId,
      model: this.modelSpec.name,
      globalRequestsPerMinute: this.globalRequestsPerMinute,
      perUserRequestsPerMinute: this.perUserRequestsPerMinute.toFixed(2),
      minIntervalMs: limiter.minIntervalMs,
      lastRequestTime: new Date(limiter.lastRequestTime).toISOString(),
      timeSinceLastRequest: timeSinceLastRequest,
      queueLength: limiter.queue.length,
      isProcessing: limiter.processing,
    };
  }

  /**
   * Get stats for all active users
   */
  getAllStats() {
    const stats = {
      model: this.modelSpec.name,
      globalRequestsPerMinute: this.globalRequestsPerMinute,
      perUserRequestsPerMinute: this.perUserRequestsPerMinute.toFixed(2),
      maxConcurrentUsers: this.maxConcurrentUsers,
      activeUsers: this.limiters.size,
      users: [],
    };

    for (const [userId, limiter] of this.limiters.entries()) {
      const now = Date.now();
      const timeSinceLastRequest = now - limiter.lastRequestTime;

      stats.users.push({
        userId,
        minIntervalMs: limiter.minIntervalMs,
        lastRequestTime: new Date(limiter.lastRequestTime).toISOString(),
        timeSinceLastRequest: timeSinceLastRequest,
        queueLength: limiter.queue.length,
        isProcessing: limiter.processing,
      });
    }

    return stats;
  }

  /**
   * Cleanup inactive users (not used for 5 minutes)
   */
  startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [userId, limiter] of this.limiters.entries()) {
        const timeSinceLastRequest = now - limiter.lastRequestTime;

        if (timeSinceLastRequest > inactivityThreshold && limiter.queue.length === 0 && !limiter.processing) {
          this.limiters.delete(userId);
          console.log(`🧹 [PerUserRateLimiter] Cleaned up inactive user: ${userId}`);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global per-user rate limiter manager instance
let globalPerUserLimiter = null;

/**
 * Get or create global per-user rate limiter manager
 */
export function getPerUserRateLimiter(modelName = CURRENT_MODEL, maxUsers = 25) {
  if (!globalPerUserLimiter) {
    globalPerUserLimiter = new PerUserRateLimiterManager(modelName, maxUsers);
  }
  return globalPerUserLimiter;
}

/**
 * Execute with per-user rate limiting and queuing
 * All users share global limits fairly
 * @param {Function} fn - Function to execute
 * @param {string} fnName - Function name for logging
 * @param {string} userId - User ID for tracking (optional)
 */
export async function withRateLimit(fn, fnName = "API call", userId = "anonymous") {
  const limiter = getPerUserRateLimiter();
  return limiter.execute(fn, fnName, userId);
}

/**
 * Legacy global rate limiter (for backward compatibility)
 */
export function getRateLimiter() {
  const manager = getPerUserRateLimiter();
  return manager.getLimiterForUser("global");
}

export { PerUserRateLimiterManager, RateLimiter, MODEL_SPECS, getModelSpec };
export default RateLimiter;
