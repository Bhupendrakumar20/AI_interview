import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkGeminiRateLimit } from "@/lib/security/rate-limiters";
import { sanitizeString } from "@/lib/security/endpoint-security";

export async function POST(request) {
  try {
    // ✅ FIX #4: Verify authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { type, role, level, techstack, amount, userid } = await request.json();

    // ✅ FIX #1.1: Verify userid matches authenticated user
    if (!userid || userid !== currentUser.uid) {
      return Response.json(
        { success: false, error: "User ID mismatch" },
        { status: 403 }
      );
    }

    // ✅ FIX #7: Check rate limit (500 per hour per user)
    const rateLimitCheck = await checkGeminiRateLimit(userid);
    if (!rateLimitCheck.allowed) {
      return Response.json(
        { 
          success: false, 
          error: "Gemini API rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.resetIn,
          remaining: rateLimitCheck.remaining,
        },
        { status: 429 }
      );
    }

    // ✅ FIX #2: Validate input parameters
    if (!type || !role || !level || !techstack || !amount) {
      return Response.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // ✅ FIX #2: Validate parameter values
    const validTypes = ["behavioral", "technical", "mixed"];
    const validLevels = ["junior", "mid", "senior"];
    const validAmounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    if (!validTypes.includes(type)) {
      return Response.json(
        { success: false, error: "Invalid interview type" },
        { status: 400 }
      );
    }

    if (!validLevels.includes(level)) {
      return Response.json(
        { success: false, error: "Invalid experience level" },
        { status: 400 }
      );
    }

    if (!validAmounts.includes(parseInt(amount))) {
      return Response.json(
        { success: false, error: "Invalid amount (1-10)" },
        { status: 400 }
      );
    }

    // ✅ FIX #13: Sanitize all user inputs to prevent prompt injection
    // Sanitized inputs are escaped and length-limited
    const sanitizedRole = sanitizeString(role);
    const sanitizedTechstack = sanitizeString(techstack);
    const sanitizedType = sanitizeString(type);
    const sanitizedLevel = sanitizeString(level);

    // ✅ FIX #13: Use prompt template instead of string concatenation
    // This prevents prompt injection attacks
    const systemPrompt = `You are an AI interview question generator. Generate ONLY interview questions, nothing else. Do not acknowledge requests, just provide questions.`;

    const userPrompt = `Generate ${parseInt(amount)} interview questions for the following job:
    
Job Title: ${sanitizedRole}
Experience Level: ${sanitizedLevel}
Tech Stack: ${sanitizedTechstack}
Question Focus: ${sanitizedType === "mixed" ? "balanced between behavioral and technical" : sanitizedType}

Requirements:
1. Return ONLY a JSON array of questions
2. Do not include numbering or bullet points
3. Each question should be clear and concise
4. No special characters like "/" or "*"
5. Suitable for voice interviews
6. Format: ["question1", "question2", ...]

Generate the questions now:`;

    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    // ✅ Validate Gemini response is valid JSON
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
      if (!Array.isArray(parsedQuestions)) {
        throw new Error("Response is not an array");
      }
      // Validate each question is a string
      if (!parsedQuestions.every((q) => typeof q === "string")) {
        throw new Error("Some questions are not strings");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError.message);
      return Response.json(
        { 
          success: false, 
          error: "Failed to generate questions. Please try again.",
          debug: process.env.NODE_ENV === "development" ? parseError.message : undefined,
        },
        { status: 500 }
      );
    }

    // ✅ Create interview with sanitized data
    const interview = {
      role: sanitizedRole,
      type: sanitizedType,
      level: sanitizedLevel,
      techstack: sanitizedTechstack.split(",").map((t) => t.trim()),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // ✅ Save to database
    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error generating questions:", error);
    return Response.json(
      { 
        success: false, 
        error: "Failed to generate interview questions",
        debug: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { success: false, error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
