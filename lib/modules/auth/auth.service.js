"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

const SESSION_DURATION = 60 * 60 * 24 * 7; // 1 week

/**
 * Create JWT session after successful authentication
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<{success: boolean, sessionCookie: string}>}
 */
export async function createJWTSession(idToken) {
  const cookieStore = await cookies();

  // Create Firebase session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000,
  });

  // Set secure HTTP-only cookie
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });

  return { success: true, sessionCookie };
}

/**
 * Verify session cookie via Next.js middleware
 * @returns {Promise<Object|null>} - Decoded claims or null
 */
export async function verifySessionToken() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} - User data with serialized timestamps
 */
export async function getCurrentAuthenticatedUser() {
  const decodedClaims = await verifySessionToken();
  if (!decodedClaims) return null;

  try {
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();

    if (!userRecord.exists) return null;

    const userData = {
      ...userRecord.data(),
      id: userRecord.id,
      uid: decodedClaims.uid,
    };

    // Serialize Firebase Timestamp objects
    return serializeFirebaseData(userData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Sign out user and clear session
 * @returns {Promise<{success: boolean}>}
 */
export async function signOutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return { success: true };
}

/**
 * Register new user
 * @param {Object} params - { uid, email, name }
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export async function registerNewUser(params) {
  const { uid, email, name } = params;

  try {
    const userExists = await db.collection("users").doc(uid).get();

    if (userExists.exists) {
      return { success: false, error: "User already exists" };
    }

    // Create user profile
    await db.collection("users").doc(uid).set({
      id: uid,
      uid,
      email,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: "user",
      interviewCount: 0,
    });

    return { success: true, userId: uid };
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, error: "Registration failed" };
  }
}
