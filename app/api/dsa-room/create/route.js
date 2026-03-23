// API Route: POST /api/dsa-room/create
// Create a new DSA room

import { NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { generateRoomCode } from '@/lib/utils/dsa-room-utils';

export async function POST(request) {
  try {
    const { userId, username, questionSetId, maxParticipants = 10 } = await request.json();

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'userId and username are required' },
        { status: 400 }
      );
    }

    // Generate unique room code
    let roomCode = generateRoomCode();
    let isUniqueCode = false;

    while (!isUniqueCode) {
      const existing = await db
        .collection('dsa_rooms')
        .where('roomCode', '==', roomCode)
        .limit(1)
        .get();

      if (existing.empty) {
        isUniqueCode = true;
      } else {
        roomCode = generateRoomCode();
      }
    }

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
    console.error('Error creating DSA room:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create room' },
      { status: 500 }
    );
  }
}
