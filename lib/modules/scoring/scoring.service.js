"use server";
 
import { generateObject } from "ai";
import { google } from "@/lib/ai-provider";
import { z } from "zod";
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

/**
 * Calculate Technical Score
 * Based on: accuracy, depth of knowledge, completeness
 * @param {Object} analysis - Analysis result from complete analysis
 * @returns {number} - Technical score 0-10
 */
export function calculateTechnicalScore(analysis) {
  const accuracy = analysis.phase3.accuracy / 10;
  const depth =
    (analysis.phase2.depth === "deep"
      ? 8
      : analysis.phase2.depth === "moderate"
        ? 5
        : 2) / 10;
  const completeness = analysis.phase3.completeness / 10;

  const technicalScore = accuracy * 0.4 + depth * 0.35 + completeness * 0.25;
  return Math.min(10, Math.max(0, technicalScore));
}

/**
 * Calculate Communication Score
 * Based on: clarity, articulation, structure
 * @param {Object} analysis - Analysis result from complete analysis
 * @returns {number} - Communication score 0-10
 */
export function calculateCommunicationScore(analysis) {
  // Estimate from clarity and relevance scores
  const clarity = analysis.phase3.clarity / 10;
  const relevance = analysis.phase3.relevance / 10;

  const communicationScore = clarity * 0.6 + relevance * 0.4;
  return Math.min(10, Math.max(0, communicationScore));
}

/**
 * Calculate Confidence Score
 * Based on: answer completeness and semantic depth
 * @param {Object} analysis - Analysis result from complete analysis
 * @returns {number} - Confidence score 0-10
 */
export function calculateConfidenceScore(analysis) {
  const semanticDepth = analysis.phase2.semanticSimilarity;
  const completeness = analysis.phase3.completeness / 100;

  const confidenceScore = semanticDepth * 0.6 + completeness * 0.4;
  return Math.min(10, Math.max(0, confidenceScore * 10));
}

/**
 * Generate weighted final score
 * Weighted: Technical 40%, Communication 30%, Confidence 30%
 * @param {Object} scores - { technicalScore, communicationScore, confidenceScore }
 * @returns {number} - Weighted score 0-10
 */
export function generateWeightedFinalScore(scores) {
  const weighted =
    scores.technicalScore * 0.4 +
    scores.communicationScore * 0.3 +
    scores.confidenceScore * 0.3;

  return Math.min(10, Math.max(0, weighted));
}

/**
 * Normalize score to 0-10 scale
 * @param {number} rawScore - Raw score value
 * @returns {number} - Normalized score 0-10
 */
export function normalizeScore(rawScore) {
  const scaled = (rawScore / 100) * 10;
  return Math.min(10, Math.max(0, Math.round(scaled * 10) / 10));
}

/**
 * Generate comprehensive interview scores from analysis results
 * @param {Object} params - { transcripts, analysisResults, userId }
 * @param {string} skillLevel - "beginner|intermediate|advanced"
 * @returns {Promise<Object>} - Comprehensive scores with breakdown
 */
export async function generateComprehensiveScores(
  params,
  skillLevel = "intermediate"
) {
  try {
    const { transcripts, analysisResults, userId = "anonymous" } = params;

    // Calculate per-question scores
    const questionScores = analysisResults.map((analysis) => ({
      technical: calculateTechnicalScore(analysis),
      communication: calculateCommunicationScore(analysis),
      confidence: calculateConfidenceScore(analysis),
    }));

    // Average scores across all questions
    const avgTechnical =
      questionScores.length > 0
        ? questionScores.reduce((sum, q) => sum + q.technical, 0) /
          questionScores.length
        : 0;
    const avgCommunication =
      questionScores.length > 0
        ? questionScores.reduce((sum, q) => sum + q.communication, 0) /
          questionScores.length
        : 0;
    const avgConfidence =
      questionScores.length > 0
        ? questionScores.reduce((sum, q) => sum + q.confidence, 0) /
          questionScores.length
        : 0;

    // Generate weighted final score
    const weightedScore = generateWeightedFinalScore({
      technicalScore: avgTechnical,
      communicationScore: avgCommunication,
      confidenceScore: avgConfidence,
    });

    // Normalize to 0-10 scale
    const normalizedScore = Math.round(weightedScore * 10) / 10;

    // Get detailed breakdown from Gemini
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        technicalAccuracy: z.number().min(0).max(100),
        technicalDepth: z.number().min(0).max(100),
        technicalCompleteness: z.number().min(0).max(100),
        communicationClarity: z.number().min(0).max(100),
        communicationArticulation: z.number().min(0).max(100),
        communicationStructure: z.number().min(0).max(100),
        confidenceCertainty: z.number().min(0).max(100),
        confidenceEngagement: z.number().min(0).max(100),
        confidenceResponsiveness: z.number().min(0).max(100),
      }),
      prompt: `Analyze the interview transcripts and provide detailed scoring.
      
Transcripts:
${transcripts.map((t, i) => `Q${i + 1}: ${t.question}\nA: ${t.answer}`).join("\n\n")}
 
Skill Level: ${skillLevel}

Score each dimension 0-100 and return valid JSON with all required fields.`,
    }, userId);

    return {
      technicalScore: avgTechnical,
      communicationScore: avgCommunication,
      confidenceScore: avgConfidence,
      weightedScore,
      normalizedScore,
      breakdown: {
        technical: {
          accuracy: object.technicalAccuracy,
          depth: object.technicalDepth,
          completeness: object.technicalCompleteness,
        },
        communication: {
          clarity: object.communicationClarity,
          articulation: object.communicationArticulation,
          structure: object.communicationStructure,
        },
        confidence: {
          certainty: object.confidenceCertainty,
          engagement: object.confidenceEngagement,
          responsiveness: object.confidenceResponsiveness,
        },
      },
    };
  } catch (error) {
    console.error("Error generating scores:", error);
    // Return default if generation fails
    return {
      technicalScore: 0,
      communicationScore: 0,
      confidenceScore: 0,
      weightedScore: 0,
      normalizedScore: 0,
      breakdown: {
        technical: { accuracy: 0, depth: 0, completeness: 0 },
        communication: { clarity: 0, articulation: 0, structure: 0 },
        confidence: { certainty: 0, engagement: 0, responsiveness: 0 },
      },
    };
  }
}
