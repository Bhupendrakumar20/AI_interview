/**
 * Production Logging Utility
 * Replaces console.* with audit logging for critical events
 * Removes non-critical debug logs
 */

import { logAuditEvent } from "./audit-logging.js";

/**
 * Log security events (use instead of console.error for auth failures)
 */
export async function logSecurityEvent(eventType, data, userId, ip) {
  await logAuditEvent({
    userId,
    eventType,
    severity: "warning",
    description: data.message || eventType,
    ip,
    metadata: data,
  });
}

/**
 * Log API errors (use instead of console.error for API failures)
 */
export async function logApiError(eventType, data, userId, ip) {
  await logAuditEvent({
    userId,
    eventType,
    severity: "error",
    description: data.message || eventType,
    ip,
    metadata: data,
  });
}

/**
 * Log successful operations (use instead of console.log)
 */
export async function logOperation(eventType, data, userId, ip) {
  await logAuditEvent({
    userId,
    eventType,
    severity: "info",
    description: data.message || eventType,
    ip,
    metadata: data,
  });
}

/**
 * Production-safe console override
 * Only logs in development or critical errors in production
 */
export const productionLogger = {
  log: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.log(...args);
    }
  },

  error: (...args) => {
    // Always log errors
    console.error(...args);
  },

  warn: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(...args);
    }
  },

  debug: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(...args);
    }
  },
};
