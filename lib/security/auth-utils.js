// lib/security/auth-utils.js
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_change_me_in_production";

/**
 * Generate a salt and hash password using pbkdf2
 */
export function hashPassword(password) {
  if (!password) throw new Error("Password is required");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password against hashed password
 */
export function verifyPassword(password, storedPassword) {
  if (!password || !storedPassword) return false;
  const parts = storedPassword.split(":");
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

/**
 * Sign payload to create custom JWT
 */
export function signToken(payload, expiresInSeconds = 604800) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(`${base64Header}.${base64Payload}`);
  const signature = hmac.digest("base64url");
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify and decode JWT
 */
export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  
  const [header, payload, signature] = parts;
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(`${header}.${payload}`);
  const expectedSignature = hmac.digest("base64url");
  
  if (signature !== expectedSignature) return null;
  
  try {
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) {
      return null; // Expired
    }
    return decodedPayload;
  } catch (error) {
    return null;
  }
}

// Simple local OTP cache to store OTP codes
// Format: email -> { otp, expiresAt }
// Stored on globalThis to persist across hot-reloads (HMR) in Next.js development
if (!globalThis.otpStore) {
  globalThis.otpStore = new Map();
}
const otpStore = globalThis.otpStore;


/**
 * Generate 6 digit OTP and store in cache
 */
export function generateOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
  otpStore.set(email.toLowerCase(), { otp, expiresAt });
  return otp;
}

/**
 * Verify OTP
 */
export function verifyOTP(email, code) {
  const key = email.toLowerCase();
  const cached = otpStore.get(key);
  if (!cached) return false;
  
  if (Date.now() > cached.expiresAt) {
    otpStore.delete(key);
    return false;
  }
  
  if (cached.otp === code) {
    otpStore.delete(key); // Use once
    return true;
  }
  
  return false;
}
