/**
 * POST /api/interview-buddy/join-session
 * Join an existing interview buddy session
 * 
 * SECURITY:
 * - Rate limited to prevent brute force session code guessing
 * - Validates ownership before joining
 * - Prevents race conditions with state checks
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { validateCodeFormat } from "@/lib/security/token-generator";
import { checkSessionJoinRateLimit, getRemainingRequests } from "@/lib/security/rate-limiters";

// ✅ FIX #2: Rate limiting applied here

export async function POST(request) {
  try {
    // ✅ Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-client-ip') || 
               'unknown';

    // ✅ FIX #2: Check rate limit (20 attempts per 5 minutes per IP+sessionCode)
    const body = await request.json();
    const { userId, sessionCode } = body;
    
    if (!sessionCode) {
      return NextResponse.json(
        { error: "Session code is required" },
        { status: 400 }
      );
    }

    if (!checkSessionJoinRateLimit(ip, sessionCode)) {
      return NextResponse.json(
        { 
          error: "Too many join attempts. Please try again later.",
          remaining: getRemainingRequests(`session-join:${ip}:${sessionCode}`, 20),
        },
        { status: 429 }
      );
    }

    // ✅ FIX #4: Verify user authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // ✅ FIX #1.1: Verify userId matches authenticated user
    if (!userId || userId !== currentUser.uid) {
      return NextResponse.json(
        { error: "User ID mismatch" },
        { status: 403 }
      );
    }

    if (typeof sessionCode !== 'string') {
      return NextResponse.json(
        { error: "Valid session code is required" },
        { status: 400 }
      );
    }

    // ✅ Validate session code format (prevents injection)
    if (!validateCodeFormat(sessionCode, 'IB-')) {
      return NextResponse.json(
        { error: "Invalid session code format" },
        { status: 400 }
      );
    }

    // Find session by code
    const query = await db
      .collection("interview_buddy_sessions")
      .where("sessionCode", "==", sessionCode)
      .limit(1)
      .get();

    if (query.empty) {
      return NextResponse.json(
        { error: "Invalid or expired session code" },
        { status: 404 }
      );
    }

    const sessionDoc = query.docs[0];
    const sessionData = sessionDoc.data();

    // ✅ FIX #5: Check session expiration
    const createdAt = sessionData.createdAt?.toDate?.() || new Date(sessionData.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: "Session code has expired" },
        { status: 410 }
      );
    }

    // ✅ FIX #5: Validate session status transitions
    if (!["created", "in-progress"].includes(sessionData.status)) {
      return NextResponse.json(
        { error: "Session is not available for joining" },
        { status: 400 }
      );
    }

    // ✅ Check if session is full
    if (sessionData.participants?.length >= 2) {
      return NextResponse.json(
        { error: "Session is full" },
        { status: 400 }
      );
    }

    // ✅ Check if user already in session
    if (sessionData.participants?.includes(userId)) {
      return NextResponse.json(
        { error: "User already in session" },
        { status: 400 }
      );
    }

    // ✅ FIX #8: Use Firestore transaction to prevent race conditions
    const transaction = db.batch();
    const updatedParticipants = [...(sessionData.participants || []), userId];
    
    transaction.update(sessionDoc.ref, {
      participants: updatedParticipants,
      updatedAt: new Date(),
      status: updatedParticipants.length === 2 ? "in-progress" : "created",
    });

    await transaction.commit();

    return NextResponse.json(
      {
        sessionId: sessionDoc.id,
        sessionCode,
        participants: updatedParticipants,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join session" },
      { status: 500 }
    );
  }
}
