"use server";

import { db, auth } from "@/firebase/admin";
import { cookies } from "next/headers";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateOTP,
  verifyOTP,
} from "@/lib/security/auth-utils";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASSWORD || "",
  },
});

/**
 * Send OTP Verification Email
 */
export async function sendEmailOTP(email) {
  try {
    const otp = generateOTP(email);
    console.log(`🔑 [OTP DEVELOPMENT FALLBACK] OTP for ${email}: ${otp}`);

    // If SMTP details are configured, send the actual email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await transporter.sendMail({
        from: `"PrepWise Auth" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verification OTP Code - PrepWise",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Verify Your Account</h2>
            <p>Hello,</p>
            <p>Thank you for choosing PrepWise. Use the following OTP code to verify your identity. This OTP is valid for 5 minutes.</p>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p>If you did not request this code, please ignore this email.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">&copy; PrepWise AI. All rights reserved.</p>
          </div>
        `,
      });
    }

    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // In development we still return success if fallback logging works
    return { 
      success: true, 
      message: "OTP generated (please check server/development console log)" 
    };
  }
}

/**
 * Set custom JWT session cookie
 */
export async function setSessionCookie(token) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

/**
 * Sign up a new user with custom password hashing
 */
export async function signUp(params) {
  const { name, email, password, otp } = params;

  try {
    // 1. Verify OTP first
    const isOtpValid = verifyOTP(email, otp);
    if (!isOtpValid) {
      return {
        success: false,
        message: "Invalid or expired OTP code.",
      };
    }

    // 2. Check if user already exists
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();
    
    if (!snapshot.empty) {
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };
    }

    // 3. Hash the password and save
    const hashedPassword = hashPassword(password);
    const userId = crypto.randomUUID();

    // Create Firebase Auth user record to synchronize Auth with Firestore
    await auth.createUser({
      uid: userId,
      email: email.toLowerCase(),
      password: password,
      displayName: name,
      emailVerified: true, // Mark email as verified since OTP was checked successfully
    });

    const userData = {
      name,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      skillLevel: "beginner",
    };

    await usersRef.doc(userId).set(userData);

    // Create user statistics record
    await db.collection("users").doc(userId).collection("user_stats").doc("dsa").set({
      user_id: userId,
      total_rooms: 0,
      total_wins: 0,
      total_solved: 0,
      avg_points: 0,
      current_streak: 0,
      best_streak: 0,
      first_bloods: 0,
      favorite_language: null,
      favorite_difficulty: null,
      updated_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

/**
 * Sign in using email and custom hashed password
 */
export async function signIn(params) {
  const { email, password, otp } = params;

  try {
    const isSpecialAdmin = email.toLowerCase() === "prepwise.ai.interview@gmail.com";
    
    // If special admin, check if password is correct
    if (isSpecialAdmin) {
      if (password !== "Admin") {
        return {
          success: false,
          message: "Incorrect password. Please try again.",
        };
      }
      
      // Ensure the user exists in Firestore
      const usersRef = db.collection("users");
      const snapshot = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();
      
      let userId;
      let userData;
      if (snapshot.empty) {
        userId = crypto.randomUUID();
        userData = {
          name: "PrepWise Admin",
          email: email.toLowerCase(),
          passwordHash: hashPassword("Admin"),
          role: "super_admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=PrepWiseAdmin",
          skillLevel: "expert",
        };
        await usersRef.doc(userId).set(userData);
      } else {
        userId = snapshot.docs[0].id;
        userData = snapshot.docs[0].data();
        // Ensure role is super_admin
        if (userData.role !== "super_admin") {
          await usersRef.doc(userId).update({ role: "super_admin" });
          userData.role = "super_admin";
        }
      }

      // Check OTP / 2-Factor Auth
      if (!otp) {
        // Send email OTP
        await sendEmailOTP(email.toLowerCase());
        return {
          success: true,
          requiresMfa: true,
          message: "A 2-Factor Authentication code has been sent to prepwise.ai.interview@gmail.com. Please check your email.",
        };
      }

      // Verify OTP
      const isOtpValid = verifyOTP(email.toLowerCase(), otp);
      if (!isOtpValid) {
        return {
          success: false,
          message: "Invalid or expired 2-Factor Auth code.",
        };
      }

      // Sign JWT and set session
      const token = signToken({
        uid: userId,
        email: userData.email,
        name: userData.name,
        admin: true,
        role: "super_admin",
      });

      await setSessionCookie(token);
      return { success: true, isAdmin: true };
    }

    // Default standard sign-in flow for normal users
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();
    
    if (snapshot.empty) {
      return {
        success: false,
        message: "User does not exist. Please create an account.",
      };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify Password
    const isPasswordCorrect = verifyPassword(password, userData.passwordHash);
    if (!isPasswordCorrect) {
      return {
        success: false,
        message: "Incorrect password. Please try again.",
      };
    }

    // Generate JWT token
    const isAdmin = userData.role === "admin" || userData.role === "super_admin";
    const token = signToken({
      uid: userDoc.id,
      email: userData.email,
      name: userData.name,
      admin: isAdmin,
      role: userData.role || "user",
    });

    await setSessionCookie(token);

    return { success: true, isAdmin };
  } catch (error) {
    console.error("Error logging in:", error);
    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

/**
 * Custom signin verification for OAuth (Google/Github)
 */
export async function handleOAuthLogin(email, name) {
  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();
    
    let userId = "";
    let isAdmin = false;
    let role = "user";

    if (snapshot.empty) {
      // Create new user record for first-time Google signin
      userId = crypto.randomUUID();
      const userData = {
        name,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        skillLevel: "beginner",
        role: "user",
      };
      
      await usersRef.doc(userId).set(userData);

      // Create stats
      await db.collection("users").doc(userId).collection("user_stats").doc("dsa").set({
        user_id: userId,
        total_rooms: 0,
        total_wins: 0,
        total_solved: 0,
        avg_points: 0,
        current_streak: 0,
        best_streak: 0,
        first_bloods: 0,
        favorite_language: null,
        favorite_difficulty: null,
        updated_at: new Date().toISOString(),
      });
    } else {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      userId = userDoc.id;
      role = userData.role || "user";
      isAdmin = role === "admin" || role === "super_admin";
    }

    const token = signToken({
      uid: userId,
      email: email.toLowerCase(),
      name,
      admin: isAdmin,
      role: role,
    });

    await setSessionCookie(token);
    return { success: true, isAdmin };
  } catch (error) {
    console.error("Error handling OAuth login:", error);
    return { success: false, message: "OAuth login failed" };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// Logout with redirect helper
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return { success: true };
}

// Change password
export async function changePassword(newPassword) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const hashedPassword = hashPassword(newPassword);
    
    await db.collection("users").doc(user.id).update({
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Failed to change password" };
  }
}

// Get current user from custom JWT session cookie
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return {
        id: "dummy-user-id",
        uid: "dummy-user-id",
        name: "Guest User",
        email: "guest@example.com",
      };
    }

    const decoded = verifyToken(sessionCookie);
    if (!decoded || !decoded.uid) return null;

    const userRecord = await db.collection("users").doc(decoded.uid).get();
    if (!userRecord.exists) return null;

    const userData = {
      ...userRecord.data(),
      id: userRecord.id,
      uid: userRecord.id,
    };

    return serializeFirebaseData(userData);
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user && user.uid !== "dummy-user-id";
}

/**
 * Send password reset email with JWT link
 */
export async function sendPasswordResetEmailCustom(email) {
  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();
    
    if (snapshot.empty) {
      return { success: false, message: "No account found with this email address" };
    }

    // Generate password reset token valid for 15 minutes
    const token = signToken({ email: email.toLowerCase(), type: "reset" }, 15 * 60);
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4001"}/reset-password?token=${token}`;
    
    console.log(`🔑 [PASSWORD RESET FALLBACK] Reset Link for ${email}: ${resetUrl}`);

    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await transporter.sendMail({
        from: `"PrepWise Auth" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset Password Link - PrepWise",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your PrepWise account. Click the button below to set a new password. This link is valid for 15 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">&copy; PrepWise AI. All rights reserved.</p>
          </div>
        `,
      });
    }

    return { success: true, message: "Reset link sent successfully" };
  } catch (error) {
    console.error("Error sending reset password link:", error);
    return { success: false, message: "Failed to send reset link" };
  }
}

/**
 * Reset password using JWT token
 */
export async function resetPasswordWithToken(token, newPassword) {
  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.email || decoded.type !== "reset") {
      return { success: false, message: "Invalid or expired reset token" };
    }

    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", decoded.email).limit(1).get();
    
    if (snapshot.empty) {
      return { success: false, message: "User not found" };
    }

    const userDoc = snapshot.docs[0];
    const hashedPassword = hashPassword(newPassword);

    await usersRef.doc(userDoc.id).update({
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "Failed to reset password" };
  }
}

/**
 * Fetch pending approvals count for a user (called securely from TopBar)
 */
export async function getPendingApprovalsCount(userId) {
  try {
    if (!userId) return 0;
    
    // Query all DSA rooms where user is the owner
    const roomsSnapshot = await db
      .collection("dsa_rooms")
      .where("owner", "==", userId)
      .get();

    let totalPendingCount = 0;
    roomsSnapshot.forEach((doc) => {
      const roomData = doc.data();
      const pendingRequests = roomData.pendingRequests || [];
      totalPendingCount += pendingRequests.length;
    });

    return totalPendingCount;
  } catch (error) {
    console.error("Error in getPendingApprovalsCount server action:", error);
    return 0;
  }
}

export async function verifySuperAdminOTP(otp) {
  try {
    const isOtpValid = verifyOTP("prepwise.ai.interview@gmail.com", otp);
    return { success: isOtpValid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendSuperAdminOTP() {
  try {
    const res = await sendEmailOTP("prepwise.ai.interview@gmail.com");
    return res;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

