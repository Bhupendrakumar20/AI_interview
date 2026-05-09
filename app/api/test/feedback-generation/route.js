/**
 * POST /api/test/feedback-generation
 * Test the feedback generation with rate limiter
 */
import { NextResponse } from "next/server";
import { generateStructuredFeedback } from "@/lib/modules/feedback/feedback.service";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId = "test-user", testMode = "quick" } = body;

    // Create test interview data
    const testData = {
      transcripts: [
        {
          question: "Tell me about your experience with React",
          answer:
            "I have 3 years of experience with React. I've built several projects including e-commerce platforms and real-time dashboards. I'm familiar with hooks, context API, and state management libraries like Redux and Zustand.",
        },
        {
          question: "How do you handle performance optimization?",
          answer:
            "I use React DevTools to identify performance bottlenecks. I implement memoization with React.memo, useMemo, and useCallback. I also lazy load components and code split at route boundaries. For API calls, I implement debouncing and caching strategies.",
        },
        {
          question: "Describe a challenging project you worked on",
          answer:
            "I worked on a real-time inventory management system. The challenge was handling concurrent updates from multiple users. I implemented WebSocket connections for real-time updates and used optimistic updates to improve UX. This taught me about state synchronization and handling race conditions.",
        },
      ],
      scores: {
        technicalScore: 8,
        communicationScore: 7,
        confidenceScore: 8,
        normalizedScore: 7.7,
        weightedScore: 7.5,
        breakdown: {
          technical: 8,
          communication: 7,
          confidence: 8,
        },
      },
      degree: "professional",
      targetRole: "Senior React Developer",
      userId,
    };

    const startTime = Date.now();

    try {
      const feedback = await generateStructuredFeedback(testData);
      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        duration: `${duration}ms`,
        userId,
        testData: {
          transcriptCount: testData.transcripts.length,
          score: testData.scores.normalizedScore,
          role: testData.targetRole,
        },
        feedback: {
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          summary: feedback.summary.substring(0, 300) + "...",
          nextSteps: feedback.nextSteps,
        },
        status: "SUCCESS",
        note: "Feedback generation completed successfully with rate limiter protection",
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Check if it's a rate limit or quota error
      const errorMsg = error.message || error.toString();
      let errorType = "UNKNOWN_ERROR";

      if (errorMsg.includes("429") || errorMsg.includes("TooManyRequests")) {
        errorType = "RATE_LIMIT_ERROR";
      } else if (errorMsg.includes("quota") || errorMsg.includes("403")) {
        errorType = "QUOTA_EXCEEDED";
      } else if (errorMsg.includes("API key")) {
        errorType = "API_KEY_ERROR";
      }

      return NextResponse.json(
        {
          success: false,
          duration: `${duration}ms`,
          userId,
          error: error.message,
          errorType,
          suggestion:
            errorType === "QUOTA_EXCEEDED"
              ? "Upgrade your Google AI Studio plan or wait for quota reset"
              : errorType === "RATE_LIMIT_ERROR"
                ? "Request is queued. Rate limiter is protecting the API."
                : "Check API key and try again",
          testData: {
            transcriptCount: testData.transcripts.length,
            score: testData.scores.normalizedScore,
            role: testData.targetRole,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test feedback generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        hint: "Make sure request body includes userId",
      },
      { status: 400 }
    );
  }
}
