/**
 * scripts/migrateFirestore.js
 * Migration script to copy legacy root collections to the new nested/organized layout.
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

async function migrateCollection(sourceCollection, targetPathBuilder, queryModifier = null) {
  console.log(`\n--- Migrating ${sourceCollection} ---`);
  
  let ref = db.collection(sourceCollection);
  if (queryModifier) {
    ref = queryModifier(ref);
  }
  
  try {
    const snapshot = await ref.get();
    console.log(`Found ${snapshot.size} documents in legacy "${sourceCollection}".`);
    
    let migratedCount = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const id = doc.id;
      
      try {
        const targetPath = targetPathBuilder(data, id);
        if (!targetPath) {
          console.warn(`Skipping document ${id} from "${sourceCollection}" (could not resolve target path).`);
          continue;
        }
        
        const targetRef = db.doc(targetPath);
        await targetRef.set(data, { merge: true });
        migratedCount++;
      } catch (err) {
        console.error(`Failed to migrate document ${id} from "${sourceCollection}":`, err.message);
      }
    }
    console.log(`Successfully migrated ${migratedCount}/${snapshot.size} documents from "${sourceCollection}".`);
  } catch (err) {
    console.warn(`Legacy collection "${sourceCollection}" does not exist or is inaccessible:`, err.message);
  }
}

async function runMigration() {
  try {
    // 1. Migrate interview_buddy_sessions -> /users/{createdBy}/interview_buddy_sessions/{sessionId}
    await migrateCollection('interview_buddy_sessions', (data, id) => {
      const userId = data.createdBy;
      return userId ? `users/${userId}/interview_buddy_sessions/${id}` : null;
    });

    // 2. Migrate user_interview_buddy_stats -> /users/{userId}/user_stats/buddy
    await migrateCollection('user_interview_buddy_stats', (data, id) => {
      return `users/${id}/user_stats/buddy`;
    });

    // 3. Migrate user_stats -> /users/{userId}/user_stats/dsa
    await migrateCollection('user_stats', (data, id) => {
      return `users/${id}/user_stats/dsa`;
    });

    // 4. Migrate interviews -> /users/{userId}/interviews/{interviewId}
    await migrateCollection('interviews', (data, id) => {
      const userId = data.userId;
      return userId ? `users/${userId}/interviews/${id}` : null;
    });

    // 5. Migrate applications -> /users/{userId}/applications/{applicationId}
    await migrateCollection('applications', (data, id) => {
      const userId = data.userId;
      return userId ? `users/${userId}/applications/${id}` : null;
    });

    // 6. Migrate feedback (legacy root user_feedback/feedback) -> /users/{userId}/feedback/{feedbackId}
    await migrateCollection('user_feedback', (data, id) => {
      const userId = data.userId || data.createdBy;
      return userId ? `users/${userId}/feedback/${id}` : null;
    });
    await migrateCollection('feedback', (data, id) => {
      let userId = data.createdBy || data.userId;
      if (!userId && id.startsWith('mock_feedback_')) {
        userId = id.split('_')[2];
      }
      return userId ? `users/${userId}/feedback/${id}` : null;
    });

    // 7. Migrate audit_logs -> /system/audit_logs/logs/{logId}
    await migrateCollection('audit_logs', (data, id) => {
      return `system/audit_logs/logs/${id}`;
    });

    // 8. Migrate critical_audit_events -> /system/critical_audit_events/events/{eventId}
    await migrateCollection('critical_audit_events', (data, id) => {
      return `system/critical_audit_events/events/${id}`;
    });

    // 9. Migrate proctoring_reviews -> /system/proctoring_reviews/reviews/{reviewId}
    await migrateCollection('proctoring_reviews', (data, id) => {
      return `system/proctoring_reviews/reviews/${id}`;
    });

    // 10. Migrate admin_logs -> /system/admin_logs/logs/{logId}
    await migrateCollection('admin_logs', (data, id) => {
      return `system/admin_logs/logs/${id}`;
    });

    console.log('\nMigration complete! ');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
