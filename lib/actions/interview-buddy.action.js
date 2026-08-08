"use server";

import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

/**
 * Generate a unique session code (e.g., IB-7X4K9)
 */
function generateSessionCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "IB-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Ensures session code is unique in database
 * Generates new codes until finding one that doesn't exist
 */
async function generateUniqueSessionCode() {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = generateSessionCode();
    
    // Check if code already exists
    const existingSession = await db
      .collectionGroup("interview_buddy_sessions")
      .where("sessionCode", "==", code)
      .limit(1)
      .get();
    
    isUnique = existingSession.empty;
    attempts++;
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique session code after multiple attempts");
  }

  return code;
}

/**
 * Create a new Interview Buddy session
 */
export async function createInterviewBuddySession({
  userId,
  mode = "ai", // 'ai' or 'human'
  persona = "hiring-manager", // for AI mode
  topics = [],
  difficulty = "medium",
  duration = 30,
  jobDescription = null,
}) {
  if (!userId) throw new Error("User ID is required");

  try {
    // 🔥 Generate UNIQUE session code - ensures no two sessions have same code
    const sessionCode = mode === "human" ? await generateUniqueSessionCode() : null;

    const sessionRef = await db.collection("users").doc(userId).collection("interview_buddy_sessions").add({
      createdBy: userId,
      mode,
      persona,
      topics,
      difficulty,
      duration,
      jobDescription,
      sessionCode,
      status: "created", // created, in-progress, completed
      startTime: null,
      endTime: null,
      participants: [userId],
      score: null,
      feedback: null,
      recordingUrl: null,
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      sessionId: sessionRef.id,
      sessionCode,
      success: true,
    };
  } catch (error) {
    console.error("Error creating interview buddy session:", error);
    throw error;
  }
}

/**
 * Join a human buddy session with session code
 */
export async function joinInterviewBuddySession({
  userId,
  sessionCode,
}) {
  if (!userId || !sessionCode) {
    throw new Error("User ID and session code are required");
  }

  try {
    const query = await db
      .collectionGroup("interview_buddy_sessions")
      .where("sessionCode", "==", sessionCode)
      .limit(1)
      .get();

    if (query.empty) {
      throw new Error("Invalid or expired session code");
    }

    const sessionDoc = query.docs[0];
    const sessionData = sessionDoc.data();

    // Check if session is expired (24 hours)
    const createdAt = sessionData.createdAt?.toDate?.() || new Date(sessionData.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    if (new Date() > expiresAt) {
      throw new Error("Session code has expired");
    }

    // Check if session is full (max 2 participants for human mode)
    if (sessionData.participants?.length >= 2) {
      throw new Error("Session is full");
    }

    // Add user to participants
    const updatedParticipants = [...(sessionData.participants || []), userId];

    await sessionDoc.ref.update({
      participants: updatedParticipants,
      updatedAt: new Date(),
      status: updatedParticipants.length === 2 ? "in-progress" : "created",
    });

    return {
      sessionId: sessionDoc.id,
      sessionCode,
      participants: updatedParticipants,
      success: true,
    };
  } catch (error) {
    console.error("Error joining interview buddy session:", error);
    throw error;
  }
}

/**
 * Get user's interview buddy sessions
 */
export async function getUserInterviewBuddySessions(userId) {
  if (!userId) throw new Error("User ID is required");

  try {
    const query = await db
      .collectionGroup("interview_buddy_sessions")
      .where("participants", "array-contains", userId)
      .orderBy("createdAt", "desc")
      .get();

    const sessions = query.docs.map((doc) => ({
      id: doc.id,
      ...serializeFirebaseData(doc.data()),
    }));

    return sessions;
  } catch (error) {
    console.error("Error getting interview buddy sessions:", error);
    throw error;
  }
}

/**
 * Get single session details
 */
export async function getInterviewBuddySessionDetails(sessionId) {
  if (!sessionId) throw new Error("Session ID is required");

  try {
    const query = await db.collectionGroup("interview_buddy_sessions")
      .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
      .limit(1)
      .get();

    if (query.empty) {
      throw new Error("Session not found");
    }

    const doc = query.docs[0];

    return {
      id: doc.id,
      ...serializeFirebaseData(doc.data()),
    };
  } catch (error) {
    console.error("Error getting session details:", error);
    throw error;
  }
}

/**
 * Update session (start, end, save results)
 */
export async function updateInterviewBuddySession({
  sessionId,
  status,
  score,
  feedback,
  recordingUrl,
  transcriptUrl,
}) {
  if (!sessionId) throw new Error("Session ID is required");

  try {
    const updateData = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (status === "in-progress") {
        updateData.startTime = new Date();
      } else if (status === "completed") {
        updateData.endTime = new Date();
      }
    }

    if (score !== undefined) updateData.score = score;
    if (feedback) updateData.feedback = feedback;
    if (recordingUrl) updateData.recordingUrl = recordingUrl;
    if (transcriptUrl) updateData.transcriptUrl = transcriptUrl;

    const query = await db.collectionGroup("interview_buddy_sessions")
      .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
      .limit(1)
      .get();

    if (query.empty) {
      throw new Error("Session not found");
    }

    await query.docs[0].ref.update(updateData);

    return { success: true };
  } catch (error) {
    console.error("Error updating interview buddy session:", error);
    throw error;
  }
}

/**
 * Get Interview Buddy user statistics
 */
export async function getInterviewBuddyStats(userId) {
  if (!userId) throw new Error("User ID is required");

  try {
    const sessions = await getUserInterviewBuddySessions(userId);

    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === "completed").length,
      avgScore: 0,
      totalPracticeTime: 0,
      topicsCovered: new Set(),
      sessionsByMode: {
        human: 0,
        ai: 0,
      },
      sessionsByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0,
      },
    };

    let totalScore = 0;
    let scoredSessions = 0;

    sessions.forEach((session) => {
      // Count by mode
      if (session.mode === "human") stats.sessionsByMode.human++;
      else if (session.mode === "ai") stats.sessionsByMode.ai++;

      // Count by difficulty
      if (session.difficulty) {
        stats.sessionsByDifficulty[session.difficulty]++;
      }

      // Collect topics
      if (session.topics && Array.isArray(session.topics)) {
        session.topics.forEach((topic) => stats.topicsCovered.add(topic));
      }

      // Calculate total practice time
      if (session.duration) {
        stats.totalPracticeTime += session.duration;
      }

      // Calculate average score
      if (session.score !== null && session.score !== undefined) {
        totalScore += session.score;
        scoredSessions++;
      }
    });

    stats.topicsCovered = Array.from(stats.topicsCovered);
    stats.avgScore = scoredSessions > 0 ? Math.round(totalScore / scoredSessions) : 0;

    return stats;
  } catch (error) {
    console.error("Error getting interview buddy stats:", error);
    throw error;
  }
}

/**
 * Delete a session (only creator can delete)
 */
export async function deleteInterviewBuddySession(sessionId, userId) {
  if (!sessionId || !userId) {
    throw new Error("Session ID and User ID are required");
  }

  try {
    const query = await db.collectionGroup("interview_buddy_sessions")
      .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
      .limit(1)
      .get();

    if (query.empty) {
      throw new Error("Session not found");
    }

    const doc = query.docs[0];

    const sessionData = doc.data();

    // Only creator can delete
    if (sessionData.createdBy !== userId) {
      throw new Error("Only session creator can delete the session");
    }

    await doc.ref.delete();

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview buddy session:", error);
    throw error;
  }
}
