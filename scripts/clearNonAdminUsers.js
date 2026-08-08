/**
 * scripts/clearNonAdminUsers.js
 * Script to delete all non-admin users and their subcollections from Firestore & Firebase Auth.
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
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
const auth = getAuth();

async function clearNonAdminUsers() {
  console.log('🚀 Fetching all users from Firestore...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users in Firestore.`);
    
    let deletedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      const email = userData.email || "";
      const role = userData.role || "";
      
      const isAdmin = role === 'admin' || role === 'super_admin' || uid === 'admin_001' || email === 'admin@careerlens.ai';
      
      if (isAdmin) {
        console.log(`➡️ Keeping admin user: ${email} (${uid})`);
        continue;
      }
      
      console.log(`🗑️ Deleting user: ${email} (${uid})`);
      
      // 1. Delete from Firestore recursively (deletes document and all subcollections)
      try {
        await db.recursiveDelete(doc.ref);
        console.log(`   ✅ Deleted from Firestore (including all subcollections)`);
      } catch (dbErr) {
        console.error(`   ❌ Firestore deletion failed for ${uid}:`, dbErr.message);
      }
      
      // 2. Delete from Firebase Auth
      try {
        await auth.deleteUser(uid);
        console.log(`   ✅ Deleted from Firebase Auth`);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
          console.log(`   ℹ️ User not found in Firebase Auth`);
        } else {
          console.error(`   ❌ Firebase Auth deletion failed for ${uid}:`, authErr.message);
        }
      }
      
      deletedCount++;
    }
    
    console.log(`\n🎉 Cleared ${deletedCount} non-admin users successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error executing script:', error);
    process.exit(1);
  }
}

clearNonAdminUsers();
