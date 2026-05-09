/**
 * Field-Level Encryption System
 * Encrypts sensitive data before storage
 * Decrypts on retrieval for authorized users
 */

import crypto from "crypto";

/**
 * Encryption configuration
 */
export const ENCRYPTION_CONFIG = {
  algorithm: "aes-256-gcm",
  keyDerivation: "scrypt",
  saltLength: 32,
  tagLength: 16,
  ivLength: 12,
};

/**
 * Sensitive fields that should be encrypted
 */
export const SENSITIVE_FIELDS = {
  interview_buddy_sessions: ["recordingUrl", "transcriptUrl", "feedback"],
  dsa_rooms: ["recordings", "notes"],
  users: ["phone", "ssn"],
  applications: ["resumeData", "coverLetter"],
};

/**
 * Generate encryption key from password
 */
function deriveKey(password, salt) {
  return crypto.scryptSync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  });
}

/**
 * Encrypt a value
 */
export function encryptField(value, masterKey) {
  try {
    if (!value) return null;

    // Generate random salt and IV
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    // Derive key from master key + salt
    const key = deriveKey(masterKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + encrypted data
    const result = Buffer.concat([salt, iv, tag, encrypted]);

    // Return base64 encoded result with metadata
    return {
      encrypted: result.toString("base64"),
      algorithm: ENCRYPTION_CONFIG.algorithm,
      version: 1,
      saltLength: ENCRYPTION_CONFIG.saltLength,
      tagLength: ENCRYPTION_CONFIG.tagLength,
      ivLength: ENCRYPTION_CONFIG.ivLength,
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a value
 */
export function decryptField(encryptedData, masterKey) {
  try {
    if (!encryptedData || !encryptedData.encrypted) return null;

    // Decode from base64
    const data = Buffer.from(encryptedData.encrypted, "base64");

    // Extract components
    const saltLength = encryptedData.saltLength;
    const ivLength = encryptedData.ivLength;
    const tagLength = encryptedData.tagLength;

    const salt = data.slice(0, saltLength);
    const iv = data.slice(saltLength, saltLength + ivLength);
    const tag = data.slice(saltLength + ivLength, saltLength + ivLength + tagLength);
    const encrypted = data.slice(saltLength + ivLength + tagLength);

    // Derive key
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      key,
      iv
    );

    // Set authentication tag
    decipher.setAuthTag(tag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    // Parse JSON
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt entire document (only sensitive fields)
 */
export function encryptDocument(doc, collectionName, masterKey) {
  try {
    const sensitiveFields = SENSITIVE_FIELDS[collectionName] || [];
    const encrypted = { ...doc };

    for (const field of sensitiveFields) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = encryptField(encrypted[field], masterKey);
        // Mark as encrypted
        encrypted[`${field}_encrypted`] = true;
      }
    }

    return encrypted;
  } catch (error) {
    throw new Error(`Document encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt entire document (only encrypted sensitive fields)
 */
export function decryptDocument(doc, collectionName, masterKey) {
  try {
    const decrypted = { ...doc };

    // Find all encrypted fields
    for (const key in decrypted) {
      if (key.endsWith("_encrypted") && decrypted[key] === true) {
        const fieldName = key.slice(0, -10); // Remove "_encrypted"
        if (decrypted[fieldName]) {
          decrypted[fieldName] = decryptField(decrypted[fieldName], masterKey);
        }
      }
    }

    return decrypted;
  } catch (error) {
    throw new Error(`Document decryption failed: ${error.message}`);
  }
}

/**
 * Get master encryption key from environment
 */
export function getMasterEncryptionKey() {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "DATA_ENCRYPTION_KEY environment variable not set. Set a strong 32+ character key."
    );
  }
  if (key.length < 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be at least 32 characters long");
  }
  return key;
}

/**
 * Hash a field for comparison without decryption
 * Used for unique indexes on encrypted data
 */
export function hashField(value, salt) {
  if (!value) return null;

  const hash = crypto
    .createHmac("sha256", salt)
    .update(JSON.stringify(value))
    .digest("hex");

  return hash;
}

/**
 * Generate a searchable token from encrypted data
 * Allows searching while keeping data encrypted
 */
export function generateSearchToken(value) {
  if (!value) return null;

  // Hash the first few characters for prefix search
  const token = crypto
    .createHash("sha256")
    .update(String(value).substring(0, 4))
    .digest("hex")
    .substring(0, 16);

  return token;
}

/**
 * Verify encryption is working correctly
 */
export function verifyEncryption() {
  try {
    const testData = { test: "data", value: 123 };
    const masterKey = getMasterEncryptionKey();

    // Encrypt
    const encrypted = encryptField(testData, masterKey);

    // Decrypt
    const decrypted = decryptField(encrypted, masterKey);

    // Verify
    if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
      throw new Error("Decrypted data does not match original");
    }

    return true;
  } catch (error) {
    console.error("Encryption verification failed:", error);
    return false;
  }
}

/**
 * Batch encrypt multiple fields
 */
export function encryptBatch(fields, masterKey) {
  const encrypted = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) {
      encrypted[key] = encryptField(value, masterKey);
    }
  }

  return encrypted;
}

/**
 * Batch decrypt multiple fields
 */
export function decryptBatch(fields, masterKey) {
  const decrypted = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value && value.encrypted) {
      decrypted[key] = decryptField(value, masterKey);
    } else {
      decrypted[key] = value;
    }
  }

  return decrypted;
}
