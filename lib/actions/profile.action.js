"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "./auth.action";
import { revalidatePath } from "next/cache";

export async function updateProfileAction({ name, resumeURL }) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const updates = {};

    if (typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }

    if (typeof resumeURL === "string") {
      updates.resumeURL = resumeURL.trim();
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: "Nothing to update." };
    }

    await db.collection("users").doc(user.id).update(updates);

    // Profile page ko refresh kara de server-side
    revalidatePath("/profile");

    return { success: true };
  } catch (err) {
    console.error("Error updating profile:", err);
    return { success: false, error: "Failed to update profile." };
  }
}
