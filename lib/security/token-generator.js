// Secure Token Generator for Session Codes
// Uses cryptographically secure random token generation

import crypto from 'crypto';

/**
 * Generate a cryptographically secure session code
 * Format: IB-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (UUID v4 style)
 * Entropy: 128 bits - Brute force resistant
 * @returns {string} Unique session code
 */
export function generateSecureSessionCode() {
  // Generate 16 random bytes = 128 bits of entropy
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `IB-${randomBytes}`.toUpperCase();
}

/**
 * Generate a cryptographically secure room code for DSA rooms
 * Format: DSA-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (UUID v4 style)
 * Entropy: 128 bits - Brute force resistant
 * @returns {string} Unique room code
 */
export function generateSecureRoomCode() {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `DSA-${randomBytes}`.toUpperCase();
}

/**
 * Generate a cryptographically secure invite code
 * Format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX (UUID v4 style)
 * @returns {string} Unique invite code
 */
export function generateSecureInviteCode() {
  return crypto.randomUUID();
}

/**
 * Validate if a code format is correct
 * @param {string} code - Code to validate
 * @param {string} prefix - Expected prefix (IB-, DSA-, etc.)
 * @returns {boolean} True if format is valid
 */
export function validateCodeFormat(code, prefix) {
  if (!code || typeof code !== 'string') return false;
  if (!code.startsWith(prefix)) return false;
  
  const parts = code.split('-');
  if (parts.length !== 2) return false;
  
  // Should be hex string (32 chars = 128 bits)
  return /^[A-F0-9]{32}$/.test(parts[1]);
}
