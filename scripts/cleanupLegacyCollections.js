/**
 * scripts/cleanupLegacyCollections.js
 * Script to delete legacy/unused root collections from Firestore after migration.
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

// List of legacy collections to delete
const collectionsToDelete = [
  'interview_buddy_sessions',
  'user_interview_buddy_stats',
  'interviews',
  'feedback',
  'user_feedback',
  'audit_logs',
  'critical_audit_events',
  'proctoring_reviews',
  'admin_logs',
  // Unused legacy collections from seeding
  'user_profiles',
  'user_sessions',
  'user_watchlist',
  'user_settings',
  'user_progress',
  'user_certificates',
  'user_applications',
  // DSA and Stats legacy collections
  'dsa_room_submissions',
  'dsa_rooms',
  'dsa_stats',
  'dsa_test_cases',
  'interview_buddy_stats',
  'user_stats'
];

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}

async function deleteQueryBatch(db, query, resolve, reject) {
  try {
    const snapshot = await query.get();

    // When there are no documents left, we are done
    if (snapshot.size === 0) {
      resolve();
      return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next batch
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

async function runCleanup() {
  console.log('Starting cleanup of legacy root collections...');
  for (const collectionName of collectionsToDelete) {
    try {
      console.log(`Deleting collection: "${collectionName}"...`);
      await deleteCollection(collectionName);
      console.log(`Successfully deleted collection: "${collectionName}".`);
    } catch (error) {
      console.error(`Error deleting collection "${collectionName}":`, error.message);
    }
  }
  console.log('Cleanup finished! Your Firestore root is now clean and segregated. 🎉');
}

runCleanup();
