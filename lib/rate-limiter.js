/**
 * Rate Limiter & Request Queue for Gemini / Groq API
 * 
 * Supports model-aware limits, global API quota protection,
 * per-user pacing/queuing, and fail-fast handling for fatal SDK errors.
 */

// Model specifications
export const MODEL_SPECS = {
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    rpm: 10,
    rpd: 250,
    tpm: 250000,
  },
  "gemini-1.5-flash": {
    name: "Gemini 1.5 Flash",
    rpm: 15,
    rpd: 1500,
    tpm: 1000000,
  },
  "gemini-2.5-flash-lite": {
    name: "Gemini 2.5 Flash-Lite",
    rpm: 15,
    rpd: 1000,
    tpm: 250000,
  },
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
    rpm: 5,
    rpd: 100,
    tpm: 250000,
  },
  "gemini-2.0-flash": {
    name: "Gemini 2.0 Flash",
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

/**
 * Determine default model dynamically based on environment configuration
 */
export function getDefaultModel() {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (process.env.GEMINI_API_KEY) return "gemini-2.5-flash";
  if (process.env.GROQ_API_KEY) return "llama-3.3-70b-versatile";
  return "gemini-1.5-flash";
}

/**
 * Get model specs - returns the specification for current or specified model
 */
export function getModelSpec(modelName = getDefaultModel()) {
  const cleanTarget = (modelName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const matchedKey = Object.keys(MODEL_SPECS).find((key) => {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleanTarget.includes(cleanKey) || cleanKey.includes(cleanTarget);
  });

  const spec = MODEL_SPECS[matchedKey] || MODEL_SPECS[getDefaultModel()] || MODEL_SPECS["gemini-1.5-flash"];
  return spec;
}

export class RateLimiter {
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
    if (!promptText) return 1500;
    const chars = typeof promptText === "string" ? promptText.length : JSON.stringify(promptText).length;
    const inputTokens = Math.ceil(chars / 4);
    return inputTokens + 1000; // Buffer for model output
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

    // 2. Tokens Per Minute (TPM) sliding window check (60-second window)
    const windowStart = now - 60000;
    this.requestHistory = this.requestHistory.filter((req) => req.time > windowStart);

    const currentTokensInWindow = this.requestHistory.reduce((sum, req) => sum + req.tokens, 0);

    let tpmWaitTime = 0;
    if (currentTokensInWindow + estimatedTokens > this.tokensPerMinute) {
      console.warn(
        `⚠️ [RateLimiter] TPM Limit reached: ${currentTokensInWindow}/${this.tokensPerMinute} tokens in window. Needed: ${estimatedTokens}.`
      );

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
      if (tpmWaitTime === 0) tpmWaitTime = 5000;
    }

    const waitTime = Math.max(rpmWaitTime, tpmWaitTime);
    if (waitTime > 0) {
      console.log(`⏳ [RateLimiter] Pacing request: waiting ${(waitTime / 1000).toFixed(2)}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const finalTime = Date.now();
    this.lastRequestTime = finalTime;
    this.requestHistory.push({ time: finalTime, tokens: estimatedTokens });
  }

  /**
   * Execute function with rate limiting, error safety, and exponential backoff
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
        return result;
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || error.toString();

        // 1. Fail immediately on unrecoverable/structural SDK errors —
        // these will never succeed no matter how many times we retry.
        const isFatalError =
          errorMsg.includes("Unsupported model version") ||
          errorMsg.includes("AI_UnsupportedModelVersionError") ||
          errorMsg.includes("Invalid API key") ||
          errorMsg.includes("does not support response format") || // e.g. Groq + json_schema mode
          errorMsg.includes("not found");

        if (isFatalError) {
          console.error(`❌ [RateLimiter] Non-retryable configuration error: ${errorMsg}`);
          throw error;
        }

        // 2. Retry with exponential backoff on rate limits
        const isRateLimit =
          errorMsg.includes("429") ||
          errorMsg.includes("TooManyRequests") ||
          errorMsg.toLowerCase().includes("rate limit") ||
          errorMsg.includes("limit_exceeded");

        if (isRateLimit && attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️ [RateLimiter] Rate limited (429). Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          this.lastRequestTime = Date.now();
          continue;
        }

        // 3. Retry on transient network/provider errors
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 500;
          console.warn(`⚠️ [RateLimiter] Error: ${errorMsg}. Retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          console.error(`❌ [RateLimiter] Exhausted retries for ${fnName}: ${errorMsg}`);
          throw error;
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
    if (this.processing || this.queue.length === 0) return;
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
 * Per-User and Global Multi-Model Rate Limiter Manager
 */
class PerUserRateLimiterManager {
  constructor(defaultModel = getDefaultModel(), maxConcurrentUsers = 25) {
    this.defaultModel = defaultModel;
    this.maxConcurrentUsers = maxConcurrentUsers;
    this.limiters = new Map(); // Map<modelKey, Map<userId, RateLimiter>>
    this.globalLimiters = new Map(); // Map<modelKey, RateLimiter>
    this.cleanupInterval = null;
    this.startCleanup();
  }

  getGlobalLimiter(modelName) {
    const spec = getModelSpec(modelName);
    if (!this.globalLimiters.has(spec.name)) {
      this.globalLimiters.set(spec.name, new RateLimiter(spec.rpm, spec.tpm));
    }
    return this.globalLimiters.get(spec.name);
  }

  getLimiterForUser(userId = "anonymous", modelName = this.defaultModel) {
    const spec = getModelSpec(modelName);
    if (!this.limiters.has(spec.name)) {
      this.limiters.set(spec.name, new Map());
    }

    const userMap = this.limiters.get(spec.name);
    if (!userMap.has(userId)) {
      const perUserRPM = Math.max(1, spec.rpm / this.maxConcurrentUsers);
      const perUserTPM = Math.max(1000, Math.floor(spec.tpm / this.maxConcurrentUsers));
      userMap.set(userId, new RateLimiter(perUserRPM, perUserTPM));
      console.log(`👤 [PerUserRateLimiter] Created limiter for user: ${userId} on model ${spec.name}`);
    }

    return userMap.get(userId);
  }

  async execute(fn, fnName = "API call", userId = "anonymous", options = {}) {
    const targetModel = options.model || this.defaultModel;
    const spec = getModelSpec(targetModel);
    
    console.log(`📋 [ModelSpec] Using: ${spec.name} (${spec.rpm} RPM, ${spec.tpm.toLocaleString()} TPM)`);
    console.log(`👤 [PerUserRateLimiter] User: ${userId}, Function: ${fnName}`);

    const globalLimiter = this.getGlobalLimiter(targetModel);
    const userLimiter = this.getLimiterForUser(userId, targetModel);

    // Queue per-user first, then pass through global rate limiter
    return userLimiter.queueRequest(
      () => globalLimiter.queueRequest(fn, fnName, options),
      fnName,
      options
    );
  }

  startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [modelName, userMap] of this.limiters.entries()) {
        for (const [userId, limiter] of userMap.entries()) {
          const timeSinceLastRequest = now - limiter.lastRequestTime;
          if (timeSinceLastRequest > inactivityThreshold && limiter.queue.length === 0 && !limiter.processing) {
            userMap.delete(userId);
            console.log(`🧹 [PerUserRateLimiter] Cleaned up inactive user: ${userId} for model: ${modelName}`);
          }
        }
      }
    }, 60000);
  }
}

let globalManager = null;

export function getPerUserRateLimiter(modelName, maxUsers = 25) {
  if (!globalManager) {
    globalManager = new PerUserRateLimiterManager(modelName || getDefaultModel(), maxUsers);
  }
  return globalManager;
}

export async function withRateLimit(fn, fnName = "API call", userId = "anonymous", options = {}) {
  const manager = getPerUserRateLimiter(options.model);
  return manager.execute(fn, fnName, userId, options);
}

export function getRateLimiter() {
  const manager = getPerUserRateLimiter();
  return manager.getGlobalLimiter(getDefaultModel());
}

export default RateLimiter;