const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

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

async function inspectGhost() {
  const ghostId = '5WehGo5nK1pLsSeZdCRb';
  console.log(`Inspecting ghost user: ${ghostId}`);
  try {
    const docRef = db.doc(`users/${ghostId}`);
    const collections = await docRef.listCollections();
    console.log(`Found ${collections.length} subcollections:`);
    collections.forEach(col => {
      console.log(`  - ${col.id}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectGhost();
