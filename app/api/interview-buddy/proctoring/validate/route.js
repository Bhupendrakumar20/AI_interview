/**
 * POST /api/interview-buddy/proctoring/validate
 * Server-side proctoring validation
 * 
 * SECURITY:
 * - Validates camera, audio, and environment server-side (not client-side)
 * - Prevents spoofing by verifying stream properties
 * - Records all violations for audit
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkGeminiRateLimit } from "@/lib/security/rate-limiters";
import {
  validateCameraStream,
  validateAudioStream,
  validateSessionEnvironment,
  validateParticipantDuringSession,
  VIOLATION_SEVERITY,
} from "@/lib/security/proctoring-validation";

export async function POST(request) {
  try {
    // ✅ Verify user authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // ✅ Rate limit proctoring requests (5 per minute per user)
    if (!checkGeminiRateLimit(currentUser.uid, 5, 60000)) {
      return NextResponse.json(
        { error: "Too many proctoring requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      sessionId,
      validationType, // 'camera', 'audio', 'environment', 'continuous'
      cameraData,
      audioData,
      environmentData,
      telemetry,
    } = body;

    // ✅ Validate required parameters
    if (!sessionId || !validationType) {
      return NextResponse.json(
        { error: "sessionId and validationType are required" },
        { status: 400 }
      );
    }

    const validTypes = ["camera", "audio", "environment", "continuous"];
    if (!validTypes.includes(validationType)) {
      return NextResponse.json(
        {
          error: `Invalid validationType. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    let validationResult;

    // ✅ FIX #11: Route to appropriate validation function
    switch (validationType) {
      case "camera":
        if (!cameraData) {
          return NextResponse.json(
            { error: "cameraData is required for camera validation" },
            { status: 400 }
          );
        }
        validationResult = await validateCameraStream(
          sessionId,
          currentUser.uid,
          cameraData
        );
        break;

      case "audio":
        if (!audioData) {
          return NextResponse.json(
            { error: "audioData is required for audio validation" },
            { status: 400 }
          );
        }
        validationResult = await validateAudioStream(
          sessionId,
          currentUser.uid,
          audioData
        );
        break;

      case "environment":
        if (!environmentData) {
          return NextResponse.json(
            { error: "environmentData is required for environment validation" },
            { status: 400 }
          );
        }
        validationResult = await validateSessionEnvironment(
          sessionId,
          currentUser.uid,
          environmentData
        );
        break;

      case "continuous":
        if (!telemetry) {
          return NextResponse.json(
            { error: "telemetry is required for continuous validation" },
            { status: 400 }
          );
        }
        validationResult = await validateParticipantDuringSession(
          sessionId,
          currentUser.uid,
          telemetry
        );
        break;
    }

    // ✅ Determine response based on violations
    const hasCriticalViolations = validationResult.violations?.some(
      (v) => v.severity === VIOLATION_SEVERITY.CRITICAL
    );

    return NextResponse.json(
      {
        success: true,
        valid: validationResult.valid,
        violations: validationResult.violations,
        hasCriticalViolations,
        recommendedAction: validationResult.recommendedAction || (validationResult.valid ? "CONTINUE" : "WARNING"),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/interview-buddy/proctoring/validate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Proctoring validation failed" },
      { status: 500 }
    );
  }
}
