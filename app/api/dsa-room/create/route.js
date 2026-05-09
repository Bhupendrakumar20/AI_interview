// API Route: POST /api/dsa-room/create
// Create a new DSA room

import { NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { generateSecureRoomCode } from '@/lib/security/token-generator';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { checkRoomCreationRateLimit } from '@/lib/security/rate-limiters';

export async function POST(request) {
  try {
    // ✅ FIX #1.4: Verify authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { userId, username, questionSetId, maxParticipants = 10 } = await request.json();

    // ✅ FIX #1.1: Verify userId matches authenticated user
    if (!userId || userId !== currentUser.uid) {
      return NextResponse.json(
        { error: "User ID mismatch with authenticated user" },
        { status: 403 }
      );
    }

    // ✅ FIX #7: Check room creation rate limit (10 rooms per hour per user)
    const rateLimitCheck = await checkRoomCreationRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Too many rooms created. Maximum 10 rooms per hour.",
          remaining: rateLimitCheck.remaining,
          resetIn: rateLimitCheck.resetIn,
        },
        { status: 429 }
      );
    }

    if (!username || typeof username !== 'string' || username.length > 100) {
      return NextResponse.json(
        { error: 'Valid username is required' },
        { status: 400 }
      );
    }

    if (maxParticipants < 1 || maxParticipants > 100) {
      return NextResponse.json(
        { error: 'Invalid max participants' },
        { status: 400 }
      );
    }

    // ✅ FIX #1: Generate cryptographically secure room code (no DB lookup needed)
    const roomCode = generateSecureRoomCode();

    // Get questions for room
    const questionsSnapshot = await db
      .collection('dsa_questions')
      .where('source', '==', questionSetId || 'HundredDaysOfCode')
      .limit(10)
      .get();

    const questionIds = questionsSnapshot.docs.map((doc) => doc.id);

    // Create room document
    const roomRef = await db.collection('dsa_rooms').add({
      roomCode,
      createdBy: userId,
      createdAt: new Date(),
      status: 'lobby',
      
      // Configuration
      maxParticipants,
      questionMode: null, // TBD by voting
      timeLimit: null,    // TBD by voting
      questionIds,
      
      // Participants
      participants: [userId],
      participantCount: 1,
      
      // Voting
      timeVotes: {},
      questionModeVotes: {},
      
      // Game state
      serverStartTime: null,
      solvedByUsers: {},
      
      // Metadata
      updatedAt: new Date(),
    });

    // Create participant document for creator
    await db.collection('dsa_room_participants').add({
      roomId: roomRef.id,
      userId,
      username,
      joinedAt: new Date(),
      status: 'active',
      currentQuestion: null,
      points: 0,
      submissionsCount: 0,
      correctSubmissions: [],
      firstBloodQuestions: [],
    });

    return NextResponse.json(
      {
        roomId: roomRef.id,
        roomCode,
        createdAt: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    // Errors logged to audit trail in production
    return NextResponse.json(
      { error: error.message || 'Failed to create room' },
      { status: 500 }
    );
  }
}
