"use server";

import { unstable_cache, revalidatePath, revalidateTag, updateTag } from "next/cache";
import { generateObject, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import * as admin from "firebase-admin";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  finishInterviewModeSession,
  startInterviewModeSession,
} from "@/lib/modules/interview-session.service";
import { getCachedData, setCachedData, generateCacheKey } from "@/lib/cache-helpers";
import { FALLBACK_INTERVIEW_QUESTIONS, FALLBACK_FEEDBACK, FALLBACK_MOCK_TEST_QUESTIONS } from "@/lib/fallback-data";
import { withRateLimit } from "@/lib/rate-limiter";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY;

// Official AI SDK Google Provider instance
const google = createGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY,
});

// 🎯 1. Supported models
const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "llama-3.3-70b-versatile",
];

// 🛠️ 2. Helper for generateObject with Fallback Loop + Rate Limiting
async function generateObjectWithFallback(options, userId = "anonymous") {
  let lastError;

  // Try with structured outputs first
  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName} with structured outputs...`);
      
      // Use rate limiter to prevent 429 errors (with per-user tracking & correct model limits)
      const result = await withRateLimit(
        async () => {
          return await generateObject({
            model: google(modelName, {
              useStructuredOutputs: true,
            }),
            ...options,
          });
        },
        `generateObject(${modelName}, structured=true)`,
        userId,
        { 
          model: modelName,
          prompt: options.prompt 
        }
      );
      
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const msg = error.message || error.toString();
      if (msg.includes("429") || msg.includes("TooManyRequests") || msg.includes("quota")) {
        console.warn(`⚠️ Model ${modelName} - RATE LIMIT OR QUOTA EXCEEDED.`);
        console.warn(`💡 Free tier: 15 requests/minute. Upgrade at https://ai.google.dev/pricing`);
        throw new Error("API rate limit exceeded. The system is now queuing requests to respect the 15 requests/minute free tier limit. Upgrade your plan for higher limits.");
      }
      console.warn(`⚠️ Model ${modelName} with structured outputs failed: ${msg}`);
      lastError = error;
    }
  }

  // Fallback: try without structured outputs
  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName} without structured outputs...`);
      
      const result = await withRateLimit(
        async () => {
          return await generateObject({
            model: google(modelName, {
              useStructuredOutputs: false,
            }),
            ...options,
          });
        },
        `generateObject(${modelName}, structured=false)`,
        userId,
        { 
          model: modelName,
          prompt: options.prompt 
        }
      );
      
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const msg = error.message || error.toString();
      if (msg.includes("429") || msg.includes("TooManyRequests") || msg.includes("quota")) {
        throw new Error("API rate limit exceeded. Please upgrade your Google AI plan.");
      }
      console.warn(`⚠️ Model ${modelName} without structured outputs failed: ${msg}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All fallback models failed.");
}

// 🛠️ 3. Helper for generateText with Fallback Loop + Rate Limiting
async function generateTextWithFallback(options, userId = "anonymous") {
  let lastError;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying text generation with model: ${modelName}...`);
      
      const result = await withRateLimit(
        async () => {
          return await generateText({
            model: google(modelName),
            ...options,
          });
        },
        `generateText(${modelName})`,
        userId,
        { 
          model: modelName,
          prompt: options.prompt 
        }
      );
      
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const msg = error.message || error.toString();
      if (msg.includes("429") || msg.includes("TooManyRequests")) {
        console.warn(`⚠️ Model ${modelName} - Rate limit exceeded. Using exponential backoff...`);
        throw new Error("API rate limit exceeded. Requests are being queued.");
      }
      console.warn(`⚠️ Model ${modelName} failed: ${msg}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All fallback models failed for text generation.");
}

const interviewQuestionsSchema = z.object({
  questions: z.array(z.string()),
});

export async function createInterview(params) {
  const { userId, role, company, difficulty, techstack = [], type } = params;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id === "dummy-user-id" || currentUser.id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Generate cache key
    const cacheKey = generateCacheKey("interview", { role, company, difficulty, type });
    
    // Check if cached
    let questions = getCachedData(cacheKey);
    
    if (!questions) {
      try {
        const { object } = await generateObjectWithFallback({
          schema: interviewQuestionsSchema,
          prompt: `
            You are an expert interview coach.
            Generate 5-7 interview questions for a mock interview.

            Role: ${role}
            Company: ${company}
            Difficulty: ${difficulty}
            Type: ${type || "Technical"}

            Rules:
            - Questions must be realistic and concise.
            - Mix behavioral and technical questions when relevant.
            - If the role is related to software engineering / developer / SDE:
              * Include at least 2 algorithm or data structure coding questions.
              * These should feel like real LeetCode-style technical screen questions.
            - Return only plain text questions, no numbering, no extra commentary.
          `,
          system:
            "You generate concise, realistic interview questions suitable for mock interviews.",
        }, userId);

        questions = object.questions || [];
        
        // Cache the result
        setCachedData(cacheKey, questions);
      } catch (apiError) {
        console.error("API call failed, using fallback data:", apiError);
        
        // Use fallback data
        const roleKey = Object.keys(FALLBACK_INTERVIEW_QUESTIONS).find(
          key => role.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(role.toLowerCase())
        ) || "Software Engineer";
        
        const difficultyKey = difficulty && FALLBACK_INTERVIEW_QUESTIONS[roleKey][difficulty] 
          ? difficulty 
          : "Medium";
        
        questions = FALLBACK_INTERVIEW_QUESTIONS[roleKey][difficultyKey];
        
        // Cache the fallback data too
        setCachedData(cacheKey, questions);
      }
    }

    const interviewRef = db
      .collection("users")
      .doc(userId)
      .collection("interviews")
      .doc();
    await startInterviewModeSession({
      userId,
      mode: "mock-interview",
      sessionId: interviewRef.id,
      resourceId: interviewRef.path,
      details: { role, company, difficulty, type: type || "Technical" },
    });

    try {
      await interviewRef.set({
        userId,
        role,
        company,
        level: difficulty,
        type: type || "Technical",
        techstack,
        finalized: true,
        questions,
        status: "in_progress",
        threadId: interviewRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (writeError) {
      try {
        await finishInterviewModeSession({
          userId,
          sessionId: interviewRef.id,
          status: "abandoned",
        });
      } catch (cleanupError) {
        console.error("Failed to release interview session after write failure:", cleanupError);
      }
      throw writeError;
    }

    return { success: true, interviewId: interviewRef.id };
  } catch (error) {
    console.error("Error creating interview:", error);
    const errorMessage = error?.message || "Failed to create interview";
    
    // Check if it's a quota issue
    if (errorMessage.includes("quota") || errorMessage.includes("429")) {
      return { 
        success: false, 
        error: "API quota exceeded. Your Google AI Studio free plan limit has been reached. Please upgrade your plan at https://ai.google.dev/pricing" 
      };
    }
    
    // Check if it's an API key issue
    if (errorMessage.includes("API key") || errorMessage.includes("403")) {
      return { success: false, error: "API key issue - check GOOGLE_GENERATIVE_AI_API_KEY configuration" };
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function createFeedback(params) {
  const {
    interviewId,
    userId,
    transcript = [],
    feedbackId,
    isCompleted,
    quitAtQuestion,
    answeredCount,
    totalQuestions,
  } = params;

  // Analyze transcript to resolve completion details
  const systemQuestions = (transcript || []).filter((s) => s.role === "system");
  const userAnswers = (transcript || []).filter(
    (s) =>
      s.role === "user" &&
      s.content &&
      s.content.trim().length > 0 &&
      !s.content.includes("[Candidate exited") &&
      !s.content.includes("[Interview exited") &&
      !s.content.includes("[No answer")
  );

  const resolvedTotal = totalQuestions ?? (systemQuestions.length || 5);
  const resolvedAnswered = answeredCount ?? userAnswers.length;
  const resolvedIsCompleted =
    isCompleted !== undefined
      ? Boolean(isCompleted)
      : resolvedTotal > 0 && resolvedAnswered >= resolvedTotal;
  const resolvedQuitAt =
    quitAtQuestion ??
    (!resolvedIsCompleted ? (resolvedAnswered > 0 ? resolvedAnswered + 1 : 1) : null);

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.id === "dummy-user-id" || currentUser.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  console.log("🎯 [createFeedback] Starting feedback generation");
  console.log(`  - interviewId: ${interviewId}`);
  console.log(`  - userId: ${userId}`);
  console.log(`  - transcript length: ${transcript?.length || 0}`);
  console.log(`  - isCompleted: ${resolvedIsCompleted}`);
  console.log(`  - answered: ${resolvedAnswered}/${resolvedTotal}`);
  console.log(`  - quitAtQuestion: ${resolvedQuitAt}`);
  console.log(`  - feedbackId: ${feedbackId || "new"}`);

  // Check API Key early
  if (!GEMINI_API_KEY) {
    console.error("❌ [createFeedback] GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    return {
      success: false,
      error: "API key not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in environment",
    };
  }

  console.log("✅ [createFeedback] API Key found in environment");

  try {
    const transcriptHash = `${transcript.length}_${resolvedAnswered}_${resolvedIsCompleted}`;
    const cacheKey = generateCacheKey("feedback", { interviewId, transcriptHash });

    let feedbackData = getCachedData(cacheKey);

    if (feedbackData) {
      console.log("✅ [createFeedback] Using cached feedback");
    }

    if (!feedbackData) {
      try {
        const formattedTranscript = transcript
          .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
          .join("");

        console.log("🤖 [createFeedback] Calling Gemini API...");
        console.log(`  - Model: gemini-2.0-flash`);
        console.log(`  - Structured outputs: enabled`);
        console.log(`  - isCompleted: ${resolvedIsCompleted}`);
        console.log(`  - answered: ${resolvedAnswered}/${resolvedTotal}`);

        const promptText = resolvedIsCompleted
          ? `You are an expert, constructive technical interviewer. Evaluate this candidate who completed all ${resolvedTotal} questions in the mock interview:

Interview Transcript:
${formattedTranscript}

SCORE 0-100 on these 5 areas in this exact order (calculate average as totalScore):
1. Communication Skills - Clarity of explanation and articulation of thoughts.
2. Technical Knowledge - Core technical concepts correctness and accuracy.
3. Problem Solving - Systematic approach and analytical thinking.
4. Cultural Fit - Adaptability, teamwork, and growth mindset.
5. Confidence and Clarity - Appropriate confidence level and clear delivery.

RULES: Technical correctness is PRIMARY. Wrong answers stay wrong even if well-explained.

Return: totalScore (average 0-100), categoryScores (array of 5 objects matching the names above), strengths (array of 3-5 strings), areasForImprovement (array of 2-4 strings), finalAssessment (detailed, encouraging yet constructive summary paragraph).`
          : `You are an expert, constructive technical interviewer. Evaluate this candidate who exited the mock interview early:
- Total questions in interview: ${resolvedTotal}
- Questions attempted/answered: ${resolvedAnswered}
- Candidate exited at Question: ${resolvedQuitAt || resolvedAnswered + 1}

Interview Transcript:
${formattedTranscript}

CRITICAL SCORING INSTRUCTIONS FOR EARLY EXIT:
- The candidate quit early before completing all questions.
- Score ONLY the answers the candidate actually provided for the questions they attempted.
- DO NOT penalize them or give 0s for questions that were unreached/skipped due to early exit.
- Evaluate the attempted answers fairly on the 5 areas: Communication Skills, Technical Knowledge, Problem Solving, Cultural Fit, Confidence and Clarity.
- Provide a fair, proportionate score (0-100) reflecting their actual performance on the attempted questions.
- In finalAssessment, start explicitly with: "Interview exited early at Question ${resolvedQuitAt || resolvedAnswered + 1} (${resolvedAnswered}/${resolvedTotal} questions answered)." followed by a clear, constructive review of the answers provided and actionable tips for when they retake/complete the interview.

Return: totalScore (average 0-100 of attempted questions), categoryScores (array of 5 objects matching the names above), strengths (array of strings from attempted answers), areasForImprovement (array of strings), finalAssessment (text summary mentioning early exit at Question ${resolvedQuitAt || resolvedAnswered + 1}).`;

        const { object } = await generateObjectWithFallback({
          schema: feedbackSchema,
          prompt: promptText,
          system:
            "You evaluate mock interviews. Be constructive, fair, and professional. Return a valid JSON matching the schema.",
        }, userId);

        console.log("✅ [createFeedback] Gemini API call successful");
        console.log(`  - Total Score: ${object.totalScore}`);
        console.log(`  - Category Scores: ${object.categoryScores?.length || 0} items`);
        console.log(`  - Category First Name: ${object.categoryScores?.[0]?.name}`);

        feedbackData = {
          totalScore: object.totalScore,
          categoryScores: object.categoryScores,
          strengths: object.strengths,
          areasForImprovement: object.areasForImprovement,
          finalAssessment: object.finalAssessment,
        };

        // Cache the result
        setCachedData(cacheKey, feedbackData);
        console.log("✅ [createFeedback] Feedback cached");
      } catch (apiError) {
        console.error("❌ [createFeedback] API call failed:", apiError.message);

        // Use fallback feedback
        feedbackData = {
          totalScore: resolvedIsCompleted ? FALLBACK_FEEDBACK.totalScore : 70,
          categoryScores: [
            {
              name: "Communication Skills",
              score: resolvedIsCompleted ? FALLBACK_FEEDBACK.communicationSkills : 72,
              comment: "Clear articulation on answered questions",
            },
            {
              name: "Technical Knowledge",
              score: resolvedIsCompleted ? FALLBACK_FEEDBACK.technicalKnowledge : 70,
              comment: "Demonstrated fundamental understanding of attempted topics",
            },
            {
              name: "Problem Solving",
              score: resolvedIsCompleted ? FALLBACK_FEEDBACK.problemSolving : 68,
              comment: "Logical approach to problems answered",
            },
            {
              name: "Cultural Fit",
              score: resolvedIsCompleted ? FALLBACK_FEEDBACK.culturalFit : 75,
              comment: "Demonstrates positive attitude and alignment with engineering practices",
            },
            {
              name: "Confidence and Clarity",
              score: resolvedIsCompleted ? FALLBACK_FEEDBACK.confidenceClarity : 70,
              comment: "Expresses answers clearly and confidently",
            },
          ],
          strengths: FALLBACK_FEEDBACK.strengths,
          areasForImprovement: FALLBACK_FEEDBACK.areasForImprovement,
          finalAssessment: resolvedIsCompleted
            ? FALLBACK_FEEDBACK.finalAssessment
            : `Interview exited early at Question ${resolvedQuitAt || 1} (${resolvedAnswered}/${resolvedTotal} questions answered). Good effort on the attempted questions. Retake to complete all questions.`,
        };

        console.log("⚠️ [createFeedback] Using fallback feedback due to API error");
        setCachedData(cacheKey, feedbackData);
      }
    }

    // Validate the feedback structure
    if (!feedbackData) {
      console.error("❌ [createFeedback] No feedback data available");
      throw new Error("No feedback object available");
    }

    let categoryScores = feedbackData.categoryScores;
    if (!Array.isArray(categoryScores)) {
      console.warn("⚠️ [createFeedback] categoryScores is not an array, converting...");
      if (typeof categoryScores === "object" && categoryScores !== null) {
        categoryScores = Object.values(categoryScores).filter(item => item && typeof item === "object");
      } else {
        categoryScores = [];
      }
    }

    const strengths = Array.isArray(feedbackData.strengths) ? feedbackData.strengths : [];
    const areasForImprovement = Array.isArray(feedbackData.areasForImprovement) ? feedbackData.areasForImprovement : [];
    const totalScore = typeof feedbackData.totalScore === "number" ? feedbackData.totalScore : 0;
    const finalAssessment = typeof feedbackData.finalAssessment === "string" ? feedbackData.finalAssessment : "";

    const feedback = {
      interviewId,
      userId,
      transcript,
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
      status: resolvedIsCompleted ? "completed" : "incomplete",
      isCompleted: resolvedIsCompleted,
      answeredCount: resolvedAnswered,
      totalQuestions: resolvedTotal,
      quitAtQuestion: resolvedIsCompleted ? null : resolvedQuitAt,
      createdAt: new Date().toISOString(),
    };

    console.log("💾 [createFeedback] Saving to Firebase...");

    let feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set(feedback);

    if (userId) {
      try {
        await db.collection("users").doc(userId).collection("feedback").doc(feedbackRef.id).set(feedback);
        console.log(`✅ [createFeedback] Saved to user subcollection: users/${userId}/feedback/${feedbackRef.id}`);
      } catch (err) {
        console.error("Failed to save feedback to user subcollection:", err);
      }
    }
    updateTag("feedback");

    const interviewRef = db.collection("users").doc(userId).collection("interviews").doc(interviewId);
    const interviewDoc = await interviewRef.get();
    const threadId = interviewDoc.exists ? interviewDoc.data().threadId : null;
    if (threadId) {
      await finishInterviewModeSession({
        userId,
        sessionId: threadId,
        result: {
          interviewId,
          feedbackId: feedbackRef.id,
          totalScore,
          categoryScores,
          strengths,
          areasForImprovement,
          finalAssessment,
        },
      });
      await interviewRef.update({
        status: "completed",
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`✅ [createFeedback] Successfully saved feedback with ID: ${feedbackRef.id}`);

    try {
      revalidatePath("/interview");
      revalidatePath(`/interview/${interviewId}`);
      revalidatePath(`/interview/${interviewId}/feedback`);
      revalidatePath("/");
      revalidateTag("feedback");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return {
      success: true,
      feedbackId: feedbackRef.id,
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
      status: resolvedIsCompleted ? "completed" : "incomplete",
      isCompleted: resolvedIsCompleted,
      answeredCount: resolvedAnswered,
      totalQuestions: resolvedTotal,
      quitAtQuestion: resolvedIsCompleted ? null : resolvedQuitAt,
    };
  } catch (error) {
    console.error("❌ [createFeedback] Exception:", error);
    const errorMessage = error?.message || "Failed to generate feedback";

    if (errorMessage.includes("quota") || errorMessage.includes("429")) {
      return {
        success: false,
        error: "API quota exceeded. Please upgrade your Google AI Studio plan.",
      };
    }

    if (errorMessage.includes("API key") || errorMessage.includes("403")) {
      return {
        success: false,
        error: "API key issue - check GOOGLE_GENERATIVE_AI_API_KEY configuration",
      };
    }

    return { success: false, error: errorMessage };
  }
}

export async function abandonInterviewSession({ interviewId, userId }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.id === "dummy-user-id" || currentUser.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const interviewRef = db
      .collection("users")
      .doc(userId)
      .collection("interviews")
      .doc(interviewId);
    const interviewDoc = await interviewRef.get();
    if (!interviewDoc.exists) {
      return { success: false, error: "Interview not found" };
    }

    const threadId = interviewDoc.data().threadId;
    if (threadId) {
      await finishInterviewModeSession({
        userId,
        sessionId: threadId,
        status: "abandoned",
      });
    }
    await interviewRef.update({
      status: "abandoned",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error abandoning interview session:", error);
    return { success: false, error: error.message || "Failed to end interview" };
  }
}

export async function getInternships(params) {
  const { type = "all", limit = 50 } = params || {};

  try {
    let query = db.collection("internships").where("active", "==", true);

    if (type && type !== "all") {
      query = query.where("type", "==", type);
    }

    query = query.orderBy("postedAt", "desc").limit(limit);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    const internships = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return internships.map((internship) => serializeFirebaseData(internship));
  } catch (error) {
    console.error("Error fetching internships:", error);
    return [];
  }
}

export async function searchInternships(params) {
  const {
    type = "all",
    location = "all",
    search = "",
    limit = 50,
    featured = false,
  } = params || {};

  try {
    let query = db.collection("internships").where("active", "==", true);

    if (type && type !== "all") {
      query = query.where("type", "==", type);
    }

    if (location && location !== "all") {
      if (location === "remote") {
        query = query.where("isRemote", "==", true);
      } else {
        query = query.where("location", "==", location);
      }
    }

    if (featured) {
      query = query.where("featured", "==", true);
    }

    query = query.orderBy("postedAt", "desc").limit(limit);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    let internships = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      internships = internships.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchLower) ||
          item.company?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.skills?.some((skill) =>
            skill.toLowerCase().includes(searchLower)
          )
      );
    }

    return internships.map((internship) => serializeFirebaseData(internship));
  } catch (error) {
    console.error("Error searching internships:", error);
    return [];
  }
}

export async function applyForInternship(params) {
  const { internshipId, userId, userEmail, resumeUrl, coverLetter } = params;

  try {
    const applicationRef = await db.collection("applications").add({
      internshipId,
      userId,
      userEmail,
      resumeUrl,
      coverLetter,
      status: "pending",
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const internshipRef = db.collection("internships").doc(internshipId);
    await internshipRef.update({
      applicants: admin.firestore.FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, applicationId: applicationRef.id };
  } catch (error) {
    console.error("Error applying for internship:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserApplications(userId) {
  try {
    const snapshot = await db
      .collection("applications")
      .where("userId", "==", userId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const applications = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const application = doc.data();
        const internshipDoc = await db
          .collection("internships")
          .doc(application.internshipId)
          .get();

        return {
          id: doc.id,
          ...application,
          internship: internshipDoc.exists ? internshipDoc.data() : null,
        };
      })
    );

    applications.sort((a, b) => {
      const aTime = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
      const bTime = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
      return bTime - aTime;
    });

    return applications;
  } catch (error) {
    console.error("Error fetching user applications:", error);
    return [];
  }
}

export async function getInternshipCounts() {
  try {
    const snapshot = await db
      .collection("internships")
      .where("active", "==", true)
      .get();

    if (snapshot.empty) {
      return { all: 0, tech: 0, data: 0, business: 0, quick: 0, remote: 0, high: 0 };
    }

    const internships = snapshot.docs.map((doc) => doc.data());

    const counts = {
      all: internships.length,
      tech: internships.filter((i) => i.type === "tech").length,
      data: internships.filter((i) => i.type === "data").length,
      business: internships.filter((i) => i.type === "business").length,
      quick: internships.filter((i) => i.type === "quick").length,
      remote: internships.filter((i) =>
        i.location?.toLowerCase().includes("remote") || i.isRemote === true
      ).length,
      high: internships.filter((i) => {
        const stipendValue = parseInt(String(i.stipend).replace(/[^0-9]/g, "")) || 0;
        return stipendValue >= 8000;
      }).length,
    };

    return counts;
  } catch (error) {
    console.error("Error getting internship counts:", error);
    return { all: 0, tech: 0, data: 0, business: 0, quick: 0, remote: 0, high: 0 };
  }
}

export async function getInternshipById(id) {
  if (!id) return null;
  try {
    const doc = await db.collection("internships").doc(id).get();
    if (!doc.exists) return null;
    return serializeFirebaseData({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching internship by ID:", error);
    return null;
  }
}

export async function getInterviewById(id, userId) {
  if (userId) {
    const userInterview = await db
      .collection("users")
      .doc(userId)
      .collection("interviews")
      .doc(id)
      .get();
    if (userInterview.exists) {
      return serializeFirebaseData(userInterview.data());
    }
  }

  const interview = await db.collection("interviews").doc(id).get();
  if (!interview.exists) return null;
  const data = interview.data();
  if (userId && data.userId !== userId) return null;
  return serializeFirebaseData(data);
}

const getCachedFeedback = unstable_cache(
  async (interviewId, userId) => {
    const querySnapshot = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .get();

    if (querySnapshot.empty) return null;

    const docs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by createdAt desc to ensure the latest attempt is returned
    docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return serializeFirebaseData(docs[0]);
  },
  ["feedback"],
  { revalidate: 3600, tags: ["feedback"] }
);

export async function getFeedbackByInterviewId(params) {
  const { interviewId, userId } = params;
  return await getCachedFeedback(interviewId, userId);
}

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

  return interviews
    .filter((i) => i.userId !== userId)
    .map((interview) => serializeFirebaseData(interview));
}

export async function getInterviewsByUserId(userId) {
  if (!userId) return [];
  const [userInterviews, legacyInterviews] = await Promise.all([
    db.collection("users").doc(userId).collection("interviews").get(),
    db.collection("interviews").where("userId", "==", userId).get(),
  ]);

  const byId = new Map();
  [...legacyInterviews.docs, ...userInterviews.docs].forEach((doc) => {
    byId.set(doc.id, serializeFirebaseData({ id: doc.id, ...doc.data() }));
  });

  return [...byId.values()].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export async function getUserFeedbacks(userId) {
  if (!userId) return [];
  const snapshot = await db
    .collection("feedback")
    .where("userId", "==", userId)
    .get();

  const feedbacks = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const serializedFeedbacks = feedbacks.map((feedback) => serializeFirebaseData(feedback));
  
  serializedFeedbacks.sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  return serializedFeedbacks;
}


// ============================================================
// OLLAMA CONFIGURATION
// ============================================================

const OLLAMA_URL = (
  process.env.OLLAMA_URL ||
  process.env.OLLAMA_URL_2 ||
  "https://audible-nanny-slacks.ngrok-free.dev"
).trim();

const MODEL_NAME = (
  process.env.OLLAMA_MODEL || "gemma3:4b"
).trim();

const OLLAMA_USERNAME = (
  process.env.OLLAMA_USERNAME || ""
).trim();

const OLLAMA_PASSWORD =
  process.env.OLLAMA_PASSWORD || "";

const OLLAMA_AUTH_HEADER = OLLAMA_USERNAME
  ? `Basic ${Buffer.from(
      `${OLLAMA_USERNAME}:${OLLAMA_PASSWORD}`
    ).toString("base64")}`
  : undefined;

const OLLAMA_SOURCE =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(
    OLLAMA_URL
  )
    ? "localhost"
    : "remote";

// ============================================================
// URL NORMALIZATION
// ============================================================

function normalizeOllamaBaseUrl(url) {
  return url
    .trim()
    .replace(/\/api\/(chat|generate|ps)\/?$/i, "")
    .replace(/\/+$/, "");
}

const OLLAMA_BASE_URL =
  normalizeOllamaBaseUrl(OLLAMA_URL);

const OLLAMA_ENDPOINT =
  `${OLLAMA_BASE_URL}/api/chat`;

const OLLAMA_PS_ENDPOINT =
  `${OLLAMA_BASE_URL}/api/ps`;

// ============================================================
// HEADERS
// ============================================================

const OLLAMA_HEADERS = {
  "Content-Type": "application/json",
  ...(OLLAMA_AUTH_HEADER
    ? { Authorization: OLLAMA_AUTH_HEADER }
    : {}),
};

// ============================================================
// DEBUGGING
// ============================================================

function logOllamaConfig() {
  console.log("\n========== OLLAMA CONFIGURATION ==========");

  console.log("Environment:", process.env.NODE_ENV);
  console.log("Source:", OLLAMA_SOURCE);
  console.log("URL configured:", Boolean(OLLAMA_URL));
  console.log("Endpoint:", OLLAMA_ENDPOINT);
  console.log("Model:", MODEL_NAME);
  console.log("Authentication:", Boolean(OLLAMA_AUTH_HEADER));

  console.log("==========================================\n");
}

// ============================================================
// CHECK MODEL AVAILABILITY
// ============================================================

async function isOllamaModelLoaded() {
  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    3000
  );

  try {
    const response = await fetch(
      OLLAMA_PS_ENDPOINT,
      {
        method: "GET",
        headers: OLLAMA_HEADERS,
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      console.warn(
        "[Ollama] Model status HTTP error:",
        response.status
      );

      return false;
    }

    const data = await response.json();

    const isLoaded = data.models?.some(
      (model) =>
        model.name === MODEL_NAME ||
        model.model === MODEL_NAME ||
        model.name?.startsWith(`${MODEL_NAME}:`)
    );

    console.log(
      `[Ollama] Model ${MODEL_NAME} loaded:`,
      Boolean(isLoaded)
    );

    return Boolean(isLoaded);

  } catch (error) {
    console.warn(
      "[Ollama] Model status check failed:",
      error.message
    );

    return false;

  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================
// OLLAMA STREAMING RESPONSE HANDLER
// ============================================================

async function readOllamaStream(response) {
  if (!response.body) {
    throw new Error("Ollama returned an empty response stream");
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder();

  let fullResponse = "";
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true,
      });

      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        let json;

        try {
          json = JSON.parse(line);
        } catch {
          console.warn(
            "[Ollama] Invalid stream chunk:",
            line.slice(0, 100)
          );

          continue;
        }

        if (json.error) {
          throw new Error(json.error);
        }

        if (json.message?.content) {
          fullResponse += json.message.content;
        }

        if (json.response) {
          fullResponse += json.response;
        }
      }
    }

    // Process any remaining buffered content.
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);

        if (json.error) {
          throw new Error(json.error);
        }

        if (json.message?.content) {
          fullResponse += json.message.content;
        }

        if (json.response) {
          fullResponse += json.response;
        }

      } catch (error) {
        if (error.message && error.message !== "Unexpected end of JSON input") {
          throw error;
        }
      }
    }

  } finally {
    reader.releaseLock();
  }

  if (!fullResponse.trim()) {
    throw new Error("Ollama returned an empty response");
  }

  return fullResponse;
}

// ============================================================
// GEMINI FALLBACK
// ============================================================

async function generateWithGemini(messages) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured"
    );
  }

  console.log(
    "[Fallback] Calling Gemini 2.0 Flash..."
  );

  const fallbackResult = await generateText({
    model: google("gemini-2.0-flash"),

    messages: messages.map((message) => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: message.content,
    })),
  });

  if (!fallbackResult.text?.trim()) {
    throw new Error(
      "Gemini returned an empty response"
    );
  }

  console.log(
    "[Fallback] Gemini response received successfully"
  );

  return {
    text: fallbackResult.text,
    source: "gemini_fallback",
  };
}

// ============================================================
// MAIN OLLAMA GENERATION FUNCTION
// ============================================================

export async function generateWithOllama(options) {

  const messages =
    options.messages ?? [
      {
        role: "user",
        content: options.prompt,
      },
    ];

  logOllamaConfig();

  try {

    // --------------------------------------------------------
    // STEP 1: CHECK MODEL STATUS
    // --------------------------------------------------------

    const isLoaded =
      await isOllamaModelLoaded();

    const timeoutMs = isLoaded
      ? 90000
      : 180000;

    console.log(
      `[Ollama] ${
        isLoaded
          ? "Model already loaded"
          : "Cold start expected"
      }`
    );

    console.log(
      `[Ollama] Request timeout: ${timeoutMs / 1000}s`
    );

    // --------------------------------------------------------
    // STEP 2: PREPARE REQUEST
    // --------------------------------------------------------

    const requestBody = {
      model: MODEL_NAME,

      messages,

      stream: true,

      options: {
        temperature: 0.3,
      },
    };

    const controller =
      new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    // --------------------------------------------------------
    // STEP 3: SEND REQUEST TO OLLAMA
    // --------------------------------------------------------

    console.log(
      `[Ollama] Sending request to ${OLLAMA_ENDPOINT}`
    );

    const startTime = Date.now();

    try {

      const response = await fetch(
        OLLAMA_ENDPOINT,
        {
          method: "POST",

          headers: OLLAMA_HEADERS,

          body: JSON.stringify(requestBody),

          signal: controller.signal,
        }
      );

      console.log(
        "[Ollama] HTTP Status:",
        response.status
      );

      if (!response.ok) {
        const errorBody =
          await response.text().catch(() => "");

        throw new Error(
          `Ollama HTTP ${response.status}: ${errorBody.slice(0, 500)}`
        );
      }

      // ------------------------------------------------------
      // STEP 4: READ STREAM
      // ------------------------------------------------------

      const fullResponse =
        await readOllamaStream(response);

      console.log(
        "[Ollama] Response time:",
        Date.now() - startTime,
        "ms"
      );

      console.log(
        "[Ollama] Generation successful"
      );

      return {
        text: fullResponse,
        source: "ollama",
        ollamaSource: OLLAMA_SOURCE,
      };

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {

    // --------------------------------------------------------
    // STEP 5: OLLAMA FAILURE
    // --------------------------------------------------------

    console.error(
      "\n========== OLLAMA FAILURE =========="
    );

    console.error(
      "Error name:",
      error.name
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(
      "Error cause:",
      error.cause
    );

    console.error(
      "Endpoint:",
      OLLAMA_ENDPOINT
    );

    console.error(
      "====================================\n"
    );

    // --------------------------------------------------------
    // STEP 6: GEMINI FALLBACK
    // --------------------------------------------------------

    try {

      console.log(
        "[Fallback] Switching to Gemini..."
      );

      return await generateWithGemini(
        messages
      );

    } catch (fallbackError) {

      console.error(
        "[Fallback] Gemini failed:",
        fallbackError.message
      );

      // ------------------------------------------------------
      // STEP 7: STATIC FALLBACK
      // ------------------------------------------------------

      return {
        text:
          "Hiring Manager: Sorry, I'm having trouble connecting to the interview service right now. Please try again shortly. [Coaching Hint: Check the Ollama server connection and Gemini API configuration.]",

        source: "static_fallback",
      };
    }
  }
}

// ============================================================
// SALARY NEGOTIATION
// ============================================================

export async function negotiateSalaryTurn(params) {

  const {
    jobTitle,
    initialOffer,
    targetSalary,
    messages = [],
  } = params;

  try {

    console.log(
      "[Negotiation] Started:",
      new Date().toISOString()
    );

    const conversation = messages
      .map(
        (message) =>
          `${message.role === "user" ? "Candidate" : "HiringManager"}: ${message.content}`
      )
      .join("\n");

    const prompt = `
You are playing the role of a realistic but fair hiring manager in a salary negotiation practice.

Job Title: ${jobTitle || "Not specified"}

Initial Offer: ${initialOffer || "Not specified"}

Candidate Target Salary: ${targetSalary || "Not specified"}

Conversation so far:

${conversation}

Respond as the hiring manager.

Rules:
- Be realistic and professional.
- Push back when needed.
- Keep the reply between 2-4 sentences.
- Occasionally give a coaching hint in brackets.
`;

    const { text, source } =
      await generateWithOllama({
        prompt,
      });

    console.log(
      "[Negotiation] Completed:",
      new Date().toISOString(),
      "| Source:",
      source
    );

    return {
      success: true,
      reply: text,
      source,
    };

  } catch (error) {

    console.error(
      "[Negotiation] AI Error:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
}
