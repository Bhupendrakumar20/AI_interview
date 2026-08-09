"use server";

import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

/**
 * Fetch user profile
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, profile?: Object, error?: string}>}
 */
export async function fetchUserProfile(userId) {
  try {
    const doc = await db.collection("users").doc(userId).get();

    if (!doc.exists) {
      return { success: false, error: "User not found" };
    }

    const profile = serializeFirebaseData({
      id: doc.id,
      ...doc.data(),
    });

    return { success: true, profile };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

/**
 * Fetch user's interview history (all interviews)
 * @param {string} userId - User ID
 * @param {number} limit - Max number of interviews to fetch
 * @returns {Promise<{success: boolean, interviews?: Array, error?: string}>}
 */
export async function fetchInterviewHistory(userId, limit = 50) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("interviews")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return { success: true, interviews: [] };
    }

    const interviews = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        domain: data.domain,
        difficulty: data.difficulty,
        completedAt: data.completedAt,
        score: data.scores?.normalized,
        status: data.status,
      };
    });

    return {
      success: true,
      interviews: interviews.map((i) => serializeFirebaseData(i)),
    };
  } catch (error) {
    console.error("Error fetching interview history:", error);
    return { success: false, error: "Failed to fetch history", interviews: [] };
  }
}

/**
 * Fetch recent interviews (for dashboard quick view)
 * @param {string} userId - User ID
 * @param {number} limit - Max number of recent interviews
 * @returns {Promise<{success: boolean, interviews?: Array, error?: string}>}
 */
export async function fetchRecentInterviews(userId, limit = 5) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("interviews")
      .where("status", "==", "feedback_generated")
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return { success: true, interviews: [] };
    }

    const interviews = snapshot.docs.map((doc) => {
      const data = doc.data();
      return serializeFirebaseData({
        id: doc.id,
        role: data.role,
        domain: data.domain,
        completedAt: data.completedAt,
        score: data.scores?.normalized,
      });
    });

    return { success: true, interviews };
  } catch (error) {
    console.error("Error fetching recent interviews:", error);
    return { success: false, error: "Failed to fetch recent interviews" };
  }
}

/**
 * Calculate progress metrics (total interviews, average score, trends)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Progress metrics
 */
export async function calculateProgressMetrics(userId) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("interviews")
      .where("status", "==", "feedback_generated")
      .orderBy("completedAt", "desc")
      .limit(20)
      .get();

    if (snapshot.empty) {
      return {
        totalInterviews: 0,
        averageScore: 0,
        improvementTrend: "stable",
        recentScores: [],
      };
    }

    const interviews = snapshot.docs.map((doc) => doc.data());
    const scores = interviews
      .map((i) => i.scores?.normalized || 0)
      .filter((s) => s > 0);

    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;

    // Determine trend
    let trend = "stable";
    if (scores.length > 1) {
      const recentAvg = scores.slice(0, 5).reduce((a, b) => a + b) / Math.max(1, Math.min(5, scores.length));
      const olderScores = scores.slice(5, 10);
      const olderAvg = olderScores.length > 0 
        ? olderScores.reduce((a, b) => a + b) / olderScores.length
        : recentAvg;
      
      if (recentAvg > olderAvg * 1.1) trend = "up";
      else if (recentAvg < olderAvg * 0.9) trend = "down";
    }

    return {
      totalInterviews: interviews.length,
      averageScore: Math.round(averageScore * 10) / 10,
      improvementTrend: trend,
      recentScores: scores.slice(0, 10),
    };
  } catch (error) {
    console.error("Error calculating metrics:", error);
    return {
      totalInterviews: 0,
      averageScore: 0,
      improvementTrend: "stable",
      recentScores: [],
    };
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates (partial)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUserProfile(userId, updates) {
  try {
    await db.collection("users").doc(userId).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Get complete dashboard summary
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, profile?: Object, recentInterviews?: Array, metrics?: Object, error?: string}>}
 */
export async function getDashboardSummary(userId) {
  try {
    const [profileResult, historyResult, metricsData] = await Promise.all([
      fetchUserProfile(userId),
      fetchRecentInterviews(userId),
      calculateProgressMetrics(userId),
    ]);

    if (!profileResult.success) {
      return { success: false, error: "Failed to fetch dashboard data" };
    }

    return {
      success: true,
      profile: profileResult.profile,
      recentInterviews: historyResult.interviews || [],
      metrics: metricsData,
    };
  } catch (error) {
    console.error("Error getting dashboard summary:", error);
    return {
      success: false,
      error: "Failed to load dashboard",
    };
  }
}
