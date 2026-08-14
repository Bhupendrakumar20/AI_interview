// "use server";

// import { unstable_cache } from "next/cache";
// import { generateObject, generateText } from "ai";
// import { google } from "@/lib/ai-provider";
// import { z } from "zod";
// import * as admin from "firebase-admin";

// import { db } from "@/firebase/admin";
// import { feedbackSchema } from "@/constants";
// import { serializeFirebaseData } from "@/lib/firebase-helpers";
// import { getCachedData, setCachedData, generateCacheKey } from "@/lib/cache-helpers";
// import { FALLBACK_INTERVIEW_QUESTIONS, FALLBACK_FEEDBACK, FALLBACK_MOCK_TEST_QUESTIONS } from "@/lib/fallback-data";
// import { withRateLimit } from "@/lib/rate-limiter";

// const GEMINI_API_KEY =
//   process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
//   process.env.GOOGLE_API_KEY ||
//   process.env.GROQ_API_KEY;

// // 🎯 1. Only gemini-2.0-flash is available in v1beta API for this account
// // Other models (1.5-pro, 1.5-flash) get 404 Not Found
// const FALLBACK_MODELS = [
//   "gemini-2.0-flash"
// ];

// // 🛠️ 2. Helper for generateObject with Fallback Loop + Rate Limiting
// async function generateObjectWithFallback(options, userId = "anonymous") {
//   let lastError;

//   // Try with structured outputs first
//   for (const modelName of FALLBACK_MODELS) {
//     try {
//       console.log(`🤖 Trying model: ${modelName} with structured outputs...`);
      
//       // Use rate limiter to prevent 429 errors (with per-user tracking)
//       const result = await withRateLimit(
//         async () => {
//           return await generateObject({
//             model: google(modelName, {
//               apiKey: GEMINI_API_KEY,
//               useStructuredOutputs: true
//             }),
//             ...options,
//           });
//         },
//         `generateObject(${modelName}, structured=true)`,
//         userId,
//         { prompt: options.prompt }
//       );
      
//       console.log(`✅ Success with model: ${modelName}`);
//       return result;
//     } catch (error) {
//       const msg = error.message;
//       if (msg.includes("429") || msg.includes("TooManyRequests") || msg.includes("quota")) {
//         console.warn(`⚠️ Model ${modelName} - RATE LIMIT OR QUOTA EXCEEDED.`);
//         console.warn(`💡 Free tier: 15 requests/minute. Upgrade at https://ai.google.dev/pricing`);
//         throw new Error("API rate limit exceeded. The system is now queuing requests to respect the 15 requests/minute free tier limit. Upgrade your plan for higher limits.");
//       }
//       console.warn(`⚠️ Model ${modelName} with structured outputs failed: ${msg}`);
//       lastError = error;
//     }
//   }

//   // Fallback: try without structured outputs
//   for (const modelName of FALLBACK_MODELS) {
//     try {
//       console.log(`🤖 Trying model: ${modelName} without structured outputs...`);
      
//       const result = await withRateLimit(
//         async () => {
//           return await generateObject({
//             model: google(modelName, {
//               apiKey: GEMINI_API_KEY,
//               useStructuredOutputs: false
//             }),
//             ...options,
//           });
//         },
//         `generateObject(${modelName}, structured=false)`,
//         userId,
//         { prompt: options.prompt }
//       );
      
//       console.log(`✅ Success with model: ${modelName}`);
//       return result;
//     } catch (error) {
//       const msg = error.message;
//       if (msg.includes("429") || msg.includes("TooManyRequests") || msg.includes("quota")) {
//         throw new Error("API rate limit exceeded. Please upgrade your Google AI plan.");
//       }
//       console.warn(`⚠️ Model ${modelName} without structured outputs failed: ${msg}`);
//       lastError = error;
//     }
//   }

//   throw lastError || new Error("All fallback models failed.");
// }

// // 🛠️ 3. Helper for generateText with Fallback Loop + Rate Limiting
// async function generateTextWithFallback(options, userId = "anonymous") {
//   let lastError;

//   for (const modelName of FALLBACK_MODELS) {
//     try {
//       console.log(`🤖 Trying text generation with model: ${modelName}...`);
      
//       const result = await withRateLimit(
//         async () => {
//           return await generateText({
//             model: google(modelName, {
//               apiKey: GEMINI_API_KEY
//             }),
//             ...options,
//           });
//         },
//         `generateText(${modelName})`,
//         userId,
//         { prompt: options.prompt }
//       );
      
//       console.log(`✅ Success with model: ${modelName}`);
//       return result;
//     } catch (error) {
//       const msg = error.message;
//       if (msg.includes("429") || msg.includes("TooManyRequests")) {
//         console.warn(`⚠️ Model ${modelName} - Rate limit exceeded. Using exponential backoff...`);
//         throw new Error("API rate limit exceeded. Requests are being queued.");
//       }
//       console.warn(`⚠️ Model ${modelName} failed: ${msg}`);
//       lastError = error;
//     }
//   }

//   throw lastError || new Error("All fallback models failed for text generation.");
// }

// const interviewQuestionsSchema = z.object({
//   questions: z.array(z.string()),
// });

// export async function createInterview(params) {
//   const { userId, role, company, difficulty, techstack = [], type } = params;

//   try {
//     // Generate cache key
//     const cacheKey = generateCacheKey("interview", { role, company, difficulty, type });
    
//     // Check if cached
//     let questions = getCachedData(cacheKey);
    
//     if (!questions) {
//       try {
//         // Try to call API using the wrapper for resilience (with per-user rate limiting)
//         const { object } = await generateObjectWithFallback({
//           schema: interviewQuestionsSchema,
//           prompt: `
//             You are an expert interview coach.
//             Generate 5-7 interview questions for a mock interview.

//             Role: ${role}
//             Company: ${company}
//             Difficulty: ${difficulty}
//             Type: ${type || "Technical"}

//             Rules:
//             - Questions must be realistic and concise.
//             - Mix behavioral and technical questions when relevant.
//             - If the role is related to software engineering / developer / SDE:
//               * Include at least 2 algorithm or data structure coding questions.
//               * These should feel like real LeetCode-style technical screen questions.
//             - Return only plain text questions, no numbering, no extra commentary.
//           `,
//           system:
//             "You generate concise, realistic interview questions suitable for mock interviews.",
//         }, userId);

//         questions = object.questions || [];
        
//         // Cache the result
//         setCachedData(cacheKey, questions);
//       } catch (apiError) {
//         console.error("API call failed, using fallback data:", apiError);
        
//         // Use fallback data
//         const roleKey = Object.keys(FALLBACK_INTERVIEW_QUESTIONS).find(
//           key => role.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(role.toLowerCase())
//         ) || "Software Engineer";
        
//         const difficultyKey = difficulty && FALLBACK_INTERVIEW_QUESTIONS[roleKey][difficulty] 
//           ? difficulty 
//           : "Medium";
        
//         questions = FALLBACK_INTERVIEW_QUESTIONS[roleKey][difficultyKey];
        
//         // Cache the fallback data too
//         setCachedData(cacheKey, questions);
//       }
//     }

//     const docRef = await db.collection("interviews").add({
//       userId,
//       role,
//       company,
//       level: difficulty,
//       type: type || "Technical",
//       techstack,
//       finalized: true,
//       questions,
//       createdAt: new Date().toISOString(),
//     });

//     return { success: true, interviewId: docRef.id };
//   } catch (error) {
//     console.error("Error creating interview:", error);
//     const errorMessage = error?.message || "Failed to create interview";
    
//     // Check if it's a quota issue
//     if (errorMessage.includes("quota") || errorMessage.includes("429")) {
//       return { 
//         success: false, 
//         error: "API quota exceeded. Your Google AI Studio free plan limit has been reached. Please upgrade your plan at https://ai.google.dev/pricing" 
//       };
//     }
    
//     // Check if it's an API key issue
//     if (errorMessage.includes("API key") || errorMessage.includes("403")) {
//       return { success: false, error: "API key issue - check GOOGLE_GENERATIVE_AI_API_KEY configuration" };
//     }
    
//     return { success: false, error: errorMessage };
//   }
// }

// export async function createFeedback(params) {
//   const { interviewId, userId, transcript, feedbackId } = params;

//   console.log("🎯 [createFeedback] Starting feedback generation");
//   console.log(`  - interviewId: ${interviewId}`);
//   console.log(`  - userId: ${userId}`);
//   console.log(`  - transcript length: ${transcript?.length || 0}`);
//   console.log(`  - feedbackId: ${feedbackId || "new"}`);

//   // Check API Key early
//   if (!GEMINI_API_KEY) {
//     console.error("❌ [createFeedback] GOOGLE_GENERATIVE_AI_API_KEY is not configured");
//     return {
//       success: false,
//       error: "API key not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in environment",
//     };
//   }

//   console.log("✅ [createFeedback] API Key found in environment");

//   try {
//     // Generate cache key based on transcript
//     const transcriptHash = transcript.length.toString();
//     const cacheKey = generateCacheKey("feedback", { interviewId, transcriptHash });

//     // Check if cached
//     let feedbackData = getCachedData(cacheKey);

//     if (feedbackData) {
//       console.log("✅ [createFeedback] Using cached feedback");
//     }

//     if (!feedbackData) {
//       try {
//         const formattedTranscript = transcript
//           .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
//           .join("");

//         console.log("🤖 [createFeedback] Calling Gemini API...");
//         console.log(`  - Model: gemini-2.0-flash`);
//         console.log(`  - Structured outputs: enabled`);

//         // Try to call API using the wrapper for resilience (with per-user rate limiting)
//         const { object } = await generateObjectWithFallback({
//           schema: feedbackSchema,
//           prompt: `You are a STRICT technical interviewer. Evaluate this candidate:

// Interview Transcript:
// ${formattedTranscript}

// SCORE 0-100 on these 5 areas (calculate average as totalScore):
// 1. Technical Correctness (40% weight) - MOST IMPORTANT. Wrong answer = 0-20 score. Correct but unclear = 60-80. Correct and clear = 90-100
// 2. Communication Skills (20%) - Clarity of explanation
// 3. Problem-Solving (15%) - Systematic thinking
// 4. Depth of Knowledge (15%) - Goes beyond surface level
// 5. Confidence Calibration (10%) - Appropriate confidence level (confident wrong = RED FLAG)

// RULES: Wrong answers stay wrong even if well-explained. Technical correctness is PRIMARY.

// Return: totalScore (average), categoryScores (array of 5 objects), strengths (array), areasForImprovement (array), finalAssessment (text)`,
//           system:
//             "You evaluate interviews. Technical correctness is your PRIMARY criterion. Wrong answers are wrong, regardless of communication quality. Be harsh but fair.",
//         }, userId);

//         console.log("✅ [createFeedback] Gemini API call successful");
//         console.log(`  - Total Score: ${object.totalScore}`);
//         console.log(`  - Category Scores: ${object.categoryScores?.length || 0} items`);
//         console.log(`  - Category First Name: ${object.categoryScores?.[0]?.name}`);

//         feedbackData = {
//           totalScore: object.totalScore,
//           categoryScores: object.categoryScores,
//           strengths: object.strengths,
//           areasForImprovement: object.areasForImprovement,
//           finalAssessment: object.finalAssessment,
//         };

//         // Cache the result
//         setCachedData(cacheKey, feedbackData);
//         console.log("✅ [createFeedback] Feedback cached");
//       } catch (apiError) {
//         console.error("❌ [createFeedback] API call failed:", apiError.message);

//         // Use fallback feedback
//         feedbackData = {
//           totalScore: FALLBACK_FEEDBACK.totalScore,
//           categoryScores: [
//             {
//               name: "Communication Skills",
//               score: FALLBACK_FEEDBACK.communicationSkills,
//               comment: "Clear articulation of thoughts and ideas"
//             },
//             {
//               name: "Technical Knowledge",
//               score: FALLBACK_FEEDBACK.technicalKnowledge,
//               comment: "Good foundation in technical concepts"
//             },
//             {
//               name: "Problem Solving",
//               score: FALLBACK_FEEDBACK.problemSolving,
//               comment: "Logical approach to solving problems"
//             },
//             {
//               name: "Cultural Fit",
//               score: FALLBACK_FEEDBACK.culturalFit,
//               comment: "Demonstrates positive attitude and alignment with engineering practices"
//             },
//             {
//               name: "Confidence and Clarity",
//               score: FALLBACK_FEEDBACK.confidenceClarity,
//               comment: "Expresses answers clearly and confidently"
//             }
//           ],
//           strengths: FALLBACK_FEEDBACK.strengths,
//           areasForImprovement: FALLBACK_FEEDBACK.areasForImprovement,
//           finalAssessment: FALLBACK_FEEDBACK.finalAssessment,
//         };

//         console.log("⚠️ [createFeedback] Using fallback feedback due to API error");
//         // Cache the fallback data
//         setCachedData(cacheKey, feedbackData);
//       }
//     }

//     // Validate the feedback structure
//     if (!feedbackData) {
//       console.error("❌ [createFeedback] No feedback data available");
//       throw new Error("No feedback object available");
//     }

//     // Ensure categoryScores is an array
//     let categoryScores = feedbackData.categoryScores;
//     if (!Array.isArray(categoryScores)) {
//       console.warn("⚠️ [createFeedback] categoryScores is not an array, converting...");
//       if (typeof categoryScores === "object" && categoryScores !== null) {
//         categoryScores = Object.values(categoryScores).filter(item => item && typeof item === "object");
//       } else {
//         categoryScores = [];
//       }
//     }

//     // Ensure other fields are arrays or strings
//     const strengths = Array.isArray(feedbackData.strengths) ? feedbackData.strengths : [];
//     const areasForImprovement = Array.isArray(feedbackData.areasForImprovement) ? feedbackData.areasForImprovement : [];
//     const totalScore = typeof feedbackData.totalScore === "number" ? feedbackData.totalScore : 0;
//     const finalAssessment = typeof feedbackData.finalAssessment === "string" ? feedbackData.finalAssessment : "";

//     const feedback = {
//       interviewId,
//       userId,
//       transcript,
//       totalScore,
//       categoryScores,
//       strengths,
//       areasForImprovement,
//       finalAssessment,
//       createdAt: new Date().toISOString(),
//     };

//     console.log("💾 [createFeedback] Saving to Firebase...");

//     let feedbackRef = feedbackId
//       ? db.collection("feedback").doc(feedbackId)
//       : db.collection("feedback").doc();

//     await feedbackRef.set(feedback);

//     console.log(`✅ [createFeedback] Successfully saved feedback with ID: ${feedbackRef.id}`);

//     return {
//       success: true,
//       feedbackId: feedbackRef.id,
//       totalScore,
//       categoryScores,
//       strengths,
//       areasForImprovement,
//       finalAssessment,
//     };
//   } catch (error) {
//     console.error("❌ [createFeedback] Exception:", error);
//     const errorMessage = error?.message || "Failed to generate feedback";

//     if (errorMessage.includes("quota") || errorMessage.includes("429")) {
//       return {
//         success: false,
//         error: "API quota exceeded. Please upgrade your Google AI Studio plan.",
//       };
//     }

//     if (errorMessage.includes("API key") || errorMessage.includes("403")) {
//       return {
//         success: false,
//         error: "API key issue - check GOOGLE_GENERATIVE_AI_API_KEY configuration",
//       };
//     }

//     return { success: false, error: errorMessage };
//   }
// }

// export async function getInternships(params) {
//   const { type = "all", limit = 50 } = params || {};

//   try {
//     let query = db.collection("internships").where("active", "==", true);

//     if (type && type !== "all") {
//       query = query.where("type", "==", type);
//     }

//     query = query.orderBy("postedAt", "desc").limit(limit);

//     const snapshot = await query.get();

//     if (snapshot.empty) {
//       return [];
//     }

//     const internships = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     return internships.map((internship) => serializeFirebaseData(internship));
//   } catch (error) {
//     console.error("Error fetching internships:", error);
//     return [];
//   }
// }

// export async function searchInternships(params) {
//   const {
//     type = "all",
//     location = "all",
//     search = "",
//     limit = 50,
//     featured = false,
//   } = params || {};

//   try {
//     let query = db.collection("internships").where("active", "==", true);

//     if (type && type !== "all") {
//       query = query.where("type", "==", type);
//     }

//     if (location && location !== "all") {
//       if (location === "remote") {
//         query = query.where("isRemote", "==", true);
//       } else {
//         query = query.where("location", "==", location);
//       }
//     }

//     if (featured) {
//       query = query.where("featured", "==", true);
//     }

//     query = query.orderBy("postedAt", "desc").limit(limit);

//     const snapshot = await query.get();

//     if (snapshot.empty) {
//       return [];
//     }

//     let internships = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     if (search) {
//       const searchLower = search.toLowerCase();
//       internships = internships.filter(
//         (item) =>
//           item.title?.toLowerCase().includes(searchLower) ||
//           item.company?.toLowerCase().includes(searchLower) ||
//           item.description?.toLowerCase().includes(searchLower) ||
//           item.skills?.some((skill) =>
//             skill.toLowerCase().includes(searchLower)
//           )
//       );
//     }

//     return internships.map((internship) => serializeFirebaseData(internship));
//   } catch (error) {
//     console.error("Error searching internships:", error);
//     return [];
//   }
// }

// export async function applyForInternship(params) {
//   const { internshipId, userId, userEmail, resumeUrl, coverLetter } = params;

//   try {
//     const applicationRef = await db.collection("applications").add({
//       internshipId,
//       userId,
//       userEmail,
//       resumeUrl,
//       coverLetter,
//       status: "pending",
//       appliedAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//     });

//     const internshipRef = db.collection("internships").doc(internshipId);
//     await internshipRef.update({
//       applicants: admin.firestore.FieldValue.increment(1),
//       updatedAt: new Date().toISOString(),
//     });

//     return { success: true, applicationId: applicationRef.id };
//   } catch (error) {
//     console.error("Error applying for internship:", error);
//     return { success: false, error: error.message };
//   }
// }

// export async function getUserApplications(userId) {
//   try {
//     const snapshot = await db
//       .collection("applications")
//       .where("userId", "==", userId)
//       .orderBy("appliedAt", "desc")
//       .get();

//     if (snapshot.empty) {
//       return [];
//     }

//     const applications = await Promise.all(
//       snapshot.docs.map(async (doc) => {
//         const application = doc.data();
//         const internshipDoc = await db
//           .collection("internships")
//           .doc(application.internshipId)
//           .get();

//         return {
//           id: doc.id,
//           ...application,
//           internship: internshipDoc.exists ? internshipDoc.data() : null,
//         };
//       })
//     );

//     return applications;
//   } catch (error) {
//     console.error("Error fetching user applications:", error);
//     return [];
//   }
// }

// export async function getInternshipCounts() {
//   try {
//     const snapshot = await db
//       .collection("internships")
//       .where("active", "==", true)
//       .get();

//     if (snapshot.empty) {
//       return { all: 0, tech: 0, data: 0, business: 0, quick: 0, remote: 0, high: 0 };
//     }

//     const internships = snapshot.docs.map((doc) => doc.data());

//     const counts = {
//       all: internships.length,
//       tech: internships.filter((i) => i.type === "tech").length,
//       data: internships.filter((i) => i.type === "data").length,
//       business: internships.filter((i) => i.type === "business").length,
//       quick: internships.filter((i) => i.type === "quick").length,
//       remote: internships.filter((i) =>
//         i.location?.toLowerCase().includes("remote") || i.isRemote === true
//       ).length,
//       high: internships.filter((i) => {
//         const stipendValue = parseInt(String(i.stipend).replace(/[^0-9]/g, "")) || 0;
//         return stipendValue >= 8000;
//       }).length,
//     };

//     return counts;
//   } catch (error) {
//     console.error("Error getting internship counts:", error);
//     return { all: 0, tech: 0, data: 0, business: 0, quick: 0, remote: 0, high: 0 };
//   }
// }

// export async function getInternshipById(id) {
//   if (!id) return null;
//   try {
//     const doc = await db.collection("internships").doc(id).get();
//     if (!doc.exists) return null;
//     return serializeFirebaseData({ id: doc.id, ...doc.data() });
//   } catch (error) {
//     console.error("Error fetching internship by ID:", error);
//     return null;
//   }
// }

// export async function getInterviewById(id) {
//   const interview = await db.collection("interviews").doc(id).get();
//   return interview.exists ? serializeFirebaseData(interview.data()) : null;
// }

// const getCachedFeedback = unstable_cache(
//   async (interviewId, userId) => {
//     const querySnapshot = await db
//       .collection("feedback")
//       .where("interviewId", "==", interviewId)
//       .where("userId", "==", userId)
//       .limit(1)
//       .get();

//     if (querySnapshot.empty) return null;

//     const feedbackDoc = querySnapshot.docs[0];
//     return serializeFirebaseData({ id: feedbackDoc.id, ...feedbackDoc.data() });
//   },
//   ["feedback"],
//   { revalidate: 3600, tags: ["feedback"] }
// );

// export async function getFeedbackByInterviewId(params) {
//   const { interviewId, userId } = params;
//   return await getCachedFeedback(interviewId, userId);
// }

// export async function getLatestInterviews(params) {
//   const { userId, limit = 20 } = params;
//   const interviewsSnapshot = await db
//     .collection("interviews")
//     .where("finalized", "==", true)
//     .orderBy("createdAt", "desc")
//     .limit(limit)
//     .get();

//   const interviews = interviewsSnapshot.docs.map((doc) => ({
//     id: doc.id,
//     ...doc.data(),
//   }));

//   return interviews
//     .filter((i) => i.userId !== userId)
//     .map((interview) => serializeFirebaseData(interview));
// }

// export async function getInterviewsByUserId(userId) {
//   if (!userId) return [];
//   const interviews = await db
//     .collection("interviews")
//     .where("userId", "==", userId)
//     .orderBy("createdAt", "desc")
//     .get();

//   return interviews.docs
//     .map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }))
//     .map((interview) => serializeFirebaseData(interview));
// }

// export async function getUserFeedbacks(userId) {
//   if (!userId) return [];
//   const snapshot = await db
//     .collection("feedback")
//     .where("userId", "==", userId)
//     .get();

//   const feedbacks = snapshot.docs.map((doc) => ({
//     id: doc.id,
//     ...doc.data(),
//   }));

//   const serializedFeedbacks = feedbacks.map((feedback) => serializeFirebaseData(feedback));
  
//   serializedFeedbacks.sort((a, b) => {
//     const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
//     const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
//     return bDate - aDate;
//   });

//   return serializedFeedbacks;
// }

// const MODELS = [
//   "llama3:latest",
//   // "qwen2.5:7b",
//   // "mistral:7b",
// ];

// // Background pre-warm for Ollama model on import/startup
// if (typeof window === "undefined") {
//   (async () => {
//     try {
//       const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
//       const modelName = process.env.OLLAMA_MODEL || "gemma3:4b";
//       console.log(`[Ollama Warm-up] Initiating background pre-warm for ${modelName}...`);
      
//       fetch(`${ollamaUrl.replace(/\/$/, "")}/api/chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           model: modelName,
//           messages: [{ role: "user", content: "hello" }],
//           stream: false
//         })
//       }).then(res => {
//         if (res.ok) {
//           console.log(`[Ollama Warm-up] Model ${modelName} pre-warmed successfully.`);
//         } else {
//           console.warn(`[Ollama Warm-up] Pre-warm returned status ${res.status}`);
//         }
//       }).catch(err => {
//         console.warn(`[Ollama Warm-up] Pre-warm failed (Ollama may be offline or loading):`, err.message);
//       });
//     } catch (e) {
//       // Ignore background errors
//     }
//   })();
// }

// export async function generateWithOllama(options) {
//   const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
//   const endpoint = ollamaUrl.endsWith("/api/chat") ? ollamaUrl : `${ollamaUrl.replace(/\/$/, "")}/api/chat`;
//   const modelName = process.env.OLLAMA_MODEL || "gemma3:4b";

//   const requestBody = {
//     messages:
//       options.messages ?? [
//         {
//           role: "user",
//           content: options.prompt,
//         },
//       ],
//     stream: true,
//     temperature: 0.3,
//   };


//   console.log("Messages:");
//   console.log(JSON.stringify(requestBody.messages, null, 2));

//   // Dynamic timeout logic: check if the model is currently loaded in memory via /api/ps
//   let timeoutMs = 180000; // Default to 180s (3 minutes) for cold start / loading
//   try {
//     const psController = new AbortController();
//     const psTimeout = setTimeout(() => psController.abort(), 2000);
//     const psRes = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/ps`, {
//       signal: psController.signal,
//     });
//     clearTimeout(psTimeout);
//     if (psRes.ok) {
//       const psData = await psRes.json();
//       const isLoaded = psData.models?.some(m => m.name === modelName || m.model === modelName);
//       if (isLoaded) {
//         timeoutMs = 12000; // If loaded, fail/fallback if it takes more than 12 seconds
//         console.log(`[Ollama] Model ${modelName} is already loaded. Setting timeout to 12s.`);
//       } else {
//         console.log(`[Ollama] Model ${modelName} is NOT loaded. Setting timeout to 180s for cold-start.`);
//       }
//     }
//   } catch (e) {
//     console.warn(`[Ollama] Could not query /api/ps. Using default 180s timeout:`, e.message);
//   }

//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

//   try {
//     console.log(`Sending request to local Ollama with ${timeoutMs / 1000}s timeout...`);
//     const response = await fetch(endpoint, {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//   },
//   body: JSON.stringify({
//     model: modelName,
//     messages: requestBody.messages,
//     stream: requestBody.stream,
//     temperature: requestBody.temperature,
//   }),
//   signal: controller.signal,
// });

//     clearTimeout(timeoutId);

//     if (!response.ok) {
//       throw new Error(`Ollama HTTP error: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("Ollama response received successfully:", data);

//     if (data.error) {
//       throw new Error(data.error);
//     }

//     return {
//       text: data.message.content,
//     };
//   } catch (error) {
//     clearTimeout(timeoutId);
//     console.warn("Ollama query failed or timed out. Falling back to Gemini Cloud API...", error.message);

//     try {
//       if (!GEMINI_API_KEY) {
//         throw new Error("No Gemini or Groq API Key found for cloud fallback.");
//       }

//       console.log(`🤖 Fallback Triggered: Calling Gemini Cloud API (gemini-2.0-flash)...`);
//       const fallbackResult = await generateText({
//         model: google("gemini-2.0-flash", {
//           apiKey: GEMINI_API_KEY,
//         }),
//         messages: requestBody.messages.map(m => ({
//           role: m.role === "assistant" ? "assistant" : "user",
//           content: m.content,
//         })),
//       });

//       console.log("Gemini cloud fallback response received successfully.");
//       return {
//         text: fallbackResult.text,
//       };
//     } catch (fallbackError) {
//       console.error("Cloud fallback also failed:", fallbackError.message);
//       return {
//         text: "Hiring Manager: Sorry, I am having trouble connecting to the interview service right now. Please check if your local server or API key is configured. [Coaching Hint: Double-check your Ollama and Google API configuration in your .env.local file.]"
//       };
//     }
//   }
// }

// export async function negotiateSalaryTurn(params) {
//   const { jobTitle, initialOffer, targetSalary, messages = [] } = params;

//   try {
//     const conversation = messages
//       .map((m) =>
//         `${m.role === "user" ? "Candidate" : "HiringManager"}: ${m.content}`
//       )
//       .join("\n");

//     const prompt = `
// You are playing the role of a realistic but fair hiring manager in a salary negotiation practice.

// Job Title: ${jobTitle || "Not specified"}
// Initial Offer: ${initialOffer || "Not specified"}
// Candidate Target Salary: ${targetSalary || "Not specified"}

// Conversation so far:
// ${conversation}

// Respond as the hiring manager.

// Rules:
// - Be realistic and professional.
// - Push back when needed.
// - Keep the reply between 2–4 sentences.
// - Occasionally give a coaching hint in brackets.
// `;

//     const { text } = await generateWithOllama({
//       prompt,
//     });

//     return {
//       success: true,
//       reply: text,
//     };
//   } catch (error) {
//     console.error("NEGOTIATION AI ERROR --->", error);

//     return {
//       success: false,
//       error: error.message || "Ollama failed.",
//     };
//   }
// }


"use server";

import { unstable_cache } from "next/cache";
import { generateObject, generateText } from "ai";
import { google } from "@/lib/ai-provider";
import { z } from "zod";
import * as admin from "firebase-admin";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { getCachedData, setCachedData, generateCacheKey } from "@/lib/cache-helpers";
import { FALLBACK_INTERVIEW_QUESTIONS, FALLBACK_FEEDBACK, FALLBACK_MOCK_TEST_QUESTIONS } from "@/lib/fallback-data";
import { withRateLimit } from "@/lib/rate-limiter";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GROQ_API_KEY;

// 🎯 1. Only gemini-2.0-flash is available in v1beta API for this account
// Other models (1.5-pro, 1.5-flash) get 404 Not Found
const FALLBACK_MODELS = [
  "gemini-2.0-flash"
];

// 🛠️ 2. Helper for generateObject with Fallback Loop + Rate Limiting
async function generateObjectWithFallback(options, userId = "anonymous") {
  let lastError;

  // Try with structured outputs first
  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName} with structured outputs...`);
      
      // Use rate limiter to prevent 429 errors (with per-user tracking)
      const result = await withRateLimit(
        async () => {
          return await generateObject({
            model: google(modelName, {
              apiKey: GEMINI_API_KEY,
              useStructuredOutputs: true
            }),
            ...options,
          });
        },
        `generateObject(${modelName}, structured=true)`,
        userId,
        { prompt: options.prompt }
      );
      
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const msg = error.message;
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
              apiKey: GEMINI_API_KEY,
              useStructuredOutputs: false
            }),
            ...options,
          });
        },
        `generateObject(${modelName}, structured=false)`,
        userId,
        { prompt: options.prompt }
      );
      
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const msg = error.message;
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
            model: google(modelName, {
              apiKey: GEMINI_API_KEY
            }),
            ...options,
          });
        },
        `generateText(${modelName})`,
        userId,
        { prompt: options.prompt }
      );
      
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const msg = error.message;
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
    // Generate cache key
    const cacheKey = generateCacheKey("interview", { role, company, difficulty, type });
    
    // Check if cached
    let questions = getCachedData(cacheKey);
    
    if (!questions) {
      try {
        // Try to call API using the wrapper for resilience (with per-user rate limiting)
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
  const { interviewId, userId, transcript, feedbackId } = params;

  console.log("🎯 [createFeedback] Starting feedback generation");
  console.log(`  - interviewId: ${interviewId}`);
  console.log(`  - userId: ${userId}`);
  console.log(`  - transcript length: ${transcript?.length || 0}`);
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
    // Generate cache key based on transcript
    const transcriptHash = transcript.length.toString();
    const cacheKey = generateCacheKey("feedback", { interviewId, transcriptHash });

    // Check if cached
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

        // Try to call API using the wrapper for resilience (with per-user rate limiting)
        const { object } = await generateObjectWithFallback({
          schema: feedbackSchema,
          prompt: `You are a STRICT technical interviewer. Evaluate this candidate:

Interview Transcript:
${formattedTranscript}

SCORE 0-100 on these 5 areas in this exact order (calculate average as totalScore):
1. Communication Skills - Clarity of explanation and articulation of thoughts.
2. Technical Knowledge - Core technical concepts correctness and accuracy.
3. Problem Solving - Systematic approach and analytical thinking.
4. Cultural Fit - Adaptability, teamwork, and growth mindset.
5. Confidence and Clarity - Appropriate confidence level and clear delivery.

RULES: Technical correctness is PRIMARY. Wrong answers stay wrong even if well-explained.

Return: totalScore (average), categoryScores (array of 5 objects matching the names above), strengths (array), areasForImprovement (array), finalAssessment (text)`,
          system:
            "You evaluate interviews. Technical correctness is your PRIMARY criterion. Wrong answers are wrong, regardless of communication quality. Be harsh but fair. Return a valid JSON matching the schema.",
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
          totalScore: FALLBACK_FEEDBACK.totalScore,
          categoryScores: [
            {
              name: "Communication Skills",
              score: FALLBACK_FEEDBACK.communicationSkills,
              comment: "Clear articulation of thoughts and ideas"
            },
            {
              name: "Technical Knowledge",
              score: FALLBACK_FEEDBACK.technicalKnowledge,
              comment: "Good foundation in technical concepts"
            },
            {
              name: "Problem Solving",
              score: FALLBACK_FEEDBACK.problemSolving,
              comment: "Logical approach to solving problems"
            },
            {
              name: "Cultural Fit",
              score: FALLBACK_FEEDBACK.culturalFit,
              comment: "Demonstrates positive attitude and alignment with engineering practices"
            },
            {
              name: "Confidence and Clarity",
              score: FALLBACK_FEEDBACK.confidenceClarity,
              comment: "Expresses answers clearly and confidently"
            }
          ],
          strengths: FALLBACK_FEEDBACK.strengths,
          areasForImprovement: FALLBACK_FEEDBACK.areasForImprovement,
          finalAssessment: FALLBACK_FEEDBACK.finalAssessment,
        };

        console.log("⚠️ [createFeedback] Using fallback feedback due to API error");
        // Cache the fallback data
        setCachedData(cacheKey, feedbackData);
      }
    }

    // Validate the feedback structure
    if (!feedbackData) {
      console.error("❌ [createFeedback] No feedback data available");
      throw new Error("No feedback object available");
    }

    // Ensure categoryScores is an array
    let categoryScores = feedbackData.categoryScores;
    if (!Array.isArray(categoryScores)) {
      console.warn("⚠️ [createFeedback] categoryScores is not an array, converting...");
      if (typeof categoryScores === "object" && categoryScores !== null) {
        categoryScores = Object.values(categoryScores).filter(item => item && typeof item === "object");
      } else {
        categoryScores = [];
      }
    }

    // Ensure other fields are arrays or strings
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
      createdAt: new Date().toISOString(),
    };

    console.log("💾 [createFeedback] Saving to Firebase...");

    let feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set(feedback);

    console.log(`✅ [createFeedback] Successfully saved feedback with ID: ${feedbackRef.id}`);

    return {
      success: true,
      feedbackId: feedbackRef.id,
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
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




const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL_NAME = process.env.OLLAMA_MODEL || "gemma3:4b";

export async function generateWithOllama(options) {
  const endpoint = `${OLLAMA_URL.replace(/\/$/, "")}/api/chat`;
  const messages =
    options.messages ?? [
      {
        role: "user",
        content: options.prompt,
      },
    ];

  const requestBody = {
    model: MODEL_NAME,
    messages,
    stream: true, // keep streaming — needed for the NDJSON parser below
    temperature: 0.3,
  };

  console.log("Messages:");
  console.log(JSON.stringify(messages, null, 2));

  // Dynamic timeout: if the model is already loaded in memory, a slow
  // response almost always means something's actually wrong — fail fast
  // and fall back to Gemini instead of hanging for 3 minutes. If the model
  // isn't loaded yet, give it a real cold-start window.
  let timeoutMs = 180000; // 3 min default for cold start
  try {
    const psController = new AbortController();
    const psTimeout = setTimeout(() => psController.abort(), 2000);
    const psRes = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/ps`, {
      signal: psController.signal,
    });
    clearTimeout(psTimeout);
    if (psRes.ok) {
      const psData = await psRes.json();
      const isLoaded = psData.models?.some(
        (m) => m.name === MODEL_NAME || m.model === MODEL_NAME
      );
      if (isLoaded) {
        timeoutMs = 90000; // loaded and healthy should respond fast
        console.log(`[Ollama] ${MODEL_NAME} already loaded — 90s timeout.`);
      } else {
        console.log(`[Ollama] ${MODEL_NAME} not loaded — 180s cold-start timeout.`);
      }
    }
  } catch (e) {
    console.warn(`[Ollama] Could not query /api/ps, using default timeout:`, e.message);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`Sending request to Ollama with ${timeoutMs / 1000}s timeout...`);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama HTTP error: ${response.status}`);
    }

    // Stream and parse the NDJSON response body chunk by chunk
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep any incomplete trailing line for next chunk

      for (const line of lines) {
        if (!line.trim()) continue;

        let json;
        try {
          json = JSON.parse(line);
        } catch {
          console.warn("[Ollama] Skipping unparseable stream line:", line.slice(0, 200));
          continue;
        }

        if (json.error) {
          throw new Error(json.error);
        }

        if (json.message?.content) {
          fullResponse += json.message.content;
          process.stdout.write(json.message.content); // live token log, optional
        }
      }
    }

    if (!fullResponse.trim()) {
      throw new Error("Ollama returned an empty response");
    }

    console.log("\n\n[Ollama] Final response:", fullResponse);
    return { text: fullResponse, source: "ollama" };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(
      "[Ollama] Query failed or timed out, falling back to Gemini:",
      error.message
    );

    try {
      if (!GEMINI_API_KEY) {
        throw new Error("No GEMINI_API_KEY set for cloud fallback.");
      }

      console.log("[Fallback] Calling Gemini (gemini-2.0-flash)...");
      const fallbackResult = await generateText({
        model: google("gemini-2.0-flash", { apiKey: GEMINI_API_KEY }),
        messages: messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      });

      console.log("[Fallback] Gemini response received.");
      return { text: fallbackResult.text, source: "gemini_fallback" };
    } catch (fallbackError) {
      console.error("[Fallback] Gemini also failed:", fallbackError.message);
      return {
        text:
          "Hiring Manager: Sorry, I'm having trouble connecting to the interview service right now. Please check your local Ollama server or API key configuration. [Coaching Hint: Verify Ollama is running and GEMINI_API_KEY is set in .env.local.]",
        source: "static_fallback",
      };
    }
  }
}

export async function negotiateSalaryTurn(params) {
  const { jobTitle, initialOffer, targetSalary, messages = [] } = params;

  try {
    console.log("Start:", new Date().toISOString());

    const conversation = messages
      .map((m) => `${m.role === "user" ? "Candidate" : "HiringManager"}: ${m.content}`)
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

    const { text, source } = await generateWithOllama({ prompt });

    console.log("End:", new Date().toISOString(), "| source:", source);

    return {
      success: true,
      reply: text,
      source, // lets the frontend show "answered by Gemini fallback" if you want that transparency
    };
  } catch (error) {
    console.error("NEGOTIATION AI ERROR:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}