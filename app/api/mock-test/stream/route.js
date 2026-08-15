import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { DIFFICULTY_LEVELS } from "@/lib/mock-test-constants";
import { getCachedData, setCachedData, generateCacheKey } from "@/lib/cache-helpers";
import { FALLBACK_MOCK_TEST_QUESTIONS } from "@/lib/fallback-data";
import { withRateLimit } from "@/lib/rate-limiter";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

function getModel(modelName) {
  if (modelName.startsWith("llama") || modelName.includes("gpt-oss")) {
    return groq(modelName);
  }
  return google(modelName);
}

// Use the verified model ID from the curl check above, with a solid fallback
const FALLBACK_MODELS = process.env.GROQ_API_KEY
  ? ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]
  : ["gemini-3.5-flash-lite", "gemini-1.5-flash"];
/**
 * Strips markdown code fences and any stray text around a JSON blob.
 */
function extractJson(text) {
  if (!text) throw new Error("Empty response from model");

  let cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
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
    const timeoutId = setTimeout(() => controller.abort(), 1200000);

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

function getStaticFallbackQuestion(questionType, index) {
  const list = FALLBACK_MOCK_TEST_QUESTIONS[questionType] || FALLBACK_MOCK_TEST_QUESTIONS["Technical"];
  const item = list[index % list.length];
  return {
    question: item.question,
    difficulty: item.difficulty || "Medium",
  };
}

/** Generates ONE question (question text + difficulty only). */
async function generateOneQuestion({ company, role, difficulty, questionType, index }, userId) {
  const prompt = `
Generate exactly 1 unique mock interview question (question #${index + 1} in a set) for the position of ${role} at ${company}.

Requirements:
- Difficulty Level: ${difficulty}
- Question Type: ${questionType}

Return ONLY a JSON object, no markdown fences, no commentary:
{ "question": "The question text", "difficulty": "${difficulty}" }
`;

  try {
    const text = await generateTextWithFallback({
      system: "You are an expert technical interviewer. Respond with ONLY valid JSON.",
      prompt,
      userId,
    });
    const parsed = extractJson(text);
    if (!parsed.question || typeof parsed.question !== "string") {
      throw new Error("Malformed question object");
    }
    return {
      question: parsed.question.trim(),
      difficulty: DIFFICULTY_LEVELS.includes(parsed.difficulty) ? parsed.difficulty : difficulty,
    };
  } catch (error) {
    console.error(`Question ${index + 1} generation failed, using static fallback:`, error.message);
    return getStaticFallbackQuestion(questionType, index);
  }
}

/**
 * POST /api/mock-test/stream
 *
 * Streams NDJSON (one JSON object per line). Each line contains the FULL
 * questions array generated so far, plus a `done` flag. The client reads
 * this with fetch() + ReadableStream reader — no "ai/rsc" dependency.
 *
 * Body: { company, role, difficulty, questionType, count, userId }
 */
export async function POST(req) {
  const body = await req.json();
  const {
    company,
    role = "Software Engineer",
    difficulty = "Medium",
    questionType = "Technical",
    count = 5,
    userId = "anonymous",
  } = body;

  const cacheKey = generateCacheKey("mocktest-list", { company, role, difficulty, questionType, count });
  const cached = getCachedData(cacheKey);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (cached) {
          controller.enqueue(encoder.encode(JSON.stringify({ questions: cached, done: true }) + "\n"));
          controller.close();
          return;
        }

        const questions = [];
        for (let i = 0; i < count; i++) {
          const q = await generateOneQuestion({ company, role, difficulty, questionType, index: i }, userId);
          questions.push(q);
          const isLast = i === count - 1;
          controller.enqueue(
            encoder.encode(JSON.stringify({ questions: [...questions], done: isLast }) + "\n")
          );
        }

        setCachedData(cacheKey, questions);
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: error.message || "Generation failed", done: true }) + "\n")
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}