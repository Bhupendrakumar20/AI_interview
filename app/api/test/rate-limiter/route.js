/**
 * GET /api/test/rate-limiter
 * Test the rate limiter with actual Gemini API calls
 * Shows real-time rate limiting in action
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRateLimit, getPerUserRateLimiter } from "@/lib/rate-limiter";

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testType = searchParams.get("type") || "simple"; // simple, concurrent, stress
    const userId = searchParams.get("userId") || "test-user-" + Date.now();

    // Check if API key exists
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "GOOGLE_GENERATIVE_AI_API_KEY not configured",
          status: "MISSING_API_KEY",
          recommendation: "Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
        },
        { status: 500 }
      );
    }

    if (testType === "simple") {
      return await runSimpleTest(userId);
    } else if (testType === "concurrent") {
      return await runConcurrentTest(userId);
    } else if (testType === "stress") {
      return await runStressTest(userId);
    } else if (testType === "status") {
      return await getStatus();
    }

    return NextResponse.json(
      {
        error: "Invalid test type",
        available: ["simple", "concurrent", "stress", "status"],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Rate limiter test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Simple test - Single API call with rate limiting
 */
async function runSimpleTest(userId) {
  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    const result = await withRateLimit(async () => {
      return await model.generateContent(
        "Generate a brief 2-sentence interview tip for software engineers."
      );
    }, "testSimpleCall", userId);

    const responseText = await result.response.text();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      testType: "simple",
      userId,
      result: {
        response: responseText.substring(0, 200) + (responseText.length > 200 ? "..." : ""),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      rateLimiterStatus: getPerUserRateLimiter().getStats(userId),
      testUrl: `/api/test/rate-limiter?type=simple&userId=${userId}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        testType: "simple",
        userId,
        error: error.message,
        rateLimiterStatus: getPerUserRateLimiter().getStats(userId),
      },
      { status: 500 }
    );
  }
}

/**
 * Concurrent test - Multiple requests from same user
 * Tests queue management
 */
async function runConcurrentTest(userId) {
  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const results = [];

  const prompts = [
    "What's a good icebreaker for technical interviews?",
    "List 3 common DSA interview patterns.",
    "How should candidates handle hard interview questions?",
  ];

  try {
    // Send 3 concurrent requests from same user
    const promises = prompts.map((prompt, index) =>
      withRateLimit(
        async () => {
          const callStart = Date.now();
          const result = await model.generateContent(prompt);
          const text = await result.response.text();
          return {
            index: index + 1,
            duration: Date.now() - callStart,
            responseLength: text.length,
            success: true,
          };
        },
        `testConcurrentCall_${index}`,
        userId
      )
    );

    const concurrentResults = await Promise.allSettled(promises);
    const totalDuration = Date.now() - startTime;

    concurrentResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          index: index + 1,
          success: false,
          error: result.reason?.message,
        });
      }
    });

    return NextResponse.json({
      success: true,
      testType: "concurrent",
      userId,
      totalDuration: `${totalDuration}ms`,
      requestsCount: 3,
      results,
      rateLimiterStatus: getPerUserRateLimiter().getStats(userId),
      note: "Concurrent requests are queued by rate limiter to prevent 429 errors",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        testType: "concurrent",
        userId,
        error: error.message,
        results,
      },
      { status: 500 }
    );
  }
}

/**
 * Stress test - Simulates multiple concurrent users
 */
async function runStressTest(userId) {
  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const results = [];

  try {
    // Simulate 5 different users making requests concurrently
    const promises = [];

    for (let userIndex = 0; userIndex < 5; userIndex++) {
      const currentUserId = `${userId}-user-${userIndex}`;
      for (let requestIndex = 0; requestIndex < 2; requestIndex++) {
        promises.push(
          withRateLimit(
            async () => {
              const callStart = Date.now();
              const result = await model.generateContent(
                `Generate a short tip for interview ${userIndex}-${requestIndex}`
              );
              const text = await result.response.text();
              return {
                userId: currentUserId,
                request: requestIndex + 1,
                duration: Date.now() - callStart,
                success: true,
              };
            },
            `stressTest_${userIndex}_${requestIndex}`,
            currentUserId
          )
        );
      }
    }

    const stressResults = await Promise.allSettled(promises);
    const totalDuration = Date.now() - startTime;

    const successCount = stressResults.filter((r) => r.status === "fulfilled").length;
    const failureCount = stressResults.filter((r) => r.status === "rejected").length;

    stressResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason?.message,
        });
      }
    });

    const limiter = getPerUserRateLimiter();
    const allStats = limiter.getAllStats();

    return NextResponse.json({
      success: true,
      testType: "stress",
      totalDuration: `${totalDuration}ms`,
      totalRequests: 10,
      successCount,
      failureCount,
      successRate: `${((successCount / 10) * 100).toFixed(1)}%`,
      results: results.slice(0, 5), // Show first 5 results
      rateLimiterStats: {
        activeUsers: allStats.activeUsers,
        model: allStats.model,
        globalRPM: allStats.globalRequestsPerMinute,
        perUserRPM: allStats.perUserRequestsPerMinute,
      },
      note: "Stress test demonstrates fair rate limiting across multiple concurrent users",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        testType: "stress",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get current rate limiter status
 */
async function getStatus() {
  const limiter = getPerUserRateLimiter();
  const stats = limiter.getAllStats();

  return NextResponse.json({
    success: true,
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    rateLimit: {
      model: stats.model,
      globalRequestsPerMinute: stats.globalRequestsPerMinute,
      perUserRequestsPerMinute: stats.perUserRequestsPerMinute,
      maxConcurrentUsers: stats.maxConcurrentUsers,
    },
    activeUsers: stats.activeUsers,
    userDetails: stats.users.map((u) => ({
      userId: u.userId,
      queueLength: u.queueLength,
      isProcessing: u.isProcessing,
      lastRequestTime: u.lastRequestTime,
    })),
    apiKey: {
      configured: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      preview: process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 10) + "..."
        : "NOT SET",
    },
    availableTests: [
      { name: "simple", description: "Single rate-limited API call", url: "?type=simple" },
      { name: "concurrent", description: "3 concurrent requests from same user", url: "?type=concurrent" },
      { name: "stress", description: "10 requests from 5 different users", url: "?type=stress" },
      { name: "status", description: "Current rate limiter status", url: "?type=status" },
    ],
  });
}
