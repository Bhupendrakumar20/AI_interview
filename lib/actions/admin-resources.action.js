"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { revalidatePath } from "next/cache";

/**
 * Fetch course title and nested resources list
 */
export async function getCourseDetails(courseId) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    const doc = await db.collection("courses").doc(courseId).get();
    if (!doc.exists) {
      return { success: false, error: "Course not found" };
    }

    return { success: true, course: serializeFirebaseData({ id: doc.id, ...doc.data() }) };
  } catch (error) {
    console.error("Error fetching course details:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update the nested resources array of a course document
 */
export async function updateCourseResources(courseId, resources) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    await db.collection("courses").doc(courseId).update({
      resources,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/courses");
    revalidatePath(`/admin/courses/${courseId}/resources`);
    return { success: true };
  } catch (error) {
    console.error("Error updating course resources:", error);
    return { success: false, error: error.message };
  }
}
