// firebase/client.js
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, setPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log Firebase config (for debugging)
if (process.env.NODE_ENV === 'development') {
  console.log('[Firebase] Initializing with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
  });
}

let app, auth, db;

try {
  // Initialize Firebase (avoid duplicate app initialization)
  const apps = getApps();
  if (!apps.length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);

  // 🔒 Use in-memory persistence only (no browser localStorage or indexedDB)
  // This ensures authentication state is NOT persisted in browser
  // Session validation will be done via secure httpOnly cookies on the server
  if (typeof window !== 'undefined') {
    // Browser environment
    setPersistence(auth, inMemoryPersistence).catch((error) => {
      console.warn("Firebase persistence mode set to in-memory:", error);
    });
  }

  console.log('[Firebase] Initialization successful');
} catch (error) {
  if (typeof window === 'undefined') {
    // Node.js environment - create mock objects
    console.warn('[Firebase] Running in Node.js environment, using mock objects:', error.message);
    
    // Mock Firebase database for server-side operations
    db = {
      collection: (name) => ({
        where: (field, op, value) => ({
          limit: (n) => ({
            get: async () => ({ empty: true, docs: [] })
          })
        }),
        doc: (id) => ({
          update: async (data) => ({}),
          set: async (data) => ({}),
          get: async () => ({ data: () => ({}), exists: false })
        }),
        add: async (data) => ({ id: 'mock-id' })
      })
    };
    auth = null;
  } else {
    throw error;
  }
}

export { auth, db };