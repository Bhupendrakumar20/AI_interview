"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "./auth.action";
import { revalidatePath } from "next/cache";

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

    // . delete user document
    batch.delete(db.collection("users").doc(userId));

    await batch.commit();

    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("Error deleting account:", err);
    return { success: false, error: "Failed to delete account" };
  }
}

export async function updateProfileAction({
  name,
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

