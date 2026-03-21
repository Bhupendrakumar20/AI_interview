"use server";

import { db } from "@/firebase/admin";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

/**
 * Initialize AI Interview Agent
 * Sets up Vapi voice agent with Gemini model
 * @param {Object} params - { interviewId, userId, questions }
 * @returns {Promise<{success: boolean, interviewId: string, sessionConfig?: Object}>}
 */
export async function initializeAIInterviewAgent(params) {
  const { interviewId, userId, questions } = params;

  try {
    // Create interview session in Firestore
    await db.collection("interviews").doc(interviewId).update({
      status: "agent_initialized",
      vapiConfig: {
        agentModel: "Gemini 2.0 Flash",
        voiceEnabled: true,
        speechToText: "enabled",
      },
      sessionStartedAt: new Date().toISOString(),
    });

    // System prompt for the AI interviewer
    const systemPrompt = `You are a professional technical interviewer conducting a mock interview.
Your role is to:
1. Ask the predefined interview questions one by one
2. Listen carefully to user responses
3. Ask follow-up questions if answers are incomplete
4. Evaluate the candidate's knowledge and communication
5. Be professional, friendly, and encouraging
6. Keep track of the conversation flow

After each answer, provide minimal acknowledgment and move to the next question.
Do not reveal the scoring criteria.`;

    return {
      success: true,
      interviewId,
      sessionConfig: {
        systemPrompt,
        model: "gemini-2.0-flash",
        questions,
        voiceConfig: {
          provider: "vapi",
          enabled: true,
        },
      },
    };
  } catch (error) {
    console.error("Error initializing AI agent:", error);
    return { success: false, error: "Failed to initialize AI agent" };
  }
}

/**
 * Get current question for user
 * @param {string} interviewId - Interview document ID
 * @returns {Promise<{success: boolean, question?: string, questionNumber?: number, totalQuestions?: number, completed?: boolean}>}
 */
export async function getCurrentInterviewQuestion(interviewId) {
  try {
    const doc = await db.collection("interviews").doc(interviewId).get();

    if (!doc.exists) {
      return { success: false, error: "Interview not found" };
    }

    const data = doc.data();
    const currentIndex = data?.currentQuestionIndex || 0;
    const questions = data?.questions || [];

    if (currentIndex >= questions.length) {
      return {
        success: false,
        completed: true,
        error: "All questions completed",
      };
    }

    return {
      success: true,
      question: questions[currentIndex],
      questionNumber: currentIndex + 1,
      totalQuestions: questions.length,
    };
  } catch (error) {
    console.error("Error getting current question:", error);
    return { success: false, error: "Failed to fetch question" };
  }
}

/**
 * Store transcript chunk (user's answer to current question)
 * @param {Object} params - { interviewId, questionNumber, question, userAnswer, duration }
 * @returns {Promise<{success: boolean, chunkId?: string, error?: string}>}
 */
export async function storeTranscriptChunk(params) {
  const { interviewId, questionNumber, question, userAnswer, duration } =
    params;

  try {
    // Create transcript chunk
    const transcriptChunk = {
      questionNumber,
      question,
      userAnswer,
      timestamp: new Date().toISOString(),
      duration,
    };

    // Store in Firestore
    await db
      .collection("interviews")
      .doc(interviewId)
      .update({
        transcripts: db.FieldValue.arrayUnion(transcriptChunk),
        lastUpdated: new Date().toISOString(),
      });

    return { success: true, chunkId: `q${questionNumber}` };
  } catch (error) {
    console.error("Error storing transcript chunk:", error);
    return { success: false, error: "Failed to store answer" };
  }
}

/**
 * Move to next question
 * @param {string} interviewId - Interview document ID
 * @returns {Promise<{success: boolean, completed: boolean, nextIndex: number}>}
 */
export async function moveToNextQuestion(interviewId) {
  try {
    const doc = await db.collection("interviews").doc(interviewId).get();

    if (!doc.exists) {
      return { success: false, error: "Interview not found" };
    }

    const currentIndex = (doc.data()?.currentQuestionIndex || 0) + 1;
    const totalQuestions = doc.data()?.questions?.length || 0;

    // Check if interview is completed
    const isCompleted = currentIndex >= totalQuestions;

    await db.collection("interviews").doc(interviewId).update({
      currentQuestionIndex: currentIndex,
      status: isCompleted ? "completed" : "in_progress",
    });

    return {
      success: true,
      completed: isCompleted,
      nextIndex: currentIndex,
    };
  } catch (error) {
    console.error("Error moving to next question:", error);
    return { success: false, error: "Failed to move to next question" };
  }
}

/**
 * End interview session
 * @param {string} interviewId - Interview document ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function endInterviewSession(interviewId) {
  try {
    await db.collection("interviews").doc(interviewId).update({
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error ending interview:", error);
    return { success: false, error: "Failed to end interview" };
  }
}
