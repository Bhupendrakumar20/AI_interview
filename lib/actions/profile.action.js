"use server";

import { db, auth } from "@/firebase/admin";
import { getCurrentUser } from "./auth.action";
import { revalidatePath } from "next/cache";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";
import { getAchievementsForUserId } from "@/lib/actions/profile-achievements.action";
import { buildAnalyticsSummary } from "@/lib/profile-summary";

/* -------------------------------------------------------------------------- */
/*                           UPDATE SETTINGS ACTION                            */
/* -------------------------------------------------------------------------- */
export async function updateSettingsAction({ camera, notifications }) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await db.collection("users").doc(user.id).update({
      camera: !!camera,
      notifications: !!notifications,
    });

    revalidatePath("/settings");

    return { success: true };
  } catch (err) {
    console.error("Error updating settings:", err);
    return { success: false, error: "Failed to update settings" };
  }
}

/* -------------------------------------------------------------------------- */
/*                         CLEAR INTERVIEW HISTORY ACTION                      */
/* -------------------------------------------------------------------------- */
export async function clearHistoryAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const userId = user.id;

    // . Delete interviews (user's)
    const interviewsSnap = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .get();

    // . Delete feedback (user's)
    const feedbackSnap = await db
      .collection("feedback")
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();

    interviewsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    feedbackSnap.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    revalidatePath("/");
    revalidatePath("/analytics");

    return { success: true };
  } catch (err) {
    console.error("Error clearing history:", err);
    return { success: false, error: "Failed to clear history" };
  }
}

/* -------------------------------------------------------------------------- */
/*                           DELETE ACCOUNT ACTION                             */
/* -------------------------------------------------------------------------- */
export async function deleteAccountAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const userId = user.id;

    // . delete all interviews + feedback first
    const interviewsSnap = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .get();

    const feedbackSnap = await db
      .collection("feedback")
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();

    interviewsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    feedbackSnap.docs.forEach((doc) => batch.delete(doc.ref));

    // . delete user document from Firestore
    batch.delete(db.collection("users").doc(userId));

    await batch.commit();

    // . Delete user from Firebase Authentication
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      console.error("Error deleting user from auth:", authError);
      // Continue anyway - user data is deleted, just auth record might remain
    }

    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("Error deleting account:", err);
    return { success: false, error: "Failed to delete account" };
  }
}

const MAX_DATA_URL_LENGTH = 350000;

function isSafeProfileImage(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= MAX_DATA_URL_LENGTH;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function updateProfileAction({
  name,
  photoURL,
  resumeURL,
  bio,
  skills,
  github,
  linkedin,
  portfolio,
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updates = {};

    // . Name
    if (typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }

    // . Profile Photo URL / Data URL
    if (typeof photoURL === "string") {
      const trimmedPhoto = photoURL.trim();
      if (!isSafeProfileImage(trimmedPhoto)) {
        return { success: false, error: "Please upload a smaller image or provide a valid http(s) image URL." };
      }
      updates.photoURL = trimmedPhoto;
    }

    // . Resume URL
    if (typeof resumeURL === "string") {
      updates.resumeURL = resumeURL.trim();
    }

    // . Bio
    if (typeof bio === "string") {
      updates.bio = bio.trim();
    }

    // . Skills
    if (typeof skills === "string") {
      updates.skills = skills.trim();
    }

    // . GitHub
    if (typeof github === "string") {
      updates.github = github.trim();
    }

    // . LinkedIn
    if (typeof linkedin === "string") {
      updates.linkedin = linkedin.trim();
    }

    // . Portfolio
    if (typeof portfolio === "string") {
      updates.portfolio = portfolio.trim();
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: "Nothing to update." };
    }

    await db.collection("users").doc(user.id).update(updates);

    revalidatePath("/profile");

    return { success: true };
  } catch (err) {
    console.error("Error updating profile:", err);
    return { success: false, error: "Failed to update profile." };
  }
}

function buildPublicHandle(data) {
  if (data?.username) return `@${String(data.username).replace(/^@+/, "")}`;
  if (data?.email && data.email !== "guest@example.com") {
    return `@${String(data.email).split("@")[0]}`;
  }
  return "@prepwise_member";
}

function toSafeCandidateUser(id, data, includeEmail = false) {
  return serializeFirebaseData({
    id,
    uid: id,
    name: data?.name || "PrepWise Candidate",
    username: data?.username || "",
    handle: buildPublicHandle(data),
    email: includeEmail ? data?.email || "" : "",
    photoURL: data?.photoURL || data?.image || "",
    bio: data?.bio || "",
    skills: data?.skills || "",
    github: data?.github || "",
    linkedin: data?.linkedin || "",
    portfolio: data?.portfolio || "",
    current_streak: Number(data?.current_streak || 0),
    best_streak: Number(data?.best_streak || 0),
    createdAt: data?.createdAt || null,
  });
}

function toCandidatePreview(id, data) {
  return {
    id,
    name: data?.name || "PrepWise Candidate",
    handle: buildPublicHandle(data),
    photoURL: data?.photoURL || data?.image || "",
    currentStreak: Number(data?.current_streak || 0),
    skills: String(data?.skills || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3),
  };
}

export async function searchCandidateProfilesAction(rawQuery) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.uid === "dummy-user-id") {
      return { success: false, error: "Please sign in to search user profiles.", results: [] };
    }

    if (typeof rawQuery !== "string") {
      return { success: false, error: "Enter a name, @handle, or user ID to search.", results: [] };
    }

    const trimmed = rawQuery.trim();
    const normalized = trimmed.replace(/^@+/, "").toLowerCase();

    if (normalized.length < 2) {
      return {
        success: false,
        error: "Enter at least 2 characters for a valid search.",
        results: [],
      };
    }

    if (normalized.length > 64) {
      return { success: false, error: "Search query is too long.", results: [] };
    }

    const matches = [];
    const seenIds = new Set();

    // Direct lookup by exact User ID if query has no spaces and no @
    if (!trimmed.includes(" ") && !trimmed.startsWith("@") && !trimmed.includes("/")) {
      const directDoc = await db.collection("users").doc(trimmed).get();
      if (directDoc.exists) {
        const data = directDoc.data();
        if (data?.email !== "guest@example.com") {
          return { success: true, results: [toCandidatePreview(directDoc.id, data)] };
        }
      }
    }

    const usersSnapshot = await db.collection("users").limit(250).get();
    const isEmailQuery = trimmed.includes("@") && trimmed.includes(".");

    usersSnapshot.docs.forEach((doc) => {
      if (seenIds.has(doc.id)) return;
      const data = doc.data();
      if (!data || data.email === "guest@example.com") return;

      const name = String(data.name || "").toLowerCase();
      const username = String(data.username || "").replace(/^@+/, "").toLowerCase();
      const email = String(data.email || "").toLowerCase();
      const emailPrefix = email.split("@")[0] || "";

      const matched = isEmailQuery
        ? email === trimmed.toLowerCase()
        : name.includes(normalized) ||
          username.includes(normalized) ||
          emailPrefix.includes(normalized) ||
          doc.id.toLowerCase() === normalized;

      if (matched) {
        seenIds.add(doc.id);
        matches.push(toCandidatePreview(doc.id, data));
      }
    });

    return {
      success: true,
      results: matches.slice(0, 10),
    };
  } catch (err) {
    console.error("Error searching candidate profiles:", err);
    return { success: false, error: "Failed to search profiles.", results: [] };
  }
}

export async function getCandidateProfileCardAction(targetUserId) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.uid === "dummy-user-id") {
      return { success: false, error: "Please sign in to view user profiles." };
    }

    if (typeof targetUserId !== "string" || !targetUserId.trim() || targetUserId.includes("/")) {
      return { success: false, error: "Invalid user ID." };
    }

    const cleanId = targetUserId.trim();
    const userDoc = await db.collection("users").doc(cleanId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User profile not found." };
    }

    const rawData = userDoc.data();
    if (!rawData || rawData.email === "guest@example.com") {
      return { success: false, error: "User profile not found." };
    }

    const [interviews, feedbacks, achievements] = await Promise.all([
      getInterviewsByUserId(cleanId),
      getUserFeedbacks(cleanId),
      getAchievementsForUserId(cleanId),
    ]);

    const safeUser = toSafeCandidateUser(cleanId, rawData, cleanId === currentUser.id);
    const summary = buildAnalyticsSummary(feedbacks, interviews);

    return {
      success: true,
      profile: {
        user: safeUser,
        summary,
        achievements,
      },
    };
  } catch (err) {
    console.error("Error loading candidate profile card:", err);
    return { success: false, error: "Unable to load this user's profile card." };
  }
}

