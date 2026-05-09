/**
 * Firestore Encryption Wrapper
 * Automatically encrypts/decrypts sensitive fields
 */

import { db } from "@/firebase/admin";
import {
  encryptDocument,
  decryptDocument,
  getMasterEncryptionKey,
} from "./encryption.js";

/**
 * Set document with automatic encryption
 */
export async function setDocumentEncrypted(collectionPath, docId, data, options = {}) {
  try {
    const masterKey = getMasterEncryptionKey();
    const collectionName = collectionPath.split("/").pop();

    // Encrypt sensitive fields
    const encrypted = encryptDocument(data, collectionName, masterKey);

    // Write to Firestore
    const docRef = db.collection(collectionPath).doc(docId);
    await docRef.set(encrypted, options);

    return { success: true, docId };
  } catch (error) {
    throw new Error(`Failed to set encrypted document: ${error.message}`);
  }
}

/**
 * Update document with automatic encryption
 */
export async function updateDocumentEncrypted(collectionPath, docId, data) {
  try {
    const masterKey = getMasterEncryptionKey();
    const collectionName = collectionPath.split("/").pop();

    // Encrypt only the fields being updated
    const encrypted = encryptDocument(data, collectionName, masterKey);

    // Update Firestore
    const docRef = db.collection(collectionPath).doc(docId);
    await docRef.update(encrypted);

    return { success: true, docId };
  } catch (error) {
    throw new Error(`Failed to update encrypted document: ${error.message}`);
  }
}

/**
 * Get document with automatic decryption
 */
export async function getDocumentDecrypted(collectionPath, docId) {
  try {
    const masterKey = getMasterEncryptionKey();
    const collectionName = collectionPath.split("/").pop();

    // Read from Firestore
    const docRef = db.collection(collectionPath).doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    // Decrypt sensitive fields
    const data = doc.data();
    const decrypted = decryptDocument(data, collectionName, masterKey);

    return {
      id: doc.id,
      ...decrypted,
    };
  } catch (error) {
    throw new Error(`Failed to get decrypted document: ${error.message}`);
  }
}

/**
 * Query documents with automatic decryption
 */
export async function queryDocumentsDecrypted(
  collectionPath,
  queryConstraints = []
) {
  try {
    const masterKey = getMasterEncryptionKey();
    const collectionName = collectionPath.split("/").pop();

    // Build query
    let query = db.collection(collectionPath);

    for (const constraint of queryConstraints) {
      query = query.where(constraint.field, constraint.operator, constraint.value);
    }

    // Execute query
    const snapshot = await query.get();

    // Decrypt all documents
    const documents = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const decrypted = decryptDocument(data, collectionName, masterKey);
      documents.push({
        id: doc.id,
        ...decrypted,
      });
    });

    return documents;
  } catch (error) {
    throw new Error(`Failed to query decrypted documents: ${error.message}`);
  }
}

/**
 * Batch write with automatic encryption
 */
export async function batchWriteEncrypted(operations) {
  try {
    const masterKey = getMasterEncryptionKey();
    const batch = db.batch();

    for (const op of operations) {
      const collectionName = op.collectionPath.split("/").pop();
      const docRef = db.collection(op.collectionPath).doc(op.docId);

      if (op.type === "set") {
        const encrypted = encryptDocument(op.data, collectionName, masterKey);
        batch.set(docRef, encrypted);
      } else if (op.type === "update") {
        const encrypted = encryptDocument(op.data, collectionName, masterKey);
        batch.update(docRef, encrypted);
      } else if (op.type === "delete") {
        batch.delete(docRef);
      }
    }

    await batch.commit();
    return { success: true, operationCount: operations.length };
  } catch (error) {
    throw new Error(`Failed to batch write encrypted documents: ${error.message}`);
  }
}

/**
 * Transaction with automatic encryption
 */
export async function transactionEncrypted(callback) {
  try {
    const masterKey = getMasterEncryptionKey();

    return await db.runTransaction(async (transaction) => {
      // Create wrapper functions for encrypted operations
      const transactionApi = {
        get: async (docRef, collectionName) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) return null;
          const data = doc.data();
          return decryptDocument(data, collectionName, masterKey);
        },
        set: (docRef, data, collectionName) => {
          const encrypted = encryptDocument(data, collectionName, masterKey);
          transaction.set(docRef, encrypted);
        },
        update: (docRef, data, collectionName) => {
          const encrypted = encryptDocument(data, collectionName, masterKey);
          transaction.update(docRef, encrypted);
        },
        delete: (docRef) => {
          transaction.delete(docRef);
        },
      };

      return await callback(transactionApi);
    });
  } catch (error) {
    throw new Error(`Failed to execute encrypted transaction: ${error.message}`);
  }
}

/**
 * Add document with automatic encryption
 */
export async function addDocumentEncrypted(collectionPath, data) {
  try {
    const masterKey = getMasterEncryptionKey();
    const collectionName = collectionPath.split("/").pop();

    // Encrypt sensitive fields
    const encrypted = encryptDocument(data, collectionName, masterKey);

    // Add to Firestore
    const docRef = await db.collection(collectionPath).add(encrypted);

    return {
      success: true,
      docId: docRef.id,
    };
  } catch (error) {
    throw new Error(`Failed to add encrypted document: ${error.message}`);
  }
}
