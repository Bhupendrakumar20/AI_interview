/**
 * GET /api/system/health
 * System health check including rate limiter status
 * Public endpoint for monitoring
 */

import { NextResponse } from "next/server";
import { getSecurityStatus } from "@/lib/security/init";

export async function GET(request) {
  try {
    const status = await getSecurityStatus();

    // Determine overall health
    const isHealthy = status.status === "healthy";

    return NextResponse.json(
      {
        status: isHealthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        security: {
          rateLimiter: status.modules?.rateLimit || { mode: "unknown" },
          mode: status.modules?.rateLimit?.mode || "unknown",
        },
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
