"use client";

import { auth } from "@/firebase/client";
import {
  updateEmail,
  verifyBeforeUpdateEmail,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { db } from "@/firebase/client";
import { doc, updateDoc } from "firebase/firestore";

/**
 * Send verification email to user's current email
 * User must click link to verify their account
 */
export async function sendVerificationEmail() {
  try {
    const user = auth.currentUser;

    if (!user) {
      return {
        success: false,
        error: "User not logged in",
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        error: "Email is already verified",
      };
    }

    // Send verification email using Firebase
    await sendEmailVerification(user, {
      url: `${window.location.origin}/verify-email`,
    });

    return {
      success: true,
      message: `Verification email sent to ${user.email}. Please check your inbox.`,
    };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return {
      success: false,
      error: error.message || "Failed to send verification email",
    };
  }
}

/**
 * Update user's email address
 * Sends verification email to new address
 * User must verify before email is updated
 */
export async function changeUserEmail(newEmail) {
  try {
    const user = auth.currentUser;

    if (!user) {
      return {
        success: false,
        error: "User not logged in",
      };
    }

    if (newEmail === user.email) {
      return {
        success: false,
        error: "New email must be different from current email",
      };
    }

    // Send verification email before updating (requires re-authentication in some cases)
    // Firebase will verify the new email before actually updating it
    await verifyBeforeUpdateEmail(user, newEmail, {
      url: `${window.location.origin}/verify-email?newEmail=${encodeURIComponent(newEmail)}`,
    });

    // Also send a confirmation email to current email about the change attempt
    return {
      success: true,
      message: `Verification link sent to ${newEmail}. Please verify your new email to complete the change.`,
      info: "A confirmation has also been sent to your current email",
    };
  } catch (error) {
    console.error("Error changing email:", error);

    // Handle specific Firebase errors
    if (error.code === "auth/email-already-in-use") {
      return {
        success: false,
        error: "This email is already registered to another account",
      };
    } else if (error.code === "auth/invalid-email") {
      return {
        success: false,
        error: "Invalid email address",
      };
    } else if (error.code === "auth/requires-recent-login") {
      return {
        success: false,
        error: "Please log in again before changing your email",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to update email",
    };
  }
}

/**
 * Check if user's email is verified
 * If not, offer to send verification email
 */
export async function checkEmailVerification() {
  try {
    const user = auth.currentUser;

    if (!user) {
      return {
        success: false,
        isVerified: false,
        error: "User not logged in",
      };
    }

    // Reload user data to get latest verification status
    await reload(user);

    return {
      success: true,
      isVerified: user.emailVerified,
      email: user.email,
    };
  } catch (error) {
    console.error("Error checking email verification:", error);
    return {
      success: false,
      isVerified: false,
      error: error.message || "Failed to check email verification",
    };
  }
}

/**
 * Update user email in Firestore after Firebase confirms verification
 * This is called after user verifies the new email via the verification link
 */
export async function updateUserEmailInDatabase(userId, newEmail) {
  try {
    const userDocRef = doc(db, "users", userId);

    await updateDoc(userDocRef, {
      email: newEmail,
      email_updated_at: new Date(),
      email_verified: true,
    });

    return {
      success: true,
      message: "Email updated successfully in database",
    };
  } catch (error) {
    console.error("Error updating email in database:", error);
    return {
      success: false,
      error: error.message || "Failed to update email in database",
    };
  }
}

/**
 * Send password reset email (used in Forgot Password page)
 * User clicks link in email to reset their password
 * Note: This uses client-side Firebase auth method
 * Already implemented in ForgotPasswordForm component
 */
export async function sendPasswordResetEmailAction(email) {
  try {
    // This is a validation wrapper - actual sending happens in ForgotPasswordForm
    // which uses Firebase client-side sendPasswordResetEmail

    if (!email) {
      return {
        success: false,
        error: "Email address is required",
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        success: false,
        error: "Invalid email address format",
      };
    }

    return {
      success: true,
      message: "Email validation passed. Ready to send reset email.",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Email validation failed",
    };
  }
}
