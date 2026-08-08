/**
 * Audit Logging System
 * Tracks all sensitive operations for compliance and security
 */

import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

/**
 * Audit event types
 */
export const AUDIT_EVENT_TYPES = {
  // Authentication events
  USER_LOGIN: "user:login",
  USER_LOGOUT: "user:logout",
  USER_REGISTER: "user:register",
  PASSWORD_RESET: "user:password_reset",
  MFA_ENABLED: "user:mfa_enabled",

  // Session events
  SESSION_CREATE: "session:create",
  SESSION_START: "session:start",
  SESSION_END: "session:end",
  SESSION_DELETE: "session:delete",
  SESSION_SCORE_UPDATE: "session:score_update",
  SESSION_STATUS_CHANGE: "session:status_change",

  // Score events
  SCORE_SUBMIT: "score:submit",
  SCORE_VALIDATE: "score:validate",
  SCORE_MODIFY: "score:modify",

  // Proctoring events
  PROCTORING_VIOLATION: "proctoring:violation",
  PROCTORING_FLAG: "proctoring:flag",
  PROCTORING_REVIEW: "proctoring:review",

  // Data events
  DATA_EXPORT: "data:export",
  DATA_DELETE: "data:delete",
  DATA_DECRYPT: "data:decrypt",

  // Admin events
  ADMIN_USER_MODIFY: "admin:user_modify",
  ADMIN_SESSION_MODIFY: "admin:session_modify",
  ADMIN_SCORE_OVERRIDE: "admin:score_override",
  ADMIN_FIRESTORE_UPDATE: "admin:firestore_update",

  // Security events
  SECURITY_VIOLATION: "security:violation",
  RATE_LIMIT_EXCEEDED: "security:rate_limit_exceeded",
  UNAUTHORIZED_ACCESS: "security:unauthorized_access",
  ENCRYPTION_FAILURE: "security:encryption_failure",

  // API events
  API_KEY_CREATED: "api:key_created",
  API_KEY_DELETED: "api:key_deleted",
  API_QUOTA_EXCEEDED: "api:quota_exceeded",
};

/**
 * Severity levels
 */
export const AUDIT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
};

/**
 * Log an audit event
 */
export async function logAuditEvent(
  userId,
  eventType,
  resourceType,
  resourceId,
  details = {},
  severity = AUDIT_SEVERITY.INFO
) {
  try {
    // Support object-style invocation: logAuditEvent({ userId, eventType, ... })
    if (userId && typeof userId === "object" && eventType === undefined) {
      const obj = userId;
      userId = obj.userId;
      eventType = obj.eventType;
      resourceType = obj.resourceType || obj.resource || "unknown";
      resourceId = obj.resourceId || obj.sessionId || obj.sessionCode || "unknown";
      details = obj.details || obj.metadata || { description: obj.description, ...obj };
      severity = obj.severity || AUDIT_SEVERITY.INFO;
    }

    // Validate event type
    if (!Object.values(AUDIT_EVENT_TYPES).includes(eventType)) {
      console.warn(`Unknown audit event type: ${eventType}`);
    }

    const auditRef = db.collection("system").doc("audit_logs").collection("logs").doc();

    const auditData = {
      userId: userId || "unknown",
      eventType: eventType || "unknown",
      resourceType: resourceType || "unknown",
      resourceId: resourceId || "unknown",
      details: sanitizeDetails(details),
      severity: severity || AUDIT_SEVERITY.INFO,
      ipAddress: details.ipAddress || details.ip || null,
      userAgent: details.userAgent || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date(),
    };


    // Add additional context if available
    if (details.sessionId) {
      auditData.sessionId = details.sessionId;
    }

    if (details.changedFields) {
      auditData.changedFields = details.changedFields;
    }

    // Write to audit logs
    await auditRef.set(auditData);

    // If critical, also log to separate critical events collection
    if (severity === AUDIT_SEVERITY.CRITICAL) {
      const criticalRef = db.collection("system").doc("critical_audit_events").collection("events").doc();
      await criticalRef.set({
        ...auditData,
        alertsCreated: false,
      });

      // Log to console for immediate visibility
      console.error(`🚨 CRITICAL AUDIT EVENT: ${eventType}`, auditData);
    }

    return { success: true, auditId: auditRef.id };
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw - audit failure shouldn't break main operation
    return { success: false, error: error.message };
  }
}

/**
 * Sanitize details to prevent logging sensitive data
 */
function sanitizeDetails(details) {
  const sanitized = { ...details };

  // List of sensitive fields to redact
  const sensitiveFields = [
    "password",
    "passwordHash",
    "apiKey",
    "apiSecret",
    "token",
    "refreshToken",
    "ssn",
    "creditCard",
    "encryptionKey",
    "privateKey",
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }

    // Check nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        for (const nestedField of sensitiveFields) {
          if (nestedField in sanitized[key]) {
            sanitized[key][nestedField] = "[REDACTED]";
          }
        }
      }
    }
  }

  return sanitized;
}

/**
 * Log session score update
 */
export async function logSessionScoreUpdate(
  userId,
  sessionId,
  oldScore,
  newScore,
  reason,
  ipAddress
) {
  return logAuditEvent(
    userId,
    AUDIT_EVENT_TYPES.SESSION_SCORE_UPDATE,
    "session",
    sessionId,
    {
      oldScore,
      newScore,
      scoreDifference: newScore - oldScore,
      reason,
      ipAddress,
    },
    newScore - oldScore > 20 ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO
  );
}

/**
 * Log security violation
 */
export async function logSecurityViolation(
  userId,
  violationType,
  details,
  ipAddress
) {
  return logAuditEvent(
    userId,
    AUDIT_EVENT_TYPES.SECURITY_VIOLATION,
    "security",
    violationType,
    {
      violationType,
      ...details,
      ipAddress,
    },
    AUDIT_SEVERITY.WARNING
  );
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  userId,
  resourceType,
  resourceId,
  reason,
  ipAddress
) {
  return logAuditEvent(
    userId,
    AUDIT_EVENT_TYPES.UNAUTHORIZED_ACCESS,
    resourceType,
    resourceId,
    {
      reason,
      ipAddress,
    },
    AUDIT_SEVERITY.CRITICAL
  );
}

/**
 * Log rate limit violation
 */
export async function logRateLimitViolation(userId, endpoint, limit, ipAddress) {
  return logAuditEvent(
    userId,
    AUDIT_EVENT_TYPES.RATE_LIMIT_EXCEEDED,
    "endpoint",
    endpoint,
    {
      endpoint,
      limit,
      ipAddress,
    },
    AUDIT_SEVERITY.WARNING
  );
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId, limit = 100, offset = 0) {
  try {
    const query = db
      .collection("system")
      .doc("audit_logs")
      .collection("logs")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(limit + 1)
      .offset(offset);

    const snapshot = await query.get();
    const logs = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      });
    });

    return {
      logs: logs.slice(0, limit),
      hasMore: logs.length > limit,
      total: logs.length,
    };
  } catch (error) {
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }
}

/**
 * Get audit logs for a resource
 */
export async function getResourceAuditLogs(resourceType, resourceId, limit = 100) {
  try {
    const query = db
      .collection("system")
      .doc("audit_logs")
      .collection("logs")
      .where("resourceType", "==", resourceType)
      .where("resourceId", "==", resourceId)
      .orderBy("timestamp", "desc")
      .limit(limit);

    const snapshot = await query.get();
    const logs = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      });
    });

    return logs;
  } catch (error) {
    throw new Error(`Failed to get resource audit logs: ${error.message}`);
  }
}

/**
 * Get critical events
 */
export async function getCriticalAuditEvents(limit = 50) {
  try {
    const query = db
      .collection("system")
      .doc("critical_audit_events")
      .collection("events")
      .where("alertsCreated", "==", false)
      .orderBy("timestamp", "desc")
      .limit(limit);

    const snapshot = await query.get();
    const events = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      });
    });

    return events;
  } catch (error) {
    throw new Error(`Failed to get critical events: ${error.message}`);
  }
}

/**
 * Get audit summary for user
 */
export async function getAuditSummary(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = db
      .collection("system")
      .doc("audit_logs")
      .collection("logs")
      .where("userId", "==", userId)
      .where("createdAt", ">=", startDate);

    const snapshot = await query.get();

    const summary = {
      total: snapshot.size,
      byEventType: {},
      bySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0,
      },
      timeline: [],
    };

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Count by event type
      summary.byEventType[data.eventType] =
        (summary.byEventType[data.eventType] || 0) + 1;

      // Count by severity
      summary.bySeverity[data.severity] =
        (summary.bySeverity[data.severity] || 0) + 1;
    });

    return summary;
  } catch (error) {
    throw new Error(`Failed to get audit summary: ${error.message}`);
  }
}

/**
 * Export audit logs (admin only)
 */
export async function exportAuditLogs(filters = {}, format = "json") {
  try {
    let query = db.collection("system").doc("audit_logs").collection("logs");

    // Apply filters
    if (filters.userId) {
      query = query.where("userId", "==", filters.userId);
    }

    if (filters.eventType) {
      query = query.where("eventType", "==", filters.eventType);
    }

    if (filters.severity) {
      query = query.where("severity", "==", filters.severity);
    }

    if (filters.startDate) {
      query = query.where("createdAt", ">=", filters.startDate);
    }

    if (filters.endDate) {
      query = query.where("createdAt", "<=", filters.endDate);
    }

    query = query.orderBy("createdAt", "desc").limit(10000);

    const snapshot = await query.get();
    const logs = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      });
    });

    if (format === "csv") {
      return convertToCSV(logs);
    }

    return {
      format: "json",
      count: logs.length,
      data: logs,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to export audit logs: ${error.message}`);
  }
}

/**
 * Convert audit logs to CSV format
 */
function convertToCSV(logs) {
  if (logs.length === 0) {
    return "No data to export";
  }

  const headers = Object.keys(logs[0]);
  const csv = [
    headers.join(","),
    ...logs.map((log) =>
      headers
        .map((header) => {
          const value = log[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return JSON.stringify(value);
          if (typeof value === "string" && value.includes(","))
            return `"${value}"`;
          return value;
        })
        .join(",")
    ),
  ];

  return csv.join("\n");
}

/**
 * Get recent suspicious activity
 */
export async function getSuspiciousActivity(limit = 20) {
  try {
    // Get recent security violations
    const query = db
      .collection("system")
      .doc("audit_logs")
      .collection("logs")
      .where("severity", "==", AUDIT_SEVERITY.CRITICAL)
      .orderBy("timestamp", "desc")
      .limit(limit);

    const snapshot = await query.get();
    const activity = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      activity.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      });
    });

    return activity;
  } catch (error) {
    throw new Error(`Failed to get suspicious activity: ${error.message}`);
  }
}
