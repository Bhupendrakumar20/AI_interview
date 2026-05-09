// Debug Endpoint Protection
// In production, all debug endpoints should be disabled

const ALLOWED_DEBUG_IPS = [
  "127.0.0.1",
  "localhost",
  "::1", // IPv6 localhost
];

/**
 * Check if debug endpoints should be accessible
 * @param {string} ip - Client IP address
 * @returns {boolean} True if access allowed
 */
export function isDebugAccessAllowed(ip) {
  // Disable debug endpoints in production unless explicitly enabled
  if (process.env.NODE_ENV === "production") {
    if (!process.env.DEBUG_ENDPOINTS_ENABLED) {
      return false;
    }
    // Even if enabled, only allow from whitelisted IPs
    return ALLOWED_DEBUG_IPS.includes(ip);
  }

  // In development, allow all
  return true;
}

/**
 * Get client IP from request
 */
export function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-client-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Create protected debug endpoint response
 */
export function createDebugResponse(request) {
  const ip = getClientIp(request);
  
  if (!isDebugAccessAllowed(ip)) {
    return {
      status: 403,
      json: {
        error: "Debug endpoints are disabled in production",
      },
    };
  }

  return null; // Allowed
}
