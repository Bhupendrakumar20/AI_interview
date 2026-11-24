"use server";

import { createHash } from "crypto";
import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";

const DAY_MILESTONES = [10, 50, 100];

function getAuthenticatedUserId(user) {
  return user && user.uid !== "dummy-user-id" ? user.id : null;
}

function getRewardProgress(completedDays, jobApplications, internshipApplications) {
  return [
    { id: "coding-10", title: "10-Day Coder", category: "Coding challenge", target: 10, progress: completedDays },
    { id: "coding-50", title: "Halfway Hero", category: "Coding challenge", target: 50, progress: completedDays },
    { id: "coding-100", title: "100 Days of Code", category: "Coding challenge", target: 100, progress: completedDays },
    { id: "jobs-10", title: "Career Starter", category: "Job applications", target: 10, progress: jobApplications },
    { id: "internships-10", title: "Internship Seeker", category: "Internship applications", target: 10, progress: internshipApplications },
  ].map((reward) => ({
    ...reward,
    progress: Math.min(reward.progress, reward.target),
    unlocked: reward.progress >= reward.target,
  }));
}

export async function getCodingChallengeProgress() {
  try {
    const user = await getCurrentUser();
    const userId = getAuthenticatedUserId(user);
    if (!userId) return { success: false, error: "Sign in to save challenge progress." };

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("challenge_progress")
      .doc("100-days-of-code")
      .get();
    const completedDays = Array.isArray(snapshot.data()?.completedDays)
      ? [...new Set(snapshot.data().completedDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 100))].sort((a, b) => a - b)
      : [];

    return { success: true, completedDays };
  } catch (error) {
    console.error("Failed to load coding challenge progress:", error);
    return { success: false, error: "Unable to load challenge progress." };
  }
}

export async function markCodingChallengeDayComplete(dayNumber) {
  try {
    const user = await getCurrentUser();
    const userId = getAuthenticatedUserId(user);
    if (!userId) return { success: false, error: "Sign in to save challenge progress." };
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 100) {
      return { success: false, error: "Choose a valid challenge day." };
    }

    const progressRef = db
      .collection("users")
      .doc(userId)
      .collection("challenge_progress")
      .doc("100-days-of-code");
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(progressRef);
      const existingDays = Array.isArray(snapshot.data()?.completedDays)
        ? snapshot.data().completedDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 100)
        : [];
      const previousCount = new Set(existingDays).size;
      const completedDays = [...new Set([...existingDays, dayNumber])].sort((a, b) => a - b);

      if (completedDays.length !== previousCount) {
        transaction.set(progressRef, {
          completedDays,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      return {
        completedDays,
        newlyUnlocked: DAY_MILESTONES.filter((milestone) => previousCount < milestone && completedDays.length >= milestone),
      };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error("Failed to save coding challenge progress:", error);
    return { success: false, error: "Unable to save challenge progress." };
  }
}

export async function trackApplicationIntent({ applicationType, listingId, title, company, applyUrl }) {
  try {
    const user = await getCurrentUser();
    const userId = getAuthenticatedUserId(user);
    if (!userId) return { success: false, error: "Sign in to track applications toward rewards." };
    if (!["job", "internship"].includes(applicationType) || typeof listingId !== "string" || !listingId.trim()) {
      return { success: false, error: "A valid application listing is required." };
    }

    const normalizedListingId = listingId.trim();
    const documentId = createHash("sha256")
      .update(`${applicationType}:${normalizedListingId}`)
      .digest("hex");
    const intentRef = db
      .collection("users")
      .doc(userId)
      .collection("application_intents")
      .doc(documentId);

    const created = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(intentRef);
      if (snapshot.exists) return false;
      transaction.create(intentRef, {
        applicationType,
        listingId: normalizedListingId,
        title: typeof title === "string" ? title.slice(0, 200) : "",
        company: typeof company === "string" ? company.slice(0, 200) : "",
        applyUrl: typeof applyUrl === "string" ? applyUrl.slice(0, 2000) : "",
        startedAt: new Date().toISOString(),
      });
      return true;
    });

    return { success: true, created };
  } catch (error) {
    console.error("Failed to track application:", error);
    return { success: false, error: "Unable to track this application." };
  }
}

export async function getProfileAchievements() {
  try {
    const user = await getCurrentUser();
    const userId = getAuthenticatedUserId(user);
    if (!userId) return { success: false, error: "Sign in to view rewards." };

    const userRef = db.collection("users").doc(userId);
    const [progressSnapshot, applicationsSnapshot, intentsSnapshot] = await Promise.all([
      userRef.collection("challenge_progress").doc("100-days-of-code").get(),
      db.collection("applications").where("userId", "==", userId).get(),
      userRef.collection("application_intents").get(),
    ]);

    const completedDays = Array.isArray(progressSnapshot.data()?.completedDays)
      ? new Set(progressSnapshot.data().completedDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 100)).size
      : 0;
    const internshipIds = new Set(
      applicationsSnapshot.docs
        .map((document) => document.data().internshipId)
        .filter((id) => typeof id === "string" && id.length > 0)
    );
    const jobIds = new Set();

    intentsSnapshot.docs.forEach((document) => {
      const intent = document.data();
      if (typeof intent.listingId !== "string" || !intent.listingId) return;
      if (intent.applicationType === "job") jobIds.add(intent.listingId);
      if (intent.applicationType === "internship") internshipIds.add(intent.listingId);
    });

    return {
      success: true,
      completedDays,
      jobApplications: jobIds.size,
      internshipApplications: internshipIds.size,
      rewards: getRewardProgress(completedDays, jobIds.size, internshipIds.size),
    };
  } catch (error) {
    console.error("Failed to load profile rewards:", error);
    return { success: false, error: "Unable to load profile rewards." };
  }
}
