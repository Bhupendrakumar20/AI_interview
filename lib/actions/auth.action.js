"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Set session cookie
export async function setSessionCookie(idToken) {
  const cookieStore = await cookies();

  // Create session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000, // milliseconds
  });

  // Set cookie in the browser
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params) {
  const { uid, name, email } = params;

  try {
    // check if user exists in db
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };

    // save user to db
    await db.collection("users").doc(uid).set({
      name,
      email,
      // profileURL,
      // resumeURL,
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    if (error.code === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params) {
  const { email, idToken } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord)
      return {
        success: false,
        message: "User does not exist. Create an account.",
      };

    await setSessionCookie(idToken);
  } catch (error) {
    console.log("");

    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Logout with redirect
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  
  // Redirect will be handled on client side
  return { success: true };
}

// Change password - requires current user verification
export async function changePassword(newPassword) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Since we're using Firebase Auth with email/password,
    // we need to update the auth user's password
    // Note: This requires the user to be logged in and re-authenticated
    await auth.updateUser(user.id, {
      password: newPassword,
    });

    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    console.error("Error changing password:", error);
    
    if (error.code === "auth/weak-password") {
      return { success: false, error: "Password is too weak. Use at least 6 characters." };
    }
    
    return { success: false, error: "Failed to change password" };
  }
}

// Get current user from session cookie
export async function getCurrentUser() {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    // get user info from db
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();
    if (!userRecord.exists) return null;

    const userData = {
      ...userRecord.data(),
      id: userRecord.id,
      uid: userRecord.id,
    };


    // ✅ Serialize Firebase Timestamp objects to ISO strings
    return serializeFirebaseData(userData);
  } catch (error) {
    console.log(error);

    // Invalid or expired session
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
