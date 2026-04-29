/**
 * GET /api/debug/model-info
 * Returns current model configuration and rate limiter status
 */
import { NextResponse } from "next/server";
import { getPerUserRateLimiter, MODEL_SPECS } from "@/lib/rate-limiter";

export async function GET(request) {
  try {
    const limiter = getPerUserRateLimiter();
    const stats = limiter.getAllStats();

    return NextResponse.json({
      success: true,
      model: {
        name: limiter.modelSpec.name,
        rpm: limiter.modelSpec.rpm,
        rpd: limiter.modelSpec.rpd,
        tpm: limiter.modelSpec.tpm.toLocaleString(),
        description: `${limiter.modelSpec.rpm} requests/minute, ${limiter.modelSpec.rpd} requests/day, ${(limiter.modelSpec.tpm / 1000).toFixed(0)}k tokens/minute`,
      },
      rateLimit: {
        globalRequestsPerMinute: limiter.globalRequestsPerMinute,
        maxConcurrentUsers: limiter.maxConcurrentUsers,
        perUserRequestsPerMinute: limiter.perUserRequestsPerMinute.toFixed(2),
        perUserInterval: `1 request per ${(60000 / limiter.globalRequestsPerMinute * limiter.maxConcurrentUsers / 1000).toFixed(1)}s`,
        minIntervalBetweenRequests: `${(60000 / limiter.globalRequestsPerMinute).toFixed(0)}ms`,
      },
      activeUsers: stats.activeUsers,
      totalStats: stats,
      availableModels: Object.entries(MODEL_SPECS).map(([key, spec]) => ({
        key,
        name: spec.name,
        rpm: spec.rpm,
        rpd: spec.rpd,
        tpm: spec.tpm,
      })),
      recommendation: {
        model: limiter.modelSpec.name,
        users: limiter.maxConcurrentUsers,
        reason: `This model can safely handle ${limiter.maxConcurrentUsers} concurrent users with fair rate limiting`,
      },
    });
  } catch (error) {
    console.error("Error in model-info endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get model info" },
      { status: 500 }
    );
  }
}
