/**
 * scripts/purgeGhostSubcollections.js
 * Script to delete all nested subcollection documents for non-admin users.
 * This will fully remove the "ghost" italicized user IDs from the Firestore console.
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

// Nested subcollection names used in the app
const subcollectionNames = [
  'sessions',
  'feedbacks',
  'feedback',
  'settings',
  'votes',
  'dsa_stats',
  'user_stats'
];

async function purgeGhostSubcollections() {
  console.log('🚀 Starting purge of ghost subcollections...');
  let totalDeleted = 0;

  for (const name of subcollectionNames) {
    try {
      console.log(`Checking collection group: "${name}"...`);
      const snapshot = await db.collectionGroup(name).get();
      
      if (snapshot.empty) {
        console.log(`  No documents found in group "${name}".`);
        continue;
      }

      console.log(`  Found ${snapshot.size} documents in group "${name}". Processing...`);
      const batch = db.batch();
      let batchSize = 0;

      for (const doc of snapshot.docs) {
        // Resolve parent user ID. Path is like: users/{userId}/{subcollectionName}/{docId}
        const pathSegments = doc.ref.path.split('/');
        const userIdIndex = pathSegments.indexOf(name) - 1;
        const userId = pathSegments[userIdIndex];

        if (userId === 'admin_001') {
          console.log(`    ➡️ Skipping admin document under path: ${doc.ref.path}`);
          continue;
        }

        console.log(`    🗑️ Queuing deletion for: ${doc.ref.path}`);
        batch.delete(doc.ref);
        batchSize++;
        totalDeleted++;

        if (batchSize >= 400) {
          await batch.commit();
          console.log('    ⚡ Committed batch of 400 deletions.');
          batchSize = 0;
        }
      }

      if (batchSize > 0) {
        await batch.commit();
        console.log('    ⚡ Committed remaining deletions.');
      }

    } catch (err) {
      console.error(`❌ Error purging collection group "${name}":`, err.message);
    }
  }

  console.log(`\n🎉 Purge complete! Deleted ${totalDeleted} subcollection documents. Refresh your Firestore console to see a clean root!`);
  process.exit(0);
}

purgeGhostSubcollections();
