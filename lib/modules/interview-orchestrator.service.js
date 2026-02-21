"use server";

import { getCurrentAuthenticatedUser } from "@/lib/modules/auth/auth.service.js";
import {
  saveInterviewConfiguration,
  fetchQuestionBank,
} from "@/lib/modules/interview/interview-setup.service.js";
import {
  initializeAIInterviewAgent,
  endInterviewSession,
} from "@/lib/modules/interview-execution/execution.service.js";
import { performCompleteAnalysis } from "@/lib/modules/ai-analysis/analysis.service.js";
import { generateComprehensiveScores } from "@/lib/modules/scoring/scoring.service.js";
import {
  generateStructuredFeedback,
  persistFeedback,
} from "@/lib/modules/feedback/feedback.service.js";
import {
  getDashboardSummary,
  fetchInterviewHistory,
} from "@/lib/modules/dashboard/dashboard.service.js";
import { db } from "@/firebase/admin";

/**
 * Step 1: Authenticate User
 * Validates user session via middleware
 * @returns {Promise<{success: boolean, user?: Object, redirect?: string, error?: string}>}
 */
export async function orchestrateStep1_AuthenticateUser() {
  const user = await getCurrentAuthenticatedUser();
  if (!user) {
    return {
      success: false,
      error: "User not authenticated",
      redirect: "/sign-in",
    };
  }
  return { success: true, user };
}

/**
 * Step 2: Load Dashboard
 * Show user dashboard with interview history and metrics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Dashboard summary
 */
export async function orchestrateStep2_LoadDashboard(userId) {
  const result = await getDashboardSummary(userId);
  return result;
}

/**
 * Step 3: Interview Setup
 * User selects role, domain, experience and load questions
 * @param {Object} params - { userId, role, domain, experience, difficulty }
 * @returns {Promise<{success: boolean, interviewId?: string, error?: string}>}
 */
export async function orchestrateStep3_InterviewSetup(params) {
  try {
    // Fetch question bank
    const questionBankResult = await fetchQuestionBank({
      role: params.role,
      domain: params.domain,
      difficulty: params.difficulty,
    });

    if (!questionBankResult.success) {
      return { success: false, error: "Failed to load question bank" };
    }

    const questions = questionBankResult.questions.map((q) => q.question);

    // Save configuration
    const configResult = await saveInterviewConfiguration({
      userId: params.userId,
      config: {
        userId: params.userId,
        role: params.role,
        domain: params.domain,
        experience: params.experience,
        difficulty: params.difficulty,
        techstack: [],
      },
      questions,
    });

    return configResult;
  } catch (error) {
    console.error("Step 3 error:", error);
    return { success: false, error: "Interview setup failed" };
  }
}

/**
 * Step 4: Initialize AI Agent
 * Set up Vapi voice agent with Gemini
 * @param {string} interviewId - Interview ID
 * @param {Array<string>} questions - Interview questions
 * @returns {Promise<Object>} - Session config
 */
export async function orchestrateStep4_InitializeAIAgent(
  interviewId,
  questions
) {
  const result = await initializeAIInterviewAgent({
    interviewId,
    userId: "",
    questions,
  });
  return result;
}

/**
 * Step 5: Execute Interview Loop
 * Return session config for client-side execution
 * @param {string} interviewId - Interview ID
 * @returns {Promise<{success: boolean, sessionConfig?: Object, error?: string}>}
 */
export async function orchestrateStep5_ExecuteInterviewLoop(interviewId) {
  try {
    const doc = await db.collection("interviews").doc(interviewId).get();
    if (!doc.exists) {
      return { success: false, error: "Interview not found" };
    }

    const data = doc.data();
    return {
      success: true,
      sessionConfig: {
        interviewId,
        questions: data?.questions || [],
        currentIndex: data?.currentQuestionIndex || 0,
      },
    };
  } catch (error) {
    console.error("Step 5 error:", error);
    return { success: false, error: "Failed to load interview" };
  }
}

/**
 * Step 6: Analyze Answers (Multi-phase)
 * Run all 4 phases of analysis on collected transcripts
 * @param {Object} params - { interviewId, transcripts, skillLevel, questionDifficulty }
 * @returns {Promise<{success: boolean, analysisResults?: Array, analysisCount?: number, error?: string}>}
 */
export async function orchestrateStep6_AnalyzeAnswers(params) {
  try {
    // Analyze each answer
    const analysisResults = await Promise.all(
      params.transcripts.map((transcript) =>
        performCompleteAnalysis({
          question: transcript.question,
          userAnswer: transcript.userAnswer,
          expectedKeywords: [],
          skillLevel: params.skillLevel,
          questionDifficulty: params.questionDifficulty,
        })
      )
    );

    // Store analysis results temporarily
    await db.collection("interviews").doc(params.interviewId).update({
      analysisResults,
      status: "analysis_complete",
    });

    return {
      success: true,
      analysisResults,
      analysisCount: analysisResults.length,
    };
  } catch (error) {
    console.error("Step 6 error:", error);
    return { success: false, error: "Analysis failed" };
  }
}

/**
 * Step 7: Generate Scores
 * Calculate technical, communication, confidence, weighted scores
 * @param {string} interviewId - Interview ID
 * @param {Array<Object>} transcripts - { question, answer } array
 * @returns {Promise<{success: boolean, scores?: Object, error?: string}>}
 */
export async function orchestrateStep7_GenerateScores(interviewId, transcripts) {
  try {
    const scores = await generateComprehensiveScores({
      transcripts,
      analysisResults: [],
    });

    // Save scores
    await db.collection("interviews").doc(interviewId).update({
      scores: {
        technical: scores.technicalScore,
        communication: scores.communicationScore,
        confidence: scores.confidenceScore,
        weighted: scores.weightedScore,
        normalized: scores.normalizedScore,
        breakdown: scores.breakdown,
      },
      status: "scoring_complete",
    });

    return {
      success: true,
      scores,
    };
  } catch (error) {
    console.error("Step 7 error:", error);
    return { success: false, error: "Scoring failed" };
  }
}

/**
 * Step 8: Generate Feedback
 * Create structured feedback with strengths, weaknesses, suggestions
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @param {Object} params - { transcripts, scores, targetRole }
 * @returns {Promise<{success: boolean, feedbackId?: string, error?: string}>}
 */
export async function orchestrateStep8_GenerateFeedback(
  interviewId,
  userId,
  params
) {
  try {
    const feedback = await generateStructuredFeedback({
      transcripts: params.transcripts,
      scores: params.scores,
      degree: "undergraduate",
      targetRole: params.targetRole,
    });

    // Persist feedback and scores
    const persistResult = await persistFeedback({
      interviewId,
      userId,
      feedback,
      scores: params.scores,
      transcripts: params.transcripts,
    });

    return persistResult;
  } catch (error) {
    console.error("Step 8 error:", error);
    return { success: false, error: "Feedback generation failed" };
  }
}

/**
 * Step 9: Display Feedback & Results
 * Return formatted feedback for display page
 * @param {string} interviewId - Interview ID
 * @returns {Promise<{success: boolean, results?: Object, error?: string}>}
 */
export async function orchestrateStep9_DisplayFeedback(interviewId) {
  try {
    const doc = await db.collection("interviews").doc(interviewId).get();

    if (!doc.exists) {
      return { success: false, error: "Interview results not found" };
    }

    const data = doc.data();
    return {
      success: true,
      results: {
        role: data?.role,
        domain: data?.domain,
        completedAt: data?.completedAt,
        scores: data?.scores,
        feedback: data?.feedback,
        transcripts: data?.transcripts,
      },
    };
  } catch (error) {
    console.error("Step 9 error:", error);
    return { success: false, error: "Failed to display feedback" };
  }
}

/**
 * Step 10: Track Progress
 * Show improvement over time
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, progressData?: Object, error?: string}>}
 */
export async function orchestrateStep10_TrackProgress(userId) {
  try {
    const historyResult = await fetchInterviewHistory(userId);
    if (!historyResult.success) {
      return { success: false, error: "Failed to fetch history" };
    }

    const interviews = historyResult.interviews || [];
    const scores = interviews
      .filter((i) => i.score)
      .map((i) => i.score)
      .reverse(); // Oldest to newest

    const improvement =
      scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

    return {
      success: true,
      progressData: {
        totalInterviews: interviews.length,
        scores,
        improvement: Math.round(improvement * 10) / 10,
        trend:
          improvement > 0 ? "upward" : improvement < 0 ? "downward" : "stable",
      },
    };
  } catch (error) {
    console.error("Step 10 error:", error);
    return { success: false, error: "Failed to calculate progress" };
  }
}

/**
 * Complete Interview Flow - Execute entire pipeline from setup to feedback
 * @param {Object} params - { userId, role, domain, experience, difficulty, transcripts }
 * @returns {Promise<{success: boolean, interviewId?: string, results?: Object, error?: string}>}
 */
export async function executeCompleteInterviewFlow(params) {
  try {
    // Step 3: Setup
    const setupResult = await orchestrateStep3_InterviewSetup({
      userId: params.userId,
      role: params.role,
      domain: params.domain,
      experience: params.experience,
      difficulty: params.difficulty,
    });

    if (!setupResult.success) throw new Error(setupResult.error);

    const interviewId = setupResult.interviewId;

    // Step 6: Analyze
    const analysisResult = await orchestrateStep6_AnalyzeAnswers({
      interviewId,
      transcripts: params.transcripts,
      skillLevel: params.experience,
      questionDifficulty: params.difficulty,
    });

    if (!analysisResult.success) throw new Error(analysisResult.error);

    // Step 7: Score
    const scoresResult = await orchestrateStep7_GenerateScores(
      interviewId,
      params.transcripts
    );

    if (!scoresResult.success) throw new Error(scoresResult.error);

    // Step 8: Feedback
    const feedbackResult = await orchestrateStep8_GenerateFeedback(
      interviewId,
      params.userId,
      {
        transcripts: params.transcripts,
        scores: scoresResult.scores,
        targetRole: params.role,
      }
    );

    if (!feedbackResult.success) throw new Error(feedbackResult.error);

    // Step 9: Display
    const displayResult = await orchestrateStep9_DisplayFeedback(interviewId);

    return {
      success: true,
      interviewId,
      results: displayResult.results,
    };
  } catch (error) {
    console.error("Complete flow error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Interview flow failed",
    };
  }
}
