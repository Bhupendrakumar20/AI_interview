"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "./auth.action";
import { revalidatePath } from "next/cache";

/**
 * Save an internship to user's saved list
 */
export async function saveInternship({ internshipId, internshipData }) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const userId = user.id;

    // Add to savedInternships subcollection
    await db
      .collection("users")
      .doc(userId)
      .collection("savedInternships")
      .doc(internshipId)
      .set({
        internshipId,
        ...internshipData,
        savedAt: new Date().toISOString(),
      });

    revalidatePath("/internships");
    revalidatePath("/saved-internships");

    return { success: true, message: "Internship saved!" };
  } catch (error) {
    console.error("Error saving internship:", error);
    return { success: false, error: "Failed to save internship" };
  }
}

/**
 * Remove an internship from user's saved list
 */
export async function unsaveInternship({ internshipId }) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const userId = user.id;

    // Delete from savedInternships subcollection
    await db
      .collection("users")
      .doc(userId)
      .collection("savedInternships")
      .doc(internshipId)
      .delete();

    revalidatePath("/internships");
    revalidatePath("/saved-internships");

    return { success: true, message: "Internship removed from saved!" };
  } catch (error) {
    console.error("Error removing saved internship:", error);
    return { success: false, error: "Failed to remove internship" };
  }
}

/**
 * Get all saved internships for current user
 */
export async function getSavedInternships() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized", internships: [] };

    const userId = user.id;

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("savedInternships")
      .orderBy("savedAt", "desc")
      .get();

    const internships = [];
    snapshot.forEach((doc) => {
      internships.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return { success: true, internships };
  } catch (error) {
    console.error("Error fetching saved internships:", error);
    return { success: false, error: "Failed to fetch saved internships", internships: [] };
  }
}

/**
 * Check if an internship is saved by current user
 */
export async function isInternshipSaved({ internshipId }) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, isSaved: false };

    const userId = user.id;

    const doc = await db
      .collection("users")
      .doc(userId)
      .collection("savedInternships")
      .doc(internshipId)
      .get();

    return { success: true, isSaved: doc.exists };
  } catch (error) {
    console.error("Error checking if internship is saved:", error);
    return { success: false, isSaved: false };
  }
}
