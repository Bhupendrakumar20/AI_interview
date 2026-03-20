"use server";

import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  MOCK_TEST_COMPANIES,
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
} from "@/lib/mock-test-constants";

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

// Define fallback models in order of preference
const FALLBACK_MODELS = ["gemini-2.0-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

// Helper for generateObject with Fallback Loop
async function generateObjectWithFallback(options) {
  let lastError;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${modelName}...`);
      const result = await generateObject({
        model: google(modelName, {
          apiKey: GEMINI_API_KEY,
        }),
        ...options,
      });
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
  } = params;

  try {
    console.log(
      `Generating mock test questions for ${company} - ${role} (${difficulty})`
    );

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
    });

    if (object.questions && Array.isArray(object.questions)) {
      return {
        success: true,
        questions: object.questions,
        company,
        role,
        difficulty,
        questionType,
        totalQuestions: object.questions.length,
      };
    } else {
      throw new Error("Invalid response format from AI");
    }
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
  });
}

export async function getAvailableFilters() {
  return {
    companies: MOCK_TEST_COMPANIES,
    difficulties: DIFFICULTY_LEVELS,
    types: QUESTION_TYPES,
  };
}
