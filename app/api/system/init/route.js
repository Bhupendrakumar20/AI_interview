/**
 * GET /api/system/init
 * Initialize security modules and return system status
 * Called once on app startup
 * 
 * This is a monitoring endpoint - no sensitive data exposed
 */

import { NextResponse } from "next/server";
import {
  initializeSecurityModules,
  getSecurityStatus,
} from "@/lib/security/init";

export async function GET(request) {
  try {
    // Initialize security modules on first request
    await initializeSecurityModules();

    // Get current status
    const status = await getSecurityStatus();

    return NextResponse.json({
      success: true,
      system: status,
      environment: {
        node_env: process.env.NODE_ENV,
        has_redis: !!process.env.REDIS_URL,
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
