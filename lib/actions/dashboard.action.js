// lib/actions/dashboard.action.js
"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "./auth.action";

export async function getUserApplications(userId) {
  if (!userId) return [];
  
  const snapshot = await db
    .collection("user_applications")
    .where("userId", "==", userId)
    .orderBy("appliedAt", "desc")
    .get();
    
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function saveApplication(applicationData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    const docRef = await db.collection("user_applications").add({
      ...applicationData,
      userId: user.id,
      appliedAt: new Date().toISOString(),
      status: "Applied"
    });
    
    return { success: true, applicationId: docRef.id };
  } catch (error) {
    console.error("Error saving application:", error);
    return { success: false, error: error.message };
  }
}

export async function getChallengeProgress(userId, challengeId) {
  const snapshot = await db
    .collection("user_progress")
    .where("userId", "==", userId)
    .where("challengeId", "==", challengeId)
    .limit(1)
    .get();
    
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function updateChallengeProgress(userId, challengeId, day) {
  try {
    const progress = await getChallengeProgress(userId, challengeId);
    
    if (!progress) {
      // First time enrollment
      await db.collection("user_progress").add({
        userId,
        challengeId,
        day: 1,
        completedDays: [1],
        currentStreak: 1,
        longestStreak: 1,
        totalPoints: 10,
        enrolledAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      });
    } else {
      // Update existing progress
      const completedDays = [...new Set([...progress.completedDays, day])];
      const currentStreak = calculateStreak(completedDays);
      
      await db.collection("user_progress").doc(progress.id).update({
        day,
        completedDays,
        currentStreak,
        longestStreak: Math.max(progress.longestStreak, currentStreak),
        totalPoints: progress.totalPoints + 10,
        lastActive: new Date().toISOString()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating progress:", error);
    return { success: false, error: error.message };
  }
}

function calculateStreak(completedDays) {
  // Simple streak calculation - assumes consecutive days
  completedDays.sort((a, b) => a - b);
  let streak = 1;
  
  for (let i = 1; i < completedDays.length; i++) {
    if (completedDays[i] === completedDays[i - 1] + 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}