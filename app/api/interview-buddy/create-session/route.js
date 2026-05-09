/**
 * POST /api/interview-buddy/create-session
 * Create a new interview buddy session
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { generateSecureSessionCode } from "@/lib/security/token-generator";
import { getCurrentUser } from "@/lib/actions/auth.action";

/**
 * Note: UUID v4 tokens are cryptographically unique with negligible collision probability.
 * No database uniqueness check needed.
 * Entropy: 128 bits (2^128 possibilities)
 */

export async function POST(request) {
  try {
    // ✅ FIX #1.4: Verify user authentication before processing
    const currentUser = await getCurrentUser();
    if (!currentUser) {
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

    console.log(`[create-session] Generated secure session code for user ${userId}`);

    const sessionRef = await db.collection("interview_buddy_sessions").add({
      createdBy: userId,
      mode,
      persona,
      topics: Array.isArray(topics) ? topics : [],
      difficulty,
      duration,
      jobDescription,
      sessionCode,
      status: "created",
      startTime: null,
      endTime: null,
      participants: [userId],
      score: null,
      feedback: null,
      recordingUrl: null,
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 🔗 Generate invite link for sharing
    const origin = request.headers.get("origin") || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";
    
    const inviteLink = `${origin}/interview/buddy/${sessionCode}`;

    console.log(`[create-session] ✅ Session created`);
    console.log(`  SessionId: ${sessionRef.id}`);
    console.log(`  CreatedBy: ${userId}`);

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
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}
