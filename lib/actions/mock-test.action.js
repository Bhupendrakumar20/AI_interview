"use server";

import { generateObject, generateText } from "ai";
import { google } from "@/lib/ai-provider";
import { z } from "zod";
import {
  MOCK_TEST_COMPANIES,
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
} from "@/lib/mock-test-constants";
import { getCachedData, setCachedData, generateCacheKey } from "@/lib/cache-helpers";
import { FALLBACK_MOCK_TEST_QUESTIONS } from "@/lib/fallback-data";
import { withRateLimit } from "@/lib/rate-limiter";

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;

// Define fallback models in order of preference
const FALLBACK_MODELS = ["gemini-2.0-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

// Helper to query Ollama for structured JSON
async function generateWithOllamaStructured(prompt, schema) {
  const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  const MODEL_NAME = process.env.OLLAMA_MODEL || "gemma3:4b";

  try {
    console.log(`🤖 Attempting Ollama query on model: ${MODEL_NAME}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for fast response

    const response = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: false,
        format: "json",
        options: {
          temperature: 0.3,
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama HTTP status ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.message?.content;

    if (!textContent) {
      throw new Error("Ollama returned empty content");
    }

    const parsedJson = JSON.parse(textContent);
    
    // Validate with zod schema
    const validated = schema.parse(parsedJson);
    console.log("✅ Success with Ollama!");
    return { object: validated };
  } catch (error) {
    console.warn(`⚠️ Ollama structured generation failed: ${error.message}. Falling back to Gemini...`);
    throw error;
  }
}

// Helper for generateObject with Fallback Loop
async function generateObjectWithFallback(options, userId = "anonymous") {
  let lastError;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName} with rate limiter...`);
      const result = await withRateLimit(
        async () => {
          return await generateObject({
            model: google(modelName, {
              apiKey: GEMINI_API_KEY,
            }),
            ...options,
          });
        },
        `generateObject(${modelName})`,
        userId
      );
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      console.warn(`⚠️ Model ${modelName} failed. Reason: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All fallback models failed.");
}

const mockTestQuestionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      expectedAnswer: z.string(),
      tips: z.array(z.string()),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
    })
  ),
});

export async function generateMockTestQuestions(params) {
  const {
    company,
    role = "Software Engineer",
    difficulty = "Medium",
    questionType = "Technical",
    count = 5,
    userId = "anonymous",
  } = params;

  try {
    console.log(
      `Generating mock test questions for ${company} - ${role} (${difficulty}) [Type: ${questionType}]`
    );

    // Generate cache key
    const cacheKey = generateCacheKey("mocktest", { company, role, difficulty, questionType, count });
    
    // Check if cached
    let questions = getCachedData(cacheKey);
    
    if (!questions) {
      const prompt = `
        You are an expert interviewer for ${company}.
        Generate exactly ${count} mock interview questions for the position of ${role}.
        
        Requirements:
        - Difficulty Level: ${difficulty}
        - Question Type: ${questionType} (Generate questions appropriate for a ${questionType} interview round. No coding/syntax questions for Behavioral or System Design rounds!)
        - Company: ${company}
        - Role: ${role}
        
        For each question, provide:
        1. The question itself (specific and realistic)
        2. An expected answer or approach (for Behavioral, explain the expected STAR method approach)
        3. 3-4 tips for answering well
        4. Difficulty level (Easy/Medium/Hard)
        
        Return as a JSON object with a single "questions" key containing the array of question objects:
        {
          "questions": [
            {
              "question": "...",
              "expectedAnswer": "...",
              "tips": ["...", "..."],
              "difficulty": "Medium"
            }
          ]
        }
      `;

      try {
        let responseObj;
        
        // 1. Try Ollama first
        try {
          responseObj = await generateWithOllamaStructured(prompt, mockTestQuestionSchema);
        } catch (ollamaError) {
          // 2. Fallback to Gemini
          responseObj = await generateObjectWithFallback({
            schema: mockTestQuestionSchema,
            prompt: prompt,
            system: `You are an expert interviewer. Generate realistic, thoughtful interview questions that match the company's actual interview style, round type, and standards.`,
          }, userId);
        }

        const object = responseObj.object;
        if (object.questions && Array.isArray(object.questions)) {
          questions = object.questions;
          setCachedData(cacheKey, questions);
        } else {
          throw new Error("Invalid response format from AI");
        }
      } catch (apiError) {
        console.error("AI Generation failed, using type-specific static fallbacks:", apiError);
        
        // Use type-specific fallback data
        const staticFallbacks = FALLBACK_MOCK_TEST_QUESTIONS[questionType] || FALLBACK_MOCK_TEST_QUESTIONS["Technical"];
        questions = staticFallbacks;
        
        setCachedData(cacheKey, questions);
      }
    }

    return {
      success: true,
      questions,
      company,
      role,
      difficulty,
      questionType,
      totalQuestions: questions?.length || 0,
    };
  } catch (error) {
    console.error("Error generating mock test questions:", error);
    return {
      success: false,
      error: error.message,
      questions: [],
    };
  }
}

export async function getMockTestQuestions(filters = {}) {
  const {
    company = "Google",
    role = "Software Engineer",
    difficulty = "Medium",
    questionType = "Technical",
    count = 5,
    userId = "anonymous",
  } = filters;

  // Validate inputs
  if (!MOCK_TEST_COMPANIES.includes(company)) {
    return {
      success: false,
      error: `Company ${company} not found in available companies`,
      companies: MOCK_TEST_COMPANIES,
    };
  }

  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    return {
      success: false,
      error: `Difficulty level ${difficulty} not supported`,
      difficulties: DIFFICULTY_LEVELS,
    };
  }

  if (!QUESTION_TYPES.includes(questionType)) {
    return {
      success: false,
      error: `Question type ${questionType} not supported`,
      types: QUESTION_TYPES,
    };
  }

  return await generateMockTestQuestions({
    company,
    role,
    difficulty,
    questionType,
    count,
    userId,
  });
}

export async function getAvailableFilters() {
  return {
    companies: MOCK_TEST_COMPANIES,
    difficulties: DIFFICULTY_LEVELS,
    types: QUESTION_TYPES,
  };
}