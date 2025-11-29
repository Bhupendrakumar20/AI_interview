"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

const interviewQuestionsSchema = z.object({
  questions: z.array(z.string()),
});

// ✅ New: createInterview – generate questions + save to Firestore
export async function createInterview(params) {
  const { userId, role, company, difficulty, techstack = [], type } = params;

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: interviewQuestionsSchema,
      prompt: `
        You are an expert interview coach.
        Generate 5-7 interview questions for a mock interview.

        Role: ${role}
        Company: ${company}
        Difficulty: ${difficulty}
        Type: ${type || "Technical"}

        Mix behavioral and technical questions if relevant.
        Return only the questions as an array of strings.
      `,
      system:
        "You generate concise, realistic interview questions suitable for mock interviews.",
    });

    const questions = object.questions || [];

    const docRef = await db.collection("interviews").add({
      userId,
      role,
      company,
      level: difficulty,
      type: type || "Technical",
      techstack,
      finalized: true,
      questions,
      createdAt: new Date().toISOString(),
    });

    return { success: true, interviewId: docRef.id };
  } catch (error) {
    console.error("Error creating interview:", error);
    return { success: false, error: "Failed to create interview." };
  }
}

// ✅ Already existing: feedback generation
export async function createFeedback(params) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id) {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() || null;
}

export async function getFeedbackByInterviewId(params) {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() };
}

// ✅ Updated earlier: no inequality on Firestore side
export async function getLatestInterviews(params) {
  const { userId, limit = 20 } = params;

  const interviewsSnapshot = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const interviews = interviewsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Filter out current user's own interviews in JS
  return interviews.filter((interview) => interview.userId !== userId);
}

export async function getInterviewsByUserId(userId) {
  if (!userId) return [];

  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// ✅ For Analytics page
export async function getUserFeedbacks(userId) {
  if (!userId) return [];

  const snapshot = await db
    .collection("feedback")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
