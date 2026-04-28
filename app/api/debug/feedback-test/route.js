/**
 * GET /api/debug/feedback-test
 * Test if Gemini feedback generation is working correctly
 */
import { NextResponse } from "next/server";
import { createFeedback } from "@/lib/actions/general.action";

export async function GET(request) {
  try {
    console.log("🧪 [Feedback Test] Starting diagnostic test...");

    // Test with sample transcript
    const testTranscript = [
      {
        role: "system",
        content: "Question: What is a binary search tree?",
        question: "What is a binary search tree?",
        answer: "It's a tree where each node has a left and right child, and the left child is smaller than the parent and the right child is larger.",
      },
      {
        role: "system",
        content: "Question: How would you implement LRU cache?",
        question: "How would you implement LRU cache?",
        answer: "I would use a HashMap for O(1) lookups and a doubly linked list to maintain the order. When capacity is reached, I remove the least recently used item from the head of the list.",
      },
      {
        role: "system",
        content: "Question: Explain the time complexity of merge sort.",
        question: "Explain the time complexity of merge sort.",
        answer: "Merge sort has O(n log n) time complexity in all cases - best, average, and worst. This is because we divide the array into halves (log n times) and merge them (n operations each level).",
      },
    ];

    console.log("📝 [Feedback Test] Calling createFeedback with test transcript...");
    const result = await createFeedback({
      interviewId: "test-session-123",
      userId: "test-user-123",
      transcript: testTranscript,
    });

    console.log("✅ [Feedback Test] Got response:", result);

    // Check if using fallback
    const isFallback = result.totalScore === 72; // Fallback hardcoded value

    return NextResponse.json({
      success: result.success,
      isFallback: isFallback,
      totalScore: result.totalScore,
      categoryScores: result.categoryScores,
      strengths: result.strengths,
      areasForImprovement: result.areasForImprovement,
      finalAssessment: result.finalAssessment,
      diagnostics: {
        geminiCalled: !isFallback,
        score72Indicates: "Fallback data (hardcoded default)",
        expectedCategoryNames: [
          "Communication Skills",
          "Technical Knowledge",
          "Problem Solving",
          "Cultural Fit",
          "Confidence and Clarity",
        ],
        categoryScoreStructure: result.categoryScores
          ? `Array of ${result.categoryScores.length} items`
          : "Not an array",
        apiKeyConfigured: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "✅ Yes" : "❌ No",
        recommendation: isFallback
          ? "⚠️  Using FALLBACK data. Check API key and Gemini quotas"
          : "✅ Gemini API is working correctly",
      },
    });
  } catch (error) {
    console.error("❌ [Feedback Test] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        diagnostics: {
          apiKeyConfigured: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "✅ Yes" : "❌ No",
          errorType: error.constructor.name,
          errorMessage: error.message,
          recommendation:
            "Check console logs and verify GOOGLE_GENERATIVE_AI_API_KEY is set correctly",
        },
      },
      { status: 500 }
    );
  }
}
