"use server";

import { db } from "@/firebase/admin";
import * as admin from "firebase-admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

/**
 * Fetch predefined question bank based on role and domain
 * @param {Object} params - { role, domain, difficulty, limit }
 * @returns {Promise<{success: boolean, questions?: Array, generated?: boolean, error?: string}>}
 */
export async function fetchQuestionBank(params) {
  const { role, domain, difficulty, limit = 10 } = params;

  try {
    // Try to load from Firestore question bank
    const questionsSnapshot = await db
      .collection("questions")
      .where("role", "==", role)
      .where("domain", "==", domain)
      .where("difficulty", "==", difficulty)
      .limit(limit)
      .get();

    if (!questionsSnapshot.empty) {
      const questions = questionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return {
        success: true,
        questions: questions.map((q) => serializeFirebaseData(q)),
      };
    }

    // Fallback to generated questions
    return {
      success: true,
      questions: [],
      generated: true,
    };
  } catch (error) {
    console.error("Error fetching question bank:", error);
    return { success: false, error: "Failed to load questions" };
  }
}

/**
 * Save interview configuration to Firestore
 * @param {Object} params - { userId, config, questions }
 * @returns {Promise<{success: boolean, interviewId?: string, error?: string}>}
 */
export async function saveInterviewConfiguration(params) {
  const { userId, config, questions } = params;

  try {
    const interviewRef = await db.collection("users").doc(userId).collection("interviews").add({
      userId,
      role: config.role,
      domain: config.domain,
      experience: config.experience,
      difficulty: config.difficulty,
      techstack: config.techstack,
      questions,
      status: "setup_completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcripts: [],
      scores: null,
      feedback: null,
    });

    return {
      success: true,
      interviewId: interviewRef.id,
    };
  } catch (error) {
    console.error("Error saving interview config:", error);
    return { success: false, error: "Failed to save interview setup" };
  }
}

/**
 * Get saved interview configuration
 * @param {string} interviewId - Interview document ID
 * @returns {Promise<{success: boolean, config?: Object, error?: string}>}
 */
export async function getInterviewConfiguration(interviewId) {
  try {
    const query = await db.collectionGroup("interviews")
      .where(admin.firestore.FieldPath.documentId(), "==", interviewId)
      .limit(1)
      .get();

    if (query.empty) {
      return { success: false, error: "Interview not found" };
    }

    const doc = query.docs[0];

    const data = doc.data();
    return {
      success: true,
      config: serializeFirebaseData({
        id: doc.id,
        ...data,
      }),
    };
  } catch (error) {
    console.error("Error fetching interview config:", error);
    return { success: false, error: "Failed to fetch configuration" };
  }
}

/**
 * Update interview configuration
 * @param {string} interviewId - Interview document ID
 * @param {Object} updates - Partial configuration object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateInterviewConfiguration(interviewId, updates) {
  try {
    const query = await db.collectionGroup("interviews")
      .where(admin.firestore.FieldPath.documentId(), "==", interviewId)
      .limit(1)
      .get();

    if (query.empty) {
      return { success: false, error: "Interview not found" };
    }

    await query.docs[0].ref.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating interview config:", error);
    return { success: false, error: "Failed to update configuration" };
  }
}
