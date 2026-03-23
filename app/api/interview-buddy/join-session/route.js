/**
 * POST /api/interview-buddy/join-session
 * Join an existing interview buddy session
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

export async function POST(request) {
  try {
    const { userId, sessionCode } = await request.json();

    if (!userId || !sessionCode) {
      return NextResponse.json(
        { error: "User ID and session code are required" },
        { status: 400 }
      );
    }

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

    // Check if session is expired (24 hours)
    const createdAt = sessionData.createdAt?.toDate?.() || new Date(sessionData.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: "Session code has expired" },
        { status: 410 }
      );
    }

    // Check if session is full
    if (sessionData.participants?.length >= 2) {
      return NextResponse.json(
        { error: "Session is full" },
        { status: 400 }
      );
    }

    // Check if user already in session
    if (sessionData.participants?.includes(userId)) {
      return NextResponse.json(
        { error: "User already in session" },
        { status: 400 }
      );
    }

    // Add user to participants
    const updatedParticipants = [...(sessionData.participants || []), userId];

    await sessionDoc.ref.update({
      participants: updatedParticipants,
      updatedAt: new Date(),
      status: updatedParticipants.length === 2 ? "in-progress" : "created",
    });

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
