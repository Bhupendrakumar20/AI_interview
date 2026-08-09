"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { revalidatePath } from "next/cache";

/**
 * Fetch all courses and resources from Firestore
 */
export async function getCourses() {
  try {
    const snapshot = await db.collection("courses").get();
    const courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, courses: serializeFirebaseData(courses) };
  } catch (error) {
    console.error("Error fetching courses:", error);
    return { success: false, error: error.message, courses: [] };
  }
}

/**
 * Get user progress for completed resources and courses
 */
export async function getUserProgress() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", progress: {} };
    }

    const doc = await db.collection("users").doc(user.uid).collection("courseProgress").doc("progress").get();
    if (!doc.exists) {
      return { success: true, progress: {} };
    }

    return { success: true, progress: serializeFirebaseData(doc.data()) };
  } catch (error) {
    console.error("Error fetching user progress:", error);
    return { success: false, error: error.message, progress: {} };
  }
}

/**
 * Update user progress for a specific resource
 */
export async function updateUserProgress(courseId, resourceName, completed) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const docRef = db.collection("users").doc(user.uid).collection("courseProgress").doc("progress");
    const doc = await docRef.get();
    let currentProgress = doc.exists ? doc.data() : {};

    if (!currentProgress[courseId]) {
      currentProgress[courseId] = {
        completedResources: [],
        completed: false,
      };
    }

    let completedResources = currentProgress[courseId].completedResources || [];
    if (completed) {
      if (!completedResources.includes(resourceName)) {
        completedResources.push(resourceName);
      }
    } else {
      completedResources = completedResources.filter((r) => r !== resourceName);
    }

    currentProgress[courseId].completedResources = completedResources;

    // Check if all resources for this course are completed to mark course as completed
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (courseDoc.exists) {
      const courseData = courseDoc.data();
      const totalResources = courseData.resources?.length || 0;
      if (completedResources.length >= totalResources && totalResources > 0) {
        currentProgress[courseId].completed = true;
      } else {
        currentProgress[courseId].completed = false;
      }
    }

    await docRef.set(currentProgress, { merge: true });
    revalidatePath("/courses");
    return { success: true, progress: serializeFirebaseData(currentProgress) };
  } catch (error) {
    console.error("Error updating user progress:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch list of certificates for the current user
 */
export async function getUserCertificates() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", certificates: [] };
    }

    const snapshot = await db.collection("users").doc(user.uid).collection("certificates").get();
    const certificates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, certificates: serializeFirebaseData(certificates) };
  } catch (error) {
    console.error("Error fetching user certificates:", error);
    return { success: false, error: error.message, certificates: [] };
  }
}

/**
 * Generate a new certificate for a completed course
 */
export async function generateCertificate(courseId, courseTitle) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify course is actually completed
    const progressDoc = await db.collection("users").doc(user.uid).collection("courseProgress").doc("progress").get();
    const progress = progressDoc.exists ? progressDoc.data() : {};
    
    if (!progress[courseId] || !progress[courseId].completed) {
      return { success: false, error: "Course is not fully completed yet." };
    }

    // Check if certificate already exists
    const certDoc = await db.collection("users").doc(user.uid).collection("certificates").doc(courseId).get();
    if (certDoc.exists) {
      return { success: true, certificate: serializeFirebaseData({ id: certDoc.id, ...certDoc.data() }), message: "Certificate already generated" };
    }

    const certificate = {
      courseId,
      courseTitle,
      recipientName: user.name || user.email.split("@")[0],
      recipientEmail: user.email,
      issueDate: new Date().toISOString(),
      certificateId: `PW-${courseId.toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    };

    await db.collection("users").doc(user.uid).collection("certificates").doc(courseId).set(certificate);
    
    // Also log this in system logs or admin metrics
    await db.collection("system").doc("certificates_logs").collection("logs").add({
      userId: user.uid,
      courseId,
      certificateId: certificate.certificateId,
      issuedAt: new Date().toISOString(),
    });

    revalidatePath("/courses");
    return { success: true, certificate };
  } catch (error) {
    console.error("Error generating certificate:", error);
    return { success: false, error: error.message };
  }
}
