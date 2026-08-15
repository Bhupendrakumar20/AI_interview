"use server";

import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  MOCK_TEST_COMPANIES,
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
} from "@/lib/mock-test-constants";
import { getCachedData, setCachedData, generateCacheKey } from "@/lib/cache-helpers";
import { withRateLimit } from "@/lib/rate-limiter";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Helper to choose the provider instance
function getModel(modelName) {
  if (modelName.startsWith("llama") || modelName.includes("gpt-oss")) {
    return groq(modelName);
  }
  return google(modelName);
}

// Use the verified model ID from the curl check above, with a solid fallback
const FALLBACK_MODELS = process.env.GROQ_API_KEY
  ? ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]
  : ["gemini-2.5-flash", "gemini-1.5-flash"];
/**
 * Strips markdown code fences around a JSON array (used for tips).
 */
function extractJsonArray(text) {
  if (!text) throw new Error("Empty response from model");

  let cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Runs a text prompt through Ollama first, then the cloud fallback chain.
 * Returns raw text — no structured-output mode used anywhere.
 */
async function generateTextWithFallback({ system, prompt, userId = "anonymous" }) {
  // 1. Try local Ollama first
  try {
    const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
    const MODEL_NAME = process.env.OLLAMA_MODEL || "gemma3:4b";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000);

   const response = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    stream: false,
    options: { temperature: 0.3 },
  }),
  signal: controller.signal,
});
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Ollama HTTP status ${response.status}`);
    const data = await response.json();
    const text = data.message?.content || data.response;
    if (!text) throw new Error("Ollama returned empty content");
    console.log("✅ Success with Ollama!");
    return text;
  } catch (ollamaError) {
    console.warn(`⚠️ Ollama failed: ${ollamaError.message}. Falling back to cloud...`);
  }

  // 2. Cloud fallback chain (Groq / Gemini) — plain generateText, no schema mode
  let lastError;
  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName} with rate limiter...`);
      const response = await withRateLimit(
        async () => generateText({ model: getModel(modelName), system, prompt }),
        `generateText(${modelName})`,
        userId,
        { model: modelName, prompt }
      );
      console.log(`✅ Success with model: ${modelName}`);
      return response.text;
    } catch (error) {
      console.warn(`⚠️ Model ${modelName} failed. Reason: ${error.message}`);
      lastError = error;
    }
  }
  throw lastError || new Error("All fallback models failed.");
}

/** Fetches the expected answer for ONE question — called only when the user clicks the button. */
export async function getQuestionAnswer({ question, company, role, difficulty, userId = "anonymous" }) {
  try {
    const cacheKey = generateCacheKey("mocktest-answer", { question, company, role });
    const cached = getCachedData(cacheKey);
    if (cached) return { success: true, answer: cached };

    const prompt = `
Question: "${question}"
Company: ${company}
Role: ${role}
Difficulty: ${difficulty}

Give a clear, structured expected answer or approach (use the STAR method if it's a behavioral question).
Respond in plain text, no JSON, no markdown headers — just the explanation, 3-6 sentences.
`;
    const text = await generateTextWithFallback({
      system: "You are an expert interviewer providing model answers to candidates.",
      prompt,
      userId,
    });

    const answer = text.trim();
    setCachedData(cacheKey, answer);
    return { success: true, answer };
  } catch (error) {
    console.error("Error generating expected answer:", error);
    return { success: false, error: error.message };
  }
}

/** Fetches tips for ONE question — called only when the user clicks the button. */
export async function getQuestionTips({ question, company, role, difficulty, userId = "anonymous" }) {
  try {
    const cacheKey = generateCacheKey("mocktest-tips", { question, company, role });
    const cached = getCachedData(cacheKey);
    if (cached) return { success: true, tips: cached };

    const prompt = `
Question: "${question}"
Company: ${company}
Role: ${role}
Difficulty: ${difficulty}

Give exactly 3 short, actionable tips for answering this well in an interview.
Return ONLY a JSON array of 3 strings, no markdown fences, no commentary:
["tip 1", "tip 2", "tip 3"]
`;
    const text = await generateTextWithFallback({
      system: "You are an expert interview coach. Respond with ONLY a valid JSON array.",
      prompt,
      userId,
    });

    const tips = extractJsonArray(text);
    if (!Array.isArray(tips) || tips.length === 0) {
      throw new Error("Tips response was not a usable array");
    }

    setCachedData(cacheKey, tips);
    return { success: true, tips };
  } catch (error) {
    console.error("Error generating tips:", error);
    return { success: false, error: error.message };
  }
}

export async function getAvailableFilters() {
  return {
    companies: MOCK_TEST_COMPANIES,
    difficulties: DIFFICULTY_LEVELS,
    types: QUESTION_TYPES,
  };
}