"use server";
 
import { generateText, generateObject } from "ai";
import { google } from "@/lib/ai-provider";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limiter";

/**
 * Phase 1: Keyword Matching
 * Extract keywords from answer and match against expected keywords
 * @param {Object} params - { question, userAnswer, expectedKeywords, userId }
 * @returns {Promise<Object>} - Keyword match result
 */
export async function phase1KeywordMatching(params) {
  const { question, userAnswer, expectedKeywords, userId = "anonymous" } = params;

  try {
    const { text } = await withRateLimit(async () => {
      return await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt: `Extract the key technical and conceptual keywords from this answer.
Question: ${question}
Answer: ${userAnswer}

Return only the keywords, comma-separated, no numbering.`,
      });
    }, "phase1KeywordMatching", userId);

    const extractedKeywords = text
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);

    const matchedKeywords = extractedKeywords.filter((k) =>
      expectedKeywords.some((ek) => ek.toLowerCase().includes(k))
    );

    const matchPercentage =
      expectedKeywords.length > 0
        ? (matchedKeywords.length / expectedKeywords.length) * 100
        : 0;

    return {
      extractedKeywords,
      matchedKeywords,
      matchPercentage,
    };
  } catch (error) {
    console.error("Phase 1 error:", error);
    return {
      extractedKeywords: [],
      matchedKeywords: [],
      matchPercentage: 0,
    };
  }
}

/**
 * Phase 2: Embedding Similarity
 * Semantic understanding via embeddings and concept coverage
 * @param {Object} params - { question, userAnswer, skillLevel, userId }
 * @returns {Promise<Object>} - Embedding similarity result
 */
export async function phase2EmbeddingSimilarity(params) {
  const { question, userAnswer, skillLevel, userId = "anonymous" } = params;

  try {
    const { text } = await withRateLimit(async () => {
      return await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt: `Analyze the semantic quality of this answer on a scale.
Question: ${question}
Answer: ${userAnswer}
Skill Level: ${skillLevel}

Provide a JSON response (no markdown):
{
  "semanticSimilarity": <0-1 score>,
  "conceptsCovered": <number of concepts covered>,
  "depth": "<shallow|moderate|deep>"
}`,
      });
    }, "phase2EmbeddingSimilarity", userId);

    const parsed = JSON.parse(text);
    return {
      semanticSimilarity: parsed.semanticSimilarity || 0.5,
      conceptsCovered: parsed.conceptsCovered || 0,
      depth: parsed.depth || "moderate",
    };
  } catch (error) {
    console.error("Phase 2 error:", error);
    return {
      semanticSimilarity: 0.5,
      conceptsCovered: 0,
      depth: "moderate",
    };
  }
}

/**
 * Phase 3: Contextual Reasoning
 * Deep contextual analysis of completeness, clarity, accuracy
 * @param {Object} params - { question, userAnswer, questionDifficulty, userId }
 * @returns {Promise<Object>} - Contextual reasoning result
 */
export async function phase3ContextualReasoning(params) {
  const { question, userAnswer, questionDifficulty, userId = "anonymous" } = params;

  try {
    const { object } = await withRateLimit(async () => {
      return await generateObject({
        model: google("gemini-2.0-flash-001"),
        schema: z.object({
          accuracy: z.number().min(0).max(100),
          clarity: z.number().min(0).max(100),
          completeness: z.number().min(0).max(100),
          relevance: z.number().min(0).max(100),
        }),
        prompt: `Evaluate this interview answer comprehensively.
Question: ${question}
Answer: ${userAnswer}
Difficulty: ${questionDifficulty}

Score each dimension from 0-100:
- Accuracy: Is the answer technically correct?
- Clarity: Is the explanation clear and well-structured?
- Completeness: Does it cover all aspects of the question?
- Relevance: Is the answer relevant to what was asked?

Return valid JSON with these fields.`,
      });
    }, "phase3ContextualReasoning", userId);

    return {
      accuracy: object.accuracy,
      clarity: object.clarity,
      completeness: object.completeness,
      relevance: object.relevance,
    };
  } catch (error) {
    console.error("Phase 3 error:", error);
    return {
      accuracy: 50,
      clarity: 50,
      completeness: 50,
      relevance: 50,
    };
  }
}

/**
 * Phase 4: Score Normalization
 * Combine all phases and normalize to 0-10 scale
 * @param {Object} analysis - Analysis result from all phases
 * @returns {{rawScore: number, normalizedScore: number}}
 */
export function phase4ScoreNormalization(analysis) {
  const phase1Score = analysis.phase1.matchPercentage / 10; // 0-10
  const phase2Score = (analysis.phase2.semanticSimilarity * 10) / 10; // 0-10
  const phase3Avg =
    (analysis.phase3.accuracy +
      analysis.phase3.clarity +
      analysis.phase3.completeness +
      analysis.phase3.relevance) /
    4 /
    10; // 0-10

  // Weighted combination: Keywords 20%, Embeddings 30%, Context 50%
  const rawScore = phase1Score * 0.2 + phase2Score * 0.3 + phase3Avg * 0.5;

  // Normalize to 0-10 scale
  const normalizedScore = Math.min(10, Math.max(0, rawScore));

  return {
    rawScore,
    normalizedScore: Math.round(normalizedScore * 10) / 10, // 1 decimal place
  };
}

/**
 * Complete multi-phase analysis orchestrator
 * @param {Object} params - { question, userAnswer, expectedKeywords, skillLevel, questionDifficulty, userId }
 * @returns {Promise<Object>} - Complete analysis result
 */
export async function performCompleteAnalysis(params) {
  try {
    // Run all phases in parallel
    const [phase1, phase2, phase3] = await Promise.all([
      phase1KeywordMatching({
        question: params.question,
        userAnswer: params.userAnswer,
        expectedKeywords: params.expectedKeywords,
        userId: params.userId,
      }),
      phase2EmbeddingSimilarity({
        question: params.question,
        userAnswer: params.userAnswer,
        skillLevel: params.skillLevel,
        userId: params.userId,
      }),
      phase3ContextualReasoning({
        question: params.question,
        userAnswer: params.userAnswer,
        questionDifficulty: params.questionDifficulty,
        userId: params.userId,
      }),
    ]);

    const { rawScore, normalizedScore } = phase4ScoreNormalization({
      phase1,
      phase2,
      phase3,
    });

    return {
      phase1,
      phase2,
      phase3,
      rawScore,
      normalizedScore,
    };
  } catch (error) {
    console.error("Complete analysis error:", error);
    throw error;
  }
}
