/**
 * POST /api/interview-buddy/create-session
 * Create a new interview buddy session
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { generateSecureSessionCode } from "@/lib/security/token-generator";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getClientIp } from "@/lib/security/endpoint-security";
import { logAuditEvent } from "@/lib/security/audit-logging";
import {
  finishInterviewModeSession,
  startInterviewModeSession,
} from "@/lib/modules/interview-session.service";

/**
 * Note: UUID v4 tokens are cryptographically unique with negligible collision probability.
 * No database uniqueness check needed.
 * Entropy: 128 bits (2^128 possibilities)
 */

export async function POST(request) {
  let currentUser = null;
  let modeSessionStarted = false;
  let modeSessionId = null;
  try {
    // ✅ FIX #1.4: Verify user authentication before processing
    currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id === "dummy-user-id") {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      userId,
      mode = "ai",
      persona = "hiring-manager",
      topics = [],
      difficulty = "medium",
      duration = 30,
      jobDescription = null,
    } = body;

    // ✅ FIX #1.1: Verify userId matches authenticated user
    if (!userId || userId !== currentUser.uid) {
      return NextResponse.json(
        { error: "User ID mismatch with authenticated user" },
        { status: 403 }
      );
    }

    // ✅ Validate session parameters
    if (!["ai", "human"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid session mode" },
        { status: 400 }
      );
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return NextResponse.json(
        { error: "Invalid difficulty level" },
        { status: 400 }
      );
    }

    if (duration < 5 || duration > 120) {
      return NextResponse.json(
        { error: "Duration must be between 5 and 120 minutes" },
        { status: 400 }
      );
    }

    // ✅ FIX #1: Generate cryptographically secure session code (128-bit entropy)
    const sessionCode = mode === "human" ? generateSecureSessionCode() : null;

    const sessionRef = db
      .collection("users")
      .doc(userId)
      .collection("interview_buddy_sessions")
      .doc();
    const sessionId = sessionRef.id;

    if (mode === "ai") {
      modeSessionId = sessionId;
      await startInterviewModeSession({
        userId,
        mode: "ai-buddy-mode",
        sessionId: modeSessionId,
        resourceId: sessionRef.path,
        details: { persona, topics, difficulty, duration },
      });
      modeSessionStarted = true;
    }

    const sessionDocData = {
      createdBy: userId,
      mode,
      persona,
      topics: Array.isArray(topics) ? topics : [],
      difficulty,
      duration,
      jobDescription,
      sessionCode,
      status: "created",
      startTime: mode === "ai" ? new Date() : null,
      endTime: null,
      participants: [userId],
      modeSessionId,
      score: null,
      feedback: null,
      recordingUrl: null,
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await sessionRef.set(sessionDocData);

    // Also persist under shared collection in Firebase for invite links and backwards compatibility
    try {
      await db
        .collection("interview_buddy_sessions")
        .doc(sessionId)
        .set(sessionDocData);
    } catch (sharedErr) {
      console.warn("Could not save to shared collection:", sharedErr.message);
    }

    // 🔗 Generate invite link for sharing
    const origin = request.headers.get("origin") || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";
    
    const inviteLink = `${origin}/interview/buddy/${sessionCode}`;

    await logAuditEvent({
      userId,
      eventType: "interview_session_created",
      severity: "info",
      description: `Created interview session in ${mode} mode`,
      metadata: { sessionId: sessionRef.id, mode, sessionCode },
    });

    return NextResponse.json(
      {
        sessionId: sessionRef.id,
        sessionCode,
        inviteLink,
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    if (modeSessionStarted && currentUser?.id && modeSessionId) {
      try {
        await finishInterviewModeSession({
          userId: currentUser.id,
          sessionId: modeSessionId,
          status: "abandoned",
        });
      } catch (cleanupError) {
        console.error("Failed to release AI Buddy session after creation failure:", cleanupError);
      }
    }
    await logAuditEvent({
      userId: currentUser?.uid || "unknown",
      eventType: "interview_session_creation_failed",
      severity: error.name === "ActiveInterviewModeError" ? "warning" : "error",
      description: `Failed to create interview session: ${error.message}`,
      ip: getClientIp(request),
    });

    return NextResponse.json(
      {
        error: error.message || "Failed to create session",
        activeMode: error.activeMode,
      },
      { status: error.name === "ActiveInterviewModeError" ? 409 : 500 }
    );
  }
}
