/**
 * POST /api/interview-buddy/join-by-invite
 * Join a session using an invite code (direct link)
 * No need to manually enter session code
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

export async function POST(request) {
  try {
    const { userId, inviteCode } = await request.json();

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔗 [join-by-invite] REQUEST`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`  UserId: ${userId}`);
    console.log(`  InviteCode: ${inviteCode}`);

    if (!userId || !inviteCode) {
      console.error(`❌ Missing parameters`);
      return NextResponse.json(
        { error: "User ID and invite code are required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Query Firestore...`);

    // Query for session with this invite code (same as sessionCode)
    const query = await db
      .collection("interview_buddy_sessions")
      .where("sessionCode", "==", inviteCode)
      .limit(1)
      .get();

    if (query.empty) {
      console.error(`❌ No session found with code: ${inviteCode}`);
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 }
      );
    }

    const sessionDoc = query.docs[0];
    const sessionData = sessionDoc.data();
    const sessionId = sessionDoc.id;

    console.log(`✅ Session found:`, {
      sessionId,
      currentParticipants: sessionData.participants?.length,
      participants: sessionData.participants,
    });

    // Check if session is expired (24 hours)
    const createdAt = sessionData.createdAt?.toDate?.() || new Date(sessionData.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    if (new Date() > expiresAt) {
      console.error(`❌ Session expired`);
      return NextResponse.json(
        { error: "Session code has expired" },
        { status: 410 }
      );
    }

    // Check if session is full
    if (sessionData.participants?.length >= 2) {
      console.error(`❌ Session full (${sessionData.participants.length} members)`);
      return NextResponse.json(
        { error: "Session is full" },
        { status: 400 }
      );
    }

    // Check if user already in session
    if (sessionData.participants?.includes(userId)) {
      console.log(`ℹ️ User already in session - allowing re-entry`);
      // This is OK - user might be refreshing the page or coming back to their own session
    } else {
      // Add user to participants
      const updatedParticipants = [...(sessionData.participants || []), userId];

      console.log(`💾 Updating participants:`, updatedParticipants);

      await sessionDoc.ref.update({
        participants: updatedParticipants,
        updatedAt: new Date(),
        status: updatedParticipants.length === 2 ? "in-progress" : "created",
      });

      console.log(`✅ Participants updated`);
    }

    // Determine if this user is the creator (owner)
    const isCreator = sessionData.createdBy === userId;
    console.log(`👤 User is creator: ${isCreator}`);

    console.log(`\n✅ [join-by-invite] SUCCESS`);
    console.log(`  SessionId: ${sessionId}`);
    console.log(`  IsCreator: ${isCreator}`);
    console.log(`${'═'.repeat(60)}\n`);

    return NextResponse.json(
      {
        sessionId,
        sessionCode: sessionData.sessionCode,
        inviteCode,
        isCreator,
        participants: sessionData.participants,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[join-by-invite] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join session" },
      { status: 500 }
    );
  }
}
