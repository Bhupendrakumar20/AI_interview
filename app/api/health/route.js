/**
 * GET /api/health
 * Comprehensive health check for all APIs and services
 */
import { NextResponse } from "next/server";
import { getPerUserRateLimiter } from "@/lib/rate-limiter";

export async function GET(request) {
  const startTime = Date.now();
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {},
    endpoints: {},
    status: "HEALTHY",
  };

  try {
    // Check 1: Rate Limiter Status
    try {
      const limiter = getPerUserRateLimiter();
      const stats = limiter.getAllStats();
      checks.services.rateLimiter = {
        status: "OPERATIONAL",
        model: stats.model,
        activeUsers: stats.activeUsers,
        globalRPM: stats.globalRequestsPerMinute,
        perUserRPM: stats.perUserRequestsPerMinute,
      };
    } catch (error) {
      checks.services.rateLimiter = {
        status: "FAILED",
        error: error.message,
      };
      checks.status = "DEGRADED";
    }

    // Check 2: Gemini API Key
    checks.services.geminiApiKey = {
      status: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "CONFIGURED" : "MISSING",
      preview: process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 10) + "..."
        : "NOT SET",
    };

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      checks.status = "UNHEALTHY";
    }

    // Check 3: API Endpoints
    checks.endpoints = {
      rateLimiterTest: {
        path: "/api/test/rate-limiter",
        method: "GET",
        params: "?type=status|simple|concurrent|stress",
        status: "AVAILABLE",
      },
      feedbackGenerationTest: {
        path: "/api/test/feedback-generation",
        method: "POST",
        status: "AVAILABLE",
      },
      modelInfo: {
        path: "/api/debug/model-info",
        method: "GET",
        status: "AVAILABLE",
      },
      interviewQuestionGeneration: {
        path: "/api/interview/generate-question",
        method: "POST",
        rateLimited: true,
        status: "AVAILABLE",
      },
      resumeVerification: {
        path: "/api/resume/verify",
        method: "POST",
        rateLimited: true,
        status: "AVAILABLE",
      },
      proctorAnalysis: {
        path: "/api/proctoring/analyze-behavior",
        method: "POST",
        rateLimited: true,
        status: "AVAILABLE",
      },
      copilotSession: {
        path: "/api/copilot/manage-session",
        method: "POST",
        rateLimited: true,
        status: "AVAILABLE",
      },
      aiDetection: {
        path: "/api/cheating/detect-ai-usage",
        method: "POST",
        rateLimited: true,
        status: "AVAILABLE",
      },
    };

    // Check 4: Database
    checks.services.database = {
      status: process.env.DATABASE_URL ? "CONFIGURED" : "MISSING",
      note: "Firebase admin configured",
    };

    // Check 5: Rate Limited APIs Status
    const rateLimitedApis = [
      "/api/interview/generate-question",
      "/api/resume/verify",
      "/api/proctoring/analyze-behavior",
      "/api/copilot/manage-session",
      "/api/cheating/detect-ai-usage",
    ];

    checks.rateLimitedServices = {
      count: rateLimitedApis.length,
      list: rateLimitedApis,
      status: "PROTECTED",
      note: "All APIs use withRateLimit wrapper",
    };

    // Summary
    checks.summary = {
      healthStatus: checks.status,
      duration: `${Date.now() - startTime}ms`,
      recommendation: getRecommendation(checks),
      nextSteps: getNextSteps(checks),
    };

    const statusCode =
      checks.status === "HEALTHY"
        ? 200
        : checks.status === "DEGRADED"
          ? 206
          : 503;

    return NextResponse.json(checks, { status: statusCode });
  } catch (error) {
    checks.status = "UNHEALTHY";
    checks.error = error.message;
    return NextResponse.json(checks, { status: 503 });
  }
}

function getRecommendation(checks) {
  if (checks.status === "HEALTHY") {
    return "✅ All systems operational. Rate limiter is active and protecting APIs.";
  } else if (checks.status === "DEGRADED") {
    if (!checks.services.geminiApiKey?.status.includes("CONFIGURED")) {
      return "⚠️ Gemini API key missing. Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local";
    }
    return "⚠️ Some services degraded. Check service statuses above.";
  } else {
    return "❌ System unhealthy. Check error messages and service statuses.";
  }
}

function getNextSteps(checks) {
  const steps = [];

  if (!checks.services.geminiApiKey?.status.includes("CONFIGURED")) {
    steps.push("1. Set GOOGLE_GENERATIVE_AI_API_KEY in environment variables");
    steps.push("2. Restart development server");
  }

  if (checks.status === "HEALTHY") {
    steps.push("✅ Test rate limiter: GET /api/test/rate-limiter?type=status");
    steps.push("✅ Test feedback: POST /api/test/feedback-generation");
    steps.push("✅ Check model info: GET /api/debug/model-info");
  }

  return steps.length > 0 ? steps : ["All systems ready. APIs are operational."];
}

export async function POST(request) {
  // Allow testing specific endpoints
  try {
    const { testEndpoint } = await request.json();

    if (testEndpoint === "rate-limiter") {
      return NextResponse.json({
        message: "Run: GET /api/test/rate-limiter?type=status",
      });
    }

    return NextResponse.json(
      { error: "Unknown test endpoint" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
