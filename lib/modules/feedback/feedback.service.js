"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { db } from "@/firebase/admin";

/**
 * Generate personalized next steps based on performance
 * @param {number} score - Interview score 0-10
 * @param {string} degree - Education level
 * @returns {Array<string>} - Personalized next steps
 */
function generateNextSteps(score, degree) {
  const steps = [];

  if (score >= 8) {
    steps.push("Congratulations on your excellent performance!");
    steps.push("Consider challenging yourself with harder interview questions");
    steps.push("Focus on mock interviews with real interviewers");
  } else if (score >= 6) {
    steps.push("Good effort! Review the weak areas identified");
    steps.push("Practice more problems in your challenge areas");
    steps.push("Record yourself answering questions to improve delivery");
  } else {
    steps.push("Don't get discouraged - improvement takes practice");
    steps.push(
      "Focus on understanding concepts deeply before practicing questions"
    );
    steps.push("Consider reviewing fundamentals in your weak areas");
  }

  if (degree === "undergraduate") {
    steps.push("Take advantage of CS internship opportunities");
  } else if (degree === "professional") {
    steps.push("Highlight your production experience in future interviews");
  }

  return steps;
}

/**
 * Generate structured feedback from interview transcript and scores
 * @param {Object} params - { transcripts, scores, degree, targetRole }
 * @returns {Promise<Object>} - Structured feedback
 */
export async function generateStructuredFeedback(params) {
  const { transcripts, scores, degree, targetRole } = params;

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: z.object({
        strengths: z.array(
          z.object({
            category: z.string(),
            description: z.string(),
            examples: z.array(z.string()),
          })
        ),
        weaknesses: z.array(
          z.object({
            category: z.string(),
            description: z.string(),
            impact: z.string(),
            priority: z.enum(["high", "medium", "low"]),
          })
        ),
        suggestions: z.array(
          z.object({
            area: z.string(),
            action: z.string(),
            expectedImprovement: z.string(),
          })
        ),
        summary: z.string(),
      }),
      prompt: `Generate comprehensive interview feedback based on the following:

Questions and Answers:
${transcripts.map((t, i) => `Q${i + 1}: ${t.question}\nA: ${t.answer}`).join("\n\n")}

Scores:
- Technical: ${scores.technicalScore}/10
- Communication: ${scores.communicationScore}/10
- Confidence: ${scores.confidenceScore}/10
- Overall: ${scores.normalizedScore}/10

Candidate Profile:
- Education: ${degree}
- Target Role: ${targetRole || "General"}

Provide structured feedback with:
1. Strengths: 2-3 key strengths with examples
2. Weaknesses: 2-3 areas for improvement with impact
3. Suggestions: 3-4 actionable recommendations
4. Summary: One-paragraph overall assessment

Return valid JSON with all required fields.`,
    });

    const nextSteps = generateNextSteps(scores.normalizedScore, degree);

    return {
      strengths: object.strengths,
      weaknesses: object.weaknesses,
      suggestions: object.suggestions,
      summary: object.summary,
      nextSteps,
    };
  } catch (error) {
    console.error("Error generating feedback:", error);
    throw error;
  }
}

/**
 * Persist feedback to Firestore
 * @param {Object} params - { interviewId, userId, feedback, scores, transcripts }
 * @returns {Promise<{success: boolean, feedbackId?: string, error?: string}>}
 */
export async function persistFeedback(params) {
  const { interviewId, userId, feedback, scores, transcripts } = params;

  try {
    await db.collection("interviews").doc(interviewId).update({
      feedback: {
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        suggestions: feedback.suggestions,
        summary: feedback.summary,
        nextSteps: feedback.nextSteps,
        generatedAt: new Date().toISOString(),
      },
      scores: {
        technical: scores.technicalScore,
        communication: scores.communicationScore,
        confidence: scores.confidenceScore,
        weighted: scores.weightedScore,
        normalized: scores.normalizedScore,
        breakdown: scores.breakdown,
      },
      status: "feedback_generated",
      completedAt: new Date().toISOString(),
    });

    // Also create feedback document
    const feedbackDocId = `${userId}_${Date.now()}`;
    await db.collection("user_feedback").doc(feedbackDocId).set({
      userId,
      interviewId,
      feedback,
      scores,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      feedbackId: feedbackDocId,
    };
  } catch (error) {
    console.error("Error persisting feedback:", error);
    return {
      success: false,
      error: "Failed to save feedback",
    };
  }
}

/**
 * Fetch feedback for an interview
 * @param {string} interviewId - Interview document ID
 * @returns {Promise<{success: boolean, feedback?: Object, scores?: Object, transcripts?: Array}>}
 */
export async function fetchInterviewFeedback(interviewId) {
  try {
    const doc = await db.collection("interviews").doc(interviewId).get();

    if (!doc.exists) {
      return { success: false, error: "Interview not found" };
    }

    const data = doc.data();
    return {
      success: true,
      feedback: data?.feedback,
      scores: data?.scores,
      transcripts: data?.transcripts,
    };
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return { success: false, error: "Failed to fetch feedback" };
  }
}

/**
 * Load feedback JSON for display
 * @param {string} interviewId - Interview document ID
 * @returns {Promise<Object|null>} - Feedback JSON structure
 */
export async function loadFeedbackJSON(interviewId) {
  try {
    const doc = await db.collection("interviews").doc(interviewId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      feedback: data?.feedback,
      scores: data?.scores,
      role: data?.role,
      domain: data?.domain,
      completedAt: data?.completedAt,
    };
  } catch (error) {
    console.error("Error loading feedback JSON:", error);
    return null;
  }
}
