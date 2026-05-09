/**
 * API Key Management & Rotation System
 * Automated management and rotation of sensitive API credentials
 */

import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import crypto from "crypto";

/**
 * API Key configuration
 */
export const API_KEY_CONFIG = {
  rotationIntervalDays: 30,
  maxKeysPerService: 3,
  keyValidityDays: 60,
  warningDaysBeforeExpiry: 7,
};

/**
 * Generate a secure API key
 */
export function generateApiKey(prefix = "key") {
  const randomBytes = crypto.randomBytes(32);
  const timestamp = Date.now().toString(36);
  const key = `${prefix}_${timestamp}_${randomBytes.toString("hex")}`;
  return key;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Verify an API key against hash
 */
export function verifyApiKey(key, hash) {
  return hashApiKey(key) === hash;
}

/**
 * Create a new API key for a service
 */
export async function createApiKey(userId, serviceName, description = "") {
  try {
    // Get existing keys for this service
    const keysQuery = db
      .collection("api_keys")
      .where("userId", "==", userId)
      .where("service", "==", serviceName)
      .where("revokedAt", "==", null);

    const existingKeys = await keysQuery.get();

    if (existingKeys.size >= API_KEY_CONFIG.maxKeysPerService) {
      throw new Error(
        `Maximum ${API_KEY_CONFIG.maxKeysPerService} keys allowed for ${serviceName}`
      );
    }

    // Generate new key
    const plainKey = generateApiKey(`${serviceName}`);
    const hashedKey = hashApiKey(plainKey);

    // Store key metadata (not the key itself)
    const keyRef = db.collection("api_keys").doc();
    await keyRef.set({
      keyId: keyRef.id,
      userId,
      service: serviceName,
      keyHash: hashedKey,
      description,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + API_KEY_CONFIG.keyValidityDays * 24 * 60 * 60 * 1000),
      lastUsedAt: null,
      revokedAt: null,
      status: "active",
    });

    return {
      success: true,
      keyId: keyRef.id,
      key: plainKey, // Return plain key only once
      message: "Store this key securely. You won't be able to see it again.",
    };
  } catch (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }
}

/**
 * Rotate an API key (revoke old, create new)
 */
export async function rotateApiKey(userId, keyId, serviceName) {
  try {
    const batch = db.batch();

    // Revoke old key
    const oldKeyRef = db.collection("api_keys").doc(keyId);
    batch.update(oldKeyRef, {
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "revoked",
    });

    // Create new key
    const plainKey = generateApiKey(serviceName);
    const hashedKey = hashApiKey(plainKey);

    const newKeyRef = db.collection("api_keys").doc();
    batch.set(newKeyRef, {
      keyId: newKeyRef.id,
      userId,
      service: serviceName,
      keyHash: hashedKey,
      description: `Rotated from ${keyId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(
        Date.now() + API_KEY_CONFIG.keyValidityDays * 24 * 60 * 60 * 1000
      ),
      lastUsedAt: null,
      revokedAt: null,
      status: "active",
      previousKeyId: keyId,
    });

    await batch.commit();

    return {
      success: true,
      oldKeyId: keyId,
      newKeyId: newKeyRef.id,
      newKey: plainKey,
      message: "API key rotated successfully. Update your services to use the new key.",
    };
  } catch (error) {
    throw new Error(`Failed to rotate API key: ${error.message}`);
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(userId, keyId) {
  try {
    const keyRef = db.collection("api_keys").doc(keyId);
    const keyDoc = await keyRef.get();

    if (!keyDoc.exists) {
      throw new Error("API key not found");
    }

    if (keyDoc.data().userId !== userId) {
      throw new Error("Unauthorized: Key belongs to different user");
    }

    await keyRef.update({
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "revoked",
    });

    return { success: true, keyId, message: "API key revoked successfully" };
  } catch (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }
}

/**
 * Verify an API key
 */
export async function verifyAndUseApiKey(plainKey) {
  try {
    // Hash the provided key
    const hashToFind = hashApiKey(plainKey);

    // Find the key in database
    const query = db
      .collection("api_keys")
      .where("keyHash", "==", hashToFind)
      .where("status", "==", "active");

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      throw new Error("Invalid or revoked API key");
    }

    const keyDoc = snapshot.docs[0];
    const keyData = keyDoc.data();

    // Check expiration
    if (keyData.expiresAt && new Date() > keyData.expiresAt) {
      throw new Error("API key has expired");
    }

    // Check if revoked
    if (keyData.revokedAt) {
      throw new Error("API key has been revoked");
    }

    // Update last used time
    await keyDoc.ref.update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      valid: true,
      userId: keyData.userId,
      service: keyData.service,
      keyId: keyDoc.id,
    };
  } catch (error) {
    throw new Error(`API key verification failed: ${error.message}`);
  }
}

/**
 * Get all keys for a user
 */
export async function getUserApiKeys(userId) {
  try {
    const query = db.collection("api_keys").where("userId", "==", userId);
    const snapshot = await query.get();

    const keys = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      keys.push({
        keyId: doc.id,
        service: data.service,
        description: data.description,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
        lastUsedAt: data.lastUsedAt?.toDate?.() || data.lastUsedAt,
        status: data.status,
        isExpiring: data.expiresAt && 
          new Date(data.expiresAt) - new Date() < API_KEY_CONFIG.warningDaysBeforeExpiry * 24 * 60 * 60 * 1000,
      });
    });

    return keys;
  } catch (error) {
    throw new Error(`Failed to get API keys: ${error.message}`);
  }
}

/**
 * Check for keys that need rotation
 */
export async function getKeysNeedingRotation() {
  try {
    const threshold = new Date(
      Date.now() - API_KEY_CONFIG.rotationIntervalDays * 24 * 60 * 60 * 1000
    );

    const query = db
      .collection("api_keys")
      .where("status", "==", "active")
      .where("createdAt", "<=", threshold);

    const snapshot = await query.get();

    const keysToRotate = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      keysToRotate.push({
        keyId: doc.id,
        userId: data.userId,
        service: data.service,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        ageInDays: Math.floor((Date.now() - data.createdAt.getTime?.()) / (24 * 60 * 60 * 1000)),
      });
    });

    return keysToRotate;
  } catch (error) {
    throw new Error(`Failed to check rotation status: ${error.message}`);
  }
}

/**
 * Audit API key usage
 */
export async function auditApiKeyUsage(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = db
      .collection("api_keys")
      .where("userId", "==", userId)
      .where("lastUsedAt", ">=", startDate);

    const snapshot = await query.get();

    const usage = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      usage.push({
        keyId: doc.id,
        service: data.service,
        lastUsedAt: data.lastUsedAt?.toDate?.() || data.lastUsedAt,
        status: data.status,
      });
    });

    return usage;
  } catch (error) {
    throw new Error(`Failed to audit API key usage: ${error.message}`);
  }
}
