"use server";

import { unstable_cache } from "next/cache";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import * as admin from "firebase-admin";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

const GEMINI_API_KEY =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY;

// 🎯 1. Define your fallback models in order of preference
const FALLBACK_MODELS = [
  "gemini-2.0-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite"
];

// 🛠️ 2. Helper for generateObject with Fallback Loop
async function generateObjectWithFallback(options) {
  let lastError;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName}...`);
      const result = await generateObject({
        model: google(modelName, {
          apiKey: GEMINI_API_KEY
        }),
        ...options,
      });
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      // 👇 This prints EXACTLY why the model failed!
      console.warn(`⚠️ Model ${modelName} failed. Reason: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All fallback models failed.");
}

// 🛠️ 3. Helper for generateText with Fallback Loop
async function generateTextWithFallback(options) {
  let lastError;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName}...`);
      const result = await generateText({
        model: google(modelName, {
          apiKey: GEMINI_API_KEY,
          structuredOutputs: false
        }),
        ...options,
      });
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      // 👇 This prints EXACTLY why the model failed!
      console.warn(`⚠️ Model ${modelName} failed. Reason: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All fallback models failed.");
}

const interviewQuestionsSchema = z.object({
  questions: z.array(z.string()),
});

export async function createInterview(params) {
  const { userId, role, company, difficulty, techstack = [], type } = params;

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

export async function createFeedback(params) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

    const { object } = await generateObjectWithFallback({
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
      interviewId,
      userId,
      transcript,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
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
      .orderBy("appliedAt", "desc")
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

export async function getInterviewById(id) {
  const interview = await db.collection("interviews").doc(id).get();
  return interview.exists ? serializeFirebaseData(interview.data()) : null;
}

const getCachedFeedback = unstable_cache(
  async (interviewId, userId) => {
    const querySnapshot = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (querySnapshot.empty) return null;

    const feedbackDoc = querySnapshot.docs[0];
    return serializeFirebaseData({ id: feedbackDoc.id, ...feedbackDoc.data() });
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
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .map((interview) => serializeFirebaseData(interview));
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

export async function negotiateSalaryTurn(params) {
  const { jobTitle, initialOffer, targetSalary, messages = [] } = params;

  try {
    const conversation = messages
      .map((m) =>
        `${m.role === "user" ? "Candidate" : "HiringManager"}: ${m.content}`
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
      - Be realistic and professional.
      - Push back when needed but stay respectful.
      - Keep your reply short: 2–4 sentences.
      - Occasionally add a coaching hint in brackets at the end.
    `;

    const { text } = await generateTextWithFallback({ prompt });

    return { success: true, reply: text };
  } catch (error) {
    console.error("NEGOTIATION AI ERROR --->", {
      message: error?.message,
      statusCode: error?.statusCode,
    });

    if (error?.statusCode === 429) {
      return {
        success: false,
        error: "Free-tier quota reached. Please try again after some time.",
      };
    }

    return {
      success: false,
      error: "AI service failed to respond.",
    };
  }
}