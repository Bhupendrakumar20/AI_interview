// Security helpers for API endpoints
// Centralized security checks and validation

import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkGeminiRateLimit, checkRoomCreationRateLimit } from "./rate-limiters";

/**
 * Verify user is authenticated and ID matches
 * @param {string} userId - User ID from request
 * @returns {Promise<{authorized: boolean, user: object, error: string}>}
 */
export async function verifyUserOwnership(userId) {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return {
      authorized: false,
      error: "User not authenticated",
      statusCode: 401,
    };
  }

  if (!userId || userId !== currentUser.uid) {
    return {
      authorized: false,
      error: "User ID mismatch",
      statusCode: 403,
    };
  }

  return {
    authorized: true,
    user: currentUser,
    statusCode: 200,
  };
}

/**
 * Verify user owns a resource (document)
 * @param {object} doc - Firestore document data
 * @param {string} userId - User ID to verify
 * @param {string} ownerField - Field name containing owner ID (default: createdBy)
 * @returns {boolean}
 */
export function verifyResourceOwnership(doc, userId, ownerField = "createdBy") {
  return doc?.data?.()?.[ownerField] === userId || doc?.[ownerField] === userId;
}

/**
 * Validate parameters are of correct type
 * @param {object} params - Parameters to validate
 * @param {object} schema - Validation schema {fieldName: type}
 * @returns {boolean} True if all valid
 */
export function validateParameterTypes(params, schema) {
  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in params)) {
      return false;
    }
    
    const actualType = Array.isArray(params[field]) ? "array" : typeof params[field];
    
    if (expectedType === "date") {
      if (!(params[field] instanceof Date) && typeof params[field] !== "string") {
        return false;
      }
    } else if (actualType !== expectedType) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitize string input to prevent injection
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== "string") return "";
  
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .substring(0, 1000); // Limit length
}

/**
 * Validate status transitions
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status
 * @param {object} validTransitions - Map of valid transitions
 * @returns {boolean}
 */
export function isValidStatusTransition(currentStatus, newStatus, validTransitions) {
  if (!validTransitions[currentStatus]) return false;
  return validTransitions[currentStatus].includes(newStatus);
}

/**
 * Check if string is valid URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (typeof url !== "string") return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate numeric score is in valid range
 * @param {number} score - Score to validate
 * @param {number} min - Minimum score
 * @param {number} max - Maximum score
 * @returns {boolean}
 */
export function isValidScore(score, min = 0, max = 100) {
  return typeof score === "number" && score >= min && score <= max && !isNaN(score);
}

/**
 * Get client IP from request headers
 * @param {object} request - Next.js request object
 * @returns {string} IP address
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
 * Check if user can perform action based on rate limit
 * @param {string} userId - User ID
 * @param {string} action - Action type (gemini, room-create, etc.)
 * @returns {Promise<object>} {allowed: boolean, remaining: number, resetIn: number}
 */
export async function checkActionRateLimit(userId, action) {
  let result = { allowed: true, remaining: 0, resetIn: 0 };

  switch (action) {
    case "gemini":
      result = await checkGeminiRateLimit(userId);
      break;
    case "room-create":
      result = await checkRoomCreationRateLimit(userId);
      break;
    default:
      result = { allowed: true, remaining: 100, resetIn: 0 };
  }

  return result;
}
