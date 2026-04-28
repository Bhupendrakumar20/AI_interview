/**
 * Rate Limiter & Request Queue for Gemini API
 * 
 * Solves 429 TooManyRequests errors by:
 * 1. Limiting to 15 requests/minute (1 every 4 seconds)
 * 2. Queuing requests for sequential processing
 * 3. Implementing exponential backoff for retries
 */

class RateLimiter {
  constructor(requestsPerMinute = 15) {
    this.requestsPerMinute = requestsPerMinute;
    this.minIntervalMs = (60 * 1000) / requestsPerMinute; // 4000ms for 15/min
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
      console.log(`⏳ [RateLimiter] Waiting ${waitTime}ms to respect rate limit...`);
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
            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(
              `⚠️ [RateLimiter] Rate limited (429). Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            // Increase rate limit window on backoff
            this.lastRequestTime = Date.now();
          } else {
            console.error(`❌ [RateLimiter] Failed after ${maxRetries} retries due to rate limit`);
            throw new Error(
              `API rate limit exceeded after ${maxRetries} retries. You've hit 15 requests/minute limit. Please wait or upgrade plan.`
            );
          }
        } else if (errorMsg.includes("quota") || errorMsg.includes("403")) {
          // Quota or permission error - don't retry
          console.error(`❌ [RateLimiter] Quota exceeded or permission denied: ${errorMsg}`);
          throw new Error(
            "API quota exceeded or permission denied. Upgrade your Google AI Studio plan at https://ai.google.dev/pricing"
          );
        } else {
          // Other error - retry
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 500;
            console.warn(
              `⚠️ [RateLimiter] Error: ${errorMsg}. Retrying in ${backoffMs}ms...`
            );
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

// Global rate limiter instance
let globalRateLimiter = null;

/**
 * Get or create global rate limiter
 */
export function getRateLimiter() {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(15); // 15 requests per minute = free tier limit
    console.log("📊 [RateLimiter] Initialized with 15 requests/minute limit");
  }
  return globalRateLimiter;
}

/**
 * Execute with global rate limiter and queuing
 */
export async function withRateLimit(fn, fnName = "API call") {
  const limiter = getRateLimiter();
  return limiter.queueRequest(fn, fnName);
}

export default RateLimiter;
