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
      `Generating mock test questions for ${company} - ${role} (${difficulty})`
    );

    // Generate cache key
    const cacheKey = generateCacheKey("mocktest", { company, role, difficulty, questionType, count });
    
    // Check if cached
    let questions = getCachedData(cacheKey);
    
    if (!questions) {
      try {
        // Try to call API using the resilient fallback wrapper
        const { object } = await generateObjectWithFallback({
          schema: mockTestQuestionSchema,
          prompt: `
            You are an expert technical interviewer for ${company}.
            Generate ${count} mock interview questions for the position of ${role}.
            
            Requirements:
            - Difficulty Level: ${difficulty}
            - Question Type: ${questionType}
            - Company: ${company}
            - Role: ${role}
            
            For each question, provide:
            1. The question itself (specific and realistic)
            2. An expected answer or approach
            3. 3-4 tips for answering well
            4. Difficulty level (Easy/Medium/Hard)
            
            Make the questions realistic and similar to what ${company} actually asks.
            Include company-specific context or tech stack when relevant.
            
            Return as a JSON array of question objects with fields: question, expectedAnswer, tips, difficulty.
          `,
          system: `You are an expert technical interviewer. Generate realistic, thoughtful interview questions that match the company's actual interview style and standards.`,
        }, userId);

        if (object.questions && Array.isArray(object.questions)) {
          questions = object.questions;
          
          // Cache the result
          setCachedData(cacheKey, questions);
        } else {
          throw new Error("Invalid response format from AI");
        }
      } catch (apiError) {
        console.error("API call failed, using fallback mock test questions:", apiError);
        
        // Use fallback data
        questions = FALLBACK_MOCK_TEST_QUESTIONS;
        
        // Cache the fallback data
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