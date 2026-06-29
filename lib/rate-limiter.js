/**
 * Rate Limiter & Request Queue for Gemini / Groq API
 * 
 * Model-Aware Rate Limiting for Multi-User Deployments:
 * Gemini 2.5 Flash:     10 RPM, 250k TPM → 24s per request (1 user per 4s)
 * Gemini 1.5 Flash:     15 RPM, 1M TPM  → 4s per request (25 users @ 0.6 RPM each)
 * Gemini 2.5 Flash-Lite: 15 RPM, 250k TPM → 4s per request (25 users @ 0.6 RPM each)
 * Gemini 2.5 Pro:       5 RPM, 250k TPM → 12s per request (1 user per 2s)
 * Llama 3.3 70B (Groq):  30 RPM, 1,000 RPD, 12,000 TPM (Token-limited)
 */

// Model specifications
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
    rpm: 15,
    rpd: 1000,
    tpm: 250000,
  },
  "llama-3.3-70b-versatile": {
    name: "Llama 3.3 70B (Groq)",
    rpm: 30,
    rpd: 1000,
    tpm: 12000,
  },
};

// Current model being used
const CURRENT_MODEL = process.env.GROQ_API_KEY 
  ? "llama-3.3-70b-versatile" 
  : (process.env.GEMINI_MODEL || "gemini-2.0-flash");

/**
 * Get model specs - returns the specification for current or specified model
 */
function getModelSpec(modelName = CURRENT_MODEL) {
  // Normalize model name
  const normalized = Object.keys(MODEL_SPECS).find(
    key => modelName.includes(key) || key.includes(modelName) || modelName.includes(key.replace(/-/g, ""))
  );
  
  const spec = MODEL_SPECS[normalized] || (process.env.GROQ_API_KEY ? MODEL_SPECS["llama-3.3-70b-versatile"] : MODEL_SPECS["gemini-1-5-flash"]);
  console.log(`📋 [ModelSpec] Using: ${spec.name} (${spec.rpm} RPM, ${spec.tpm.toLocaleString()} TPM)`);
  return spec;
}

class RateLimiter {
  constructor(requestsPerMinute = 15, tokensPerMinute = 250000) {
    this.requestsPerMinute = requestsPerMinute;
    this.tokensPerMinute = tokensPerMinute;
    this.minIntervalMs = (60 * 1000) / requestsPerMinute;
    this.lastRequestTime = 0;
    this.queue = [];
    this.processing = false;
    this.requestHistory = []; // Array of { time: number, tokens: number }
  }

  /**
   * Helper to estimate token usage for a prompt
   */
  estimateTokens(promptText) {
    if (!promptText) return 1500; // Safe default (roughly 6000 chars)
    const chars = typeof promptText === 'string' ? promptText.length : JSON.stringify(promptText).length;
    const inputTokens = Math.ceil(chars / 4);
    // Add 1000 tokens for the response buffer
    return inputTokens + 1000;
  }

  /**
   * Wait for rate limits (both RPM and TPM) if needed
   */
  async waitForRateLimit(estimatedTokens = 1500) {
    const now = Date.now();
    
    // 1. Requests Per Minute (RPM) interval check
    const timeSinceLastRequest = now - this.lastRequestTime;
    let rpmWaitTime = 0;
    if (timeSinceLastRequest < this.minIntervalMs) {
      rpmWaitTime = this.minIntervalMs - timeSinceLastRequest;
    }

    // 2. Tokens Per Minute (TPM) sliding window check
    const windowStart = now - 60000;
    this.requestHistory = this.requestHistory.filter(req => req.time > windowStart);
    
    const currentTokensInWindow = this.requestHistory.reduce((sum, req) => sum + req.tokens, 0);
    
    let tpmWaitTime = 0;
    if (currentTokensInWindow + estimatedTokens > this.tokensPerMinute) {
      console.warn(`⚠️ [RateLimiter] TPM Limit warning. Window tokens: ${currentTokensInWindow}/${this.tokensPerMinute}. Current request: ${estimatedTokens} tokens.`);
      
      // Calculate delay until oldest request in window slides out
      const sortedHistory = [...this.requestHistory].sort((a, b) => a.time - b.time);
      let releasedTokens = 0;
      for (const req of sortedHistory) {
        releasedTokens += req.tokens;
        if (currentTokensInWindow - releasedTokens + estimatedTokens <= this.tokensPerMinute) {
          const releaseTime = req.time + 60000;
          tpmWaitTime = Math.max(0, releaseTime - Date.now());
          break;
        }
      }
      if (tpmWaitTime === 0) {
        tpmWaitTime = 60000; // Fallback to 1 minute wait
      }
    }

    const waitTime = Math.max(rpmWaitTime, tpmWaitTime);
    if (waitTime > 0) {
      console.log(`⏳ [RateLimiter] Waiting ${(waitTime/1000).toFixed(1)}s (RPM wait: ${(rpmWaitTime/1000).toFixed(1)}s, TPM wait: ${(tpmWaitTime/1000).toFixed(1)}s) to stay under quotas...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const finalTime = Date.now();
    this.lastRequestTime = finalTime;
    this.requestHistory.push({ time: finalTime, tokens: estimatedTokens });
  }

  /**
   * Execute function with rate limiting and exponential backoff
   */
  async execute(fn, fnName = "API call", options = {}) {
    const promptText = options.prompt || "";
    const estimatedTokens = options.estimatedTokens || this.estimateTokens(promptText);

    await this.waitForRateLimit(estimatedTokens);

    let lastError;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 [RateLimiter] Executing ${fnName} (attempt ${attempt + 1}/${maxRetries + 1}) - Est. tokens: ${estimatedTokens}`);
        const result = await fn();
        console.log(`✅ [RateLimiter] Success on attempt ${attempt + 1}`);
        return result;
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || error.toString();

        // Check if it's a 429 (rate limit) error
        if (errorMsg.includes("429") || errorMsg.includes("TooManyRequests") || errorMsg.toLowerCase().includes("rate limit") || errorMsg.includes("limit_exceeded")) {
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
        } else if (errorMsg.includes("quota") || errorMsg.includes("403") || errorMsg.toLowerCase().includes("billing")) {
          console.error(`❌ [RateLimiter] Quota exceeded or permission denied: ${errorMsg}`);
          const provider = process.env.GROQ_API_KEY ? "Groq" : "Google AI Studio";
          throw new Error(
            `API quota exceeded or permission denied. Please check your ${provider} plan and limits.`
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
  async queueRequest(fn, fnName = "API call", options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, fnName, options, resolve, reject });
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
      const { fn, fnName, options, resolve, reject } = this.queue.shift();

      try {
        const result = await this.execute(fn, fnName, options);
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
      const limiter = new RateLimiter(this.globalRequestsPerMinute, this.modelSpec.tpm);
      this.limiters.set(userId, limiter);
      console.log(`👤 [PerUserRateLimiter] Created limiter for user: ${userId}`);
    }

    return this.limiters.get(userId);
  }

  /**
   * Execute function with per-user rate limiting
   */
  async execute(fn, fnName = "API call", userId = "anonymous", options = {}) {
    const limiter = this.getLimiterForUser(userId);
    console.log(`👤 [PerUserRateLimiter] User: ${userId}, Function: ${fnName}`);
    return limiter.queueRequest(fn, fnName, options);
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
 */
export async function withRateLimit(fn, fnName = "API call", userId = "anonymous", options = {}) {
  const limiter = getPerUserRateLimiter();
  return limiter.execute(fn, fnName, userId, options);
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
