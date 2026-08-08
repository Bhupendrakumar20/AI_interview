import { GoogleGenerativeAI } from "@/lib/ai-provider";
import { withRateLimit } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkGeminiRateLimit } from "@/lib/security/rate-limiters";
import { NextResponse } from "next/server";
import { db } from "@/firebase/admin";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GROQ_API_KEY);

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const rateLimitCheck = await checkGeminiRateLimit(currentUser.uid);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Gemini API rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.resetIn,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { answers, parsedResume, focusArea } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 });
    }

    // Try local Ollama model first if available
    const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
    const MODEL_NAME = process.env.OLLAMA_MODEL || "gemma3:4b";
    
    let evaluationData = null;

    try {
      console.log(`🤖 Attempting Ollama query on model: ${MODEL_NAME} for resume verification...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const prompt = `
        You are a technical interviewer verifying a candidate's resume claims.
        Evaluate their answers to the verification questions and determine if they actually did the projects/work claimed on their resume.
        
        Focus Area: ${focusArea || "General"}
        Resume context:
        ${JSON.stringify(parsedResume || {})}
        
        Interview Q&A:
        ${answers.map((a, i) => `Question ${i+1}: ${a.question}\nAnswer ${i+1}: ${a.answer}`).join("\n\n")}
        
        Return a JSON response with format:
        {
          "trustScore": 85,
          "verdict": "VERIFIED | PARTIALLY_VERIFIED | UNVERIFIED",
          "feedback": "Provide detailed feedback on how well they verified their claims, their strengths, weaknesses, and whether they showed authentic technical depth."
        }
      `;

      const response = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          format: "json",
          options: { temperature: 0.3 }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const textContent = data.message?.content;
        if (textContent) {
          evaluationData = JSON.parse(textContent);
          console.log("✅ Success evaluating with Ollama!");
        }
      }
    } catch (ollamaError) {
      console.warn("Ollama evaluation failed, falling back to Gemini:", ollamaError.message);
    }

    // Fallback to Gemini if Ollama was not successful
    if (!evaluationData) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("No API key available for fallback");

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `
        You are a technical interviewer verifying a candidate's resume claims.
        Evaluate their answers to the verification questions and determine if they actually did the projects/work claimed on their resume.
        
        Focus Area: ${focusArea || "General"}
        Resume context:
        ${JSON.stringify(parsedResume || {})}
        
        Interview Q&A:
        ${answers.map((a, i) => `Question ${i+1}: ${a.question}\nAnswer ${i+1}: ${a.answer}`).join("\n\n")}
        
        Return a JSON response (DO NOT include markdown wrappers, return ONLY the raw JSON object):
        {
          "trustScore": 85,
          "verdict": "VERIFIED",
          "feedback": "Detailed evaluation feedback text here."
        }
      `;

      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        evaluationData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (parseErr) {
        evaluationData = {
          trustScore: 75,
          verdict: "PARTIALLY_VERIFIED",
          feedback: text
        };
      }
    }

    try {
      await db.collection("users").doc(currentUser.uid).collection("resume_reports").add({
        trustScore: evaluationData.trustScore,
        verdict: evaluationData.verdict,
        feedback: evaluationData.feedback,
        focusArea: focusArea || "General",
        answers,
        createdAt: new Date(),
      });
      console.log("📝 Saved resume evaluation feedback to user subcollection.");
    } catch (dbErr) {
      console.error("Failed to save resume evaluation report:", dbErr);
    }

    return NextResponse.json({
      success: true,
      trustScore: evaluationData.trustScore,
      verdict: evaluationData.verdict,
      feedback: evaluationData.feedback
    });

  } catch (error) {
    console.error("Error during interview evaluation:", error);
    return NextResponse.json(
      { error: "Failed to evaluate interview", details: error.message },
      { status: 500 }
    );
  }
}
