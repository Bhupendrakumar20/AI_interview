// Sample Socket.io Server for DSA Room
// FILE: server/dsa-socket-server.js (standalone or embedded in your Node.js backend)

import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Import handlers (Firebase will be initialized when handlers are called)
import { initializeDSARoomHandlers } from '../lib/socket-handlers/dsa-room-handlers.js';
import { initializeHumanBuddyHandlers } from '../lib/socket-handlers/human-buddy-handlers.js';

// Lazy-load Firebase only when needed
let db;
async function initializeFirebase() {
  if (!db) {
    try {
      const { db: firebaseDb } = await import('../firebase/client.js');
      db = firebaseDb;
    } catch (error) {
      console.warn('[WARNING] Firebase initialization failed:', error.message);
      console.warn('[INFO] Using mock database for demo purposes');
      // Return a mock db object for demo
      db = {
        collection: () => ({
          where: () => ({
            limit: () => ({
              get: async () => ({ empty: true, docs: [] })
            })
          }),
          doc: () => ({
            update: async () => {},
            get: async () => ({ data: () => ({}) })
          }),
          add: async () => ({})
        })
      };
    }
  }
  return db;
}

const app = express();
const httpServer = createServer(app);

// ─── CORS Configuration ────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4001',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ─── Middleware ────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Health Check ────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ─── Socket.io Connection ────────────────────────────────────────────────

const dsaRoomNamespace = io.of('/dsa-room');

dsaRoomNamespace.on('connection', (socket) => {
  console.log(`[DSA Room] User connected: ${socket.id}`);

  // ─── JOIN ROOM ─────────────────────────────────────────────────────────

  socket.on('room_join', async (data) => {
    try {
      const { userId, username, roomCode } = data;
      console.log(`[room_join] ${username} joining with code ${roomCode}`);

      // Find room by code
      const roomQuery = await db
        .collection('dsa_rooms')
        .where('roomCode', '==', roomCode)
        .limit(1)
        .get();

      if (roomQuery.empty) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const roomDoc = roomQuery.docs[0];
      const roomData = roomDoc.data();
      const roomId = roomDoc.id;

      // Validate room status
      if (roomData.status !== 'lobby') {
        socket.emit('error', { message: 'Room is not accepting new participants' });
        return;
      }

      // Check capacity
      if (roomData.participants.length >= roomData.maxParticipants) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Add participant to room
      await db.collection('dsa_rooms').doc(roomId).update({
        participants: [...roomData.participants, userId],
        participantCount: roomData.participants.length + 1,
        updatedAt: new Date(),
      });

      // Create participant record
      await db.collection('dsa_room_participants').add({
        roomId,
        userId,
        username,
        joinedAt: new Date(),
        status: 'active',
        points: 0,
        submissionsCount: 0,
        correctSubmissions: [],
        firstBloodQuestions: [],
      });

      // Join Socket.io room
      socket.join(`room_${roomId}`);
      socket.data = { roomId, userId, username };

      // Fetch updated room state
      const updatedRoom = (await db.collection('dsa_rooms').doc(roomId).get()).data();
      const participants = await fetchParticipants(roomId);

      // Send room state to joining user
      socket.emit('room_state_init', {
        roomId,
        roomCode,
        maxParticipants: updatedRoom.maxParticipants,
        participants,
        questions: updatedRoom.questionIds.map((id) => ({
          questionId: id,
          title: `Question ${id}`, // Fetch real title in production
        })),
      });

      // Broadcast user joined
      dsaRoomNamespace.to(`room_${roomId}`).emit('user_joined', {
        userId,
        username,
        totalParticipants: updatedRoom.participants.length,
      });

      console.log(`✓ ${username} joined room ${roomId}`);
    } catch (error) {
      console.error('[room_join] Error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ─── MEMBER APPROVAL ───────────────────────────────────────────────────

  /**
   * Room owner approves a pending member join request
   */
  socket.on('approve_member', async (data) => {
    try {
      const { requesterId, requesterUsername } = data;
      const roomId = socket.data.roomId;
      const ownerId = socket.data.userId;

      if (!roomId || !requesterId) {
        socket.emit('error_response', { message: 'Missing required data' });
        return;
      }

      console.log(`[approve_member] Owner ${ownerId} approving ${requesterUsername} for room ${roomId}`);

      // Update room: add to participants
      const roomRef = db.collection('dsa_rooms').doc(roomId);
      const roomData = (await roomRef.get()).data();

      if (!roomData.participants.includes(requesterId)) {
        await roomRef.update({
          participants: [...roomData.participants, requesterId],
          participantCount: roomData.participants.length + 1,
          updatedAt: new Date(),
        });
      }

      // Create participant record
      if (roomId && requesterId) {
        try {
          await db.collection('dsa_room_participants').add({
            roomId,
            userId: requesterId,
            username: requesterUsername,
            joinedAt: new Date(),
            status: 'active',
            points: 0,
            submissionsCount: 0,
            correctSubmissions: [],
            firstBloodQuestions: [],
          });
        } catch (e) {
          console.log('[approve_member] Could not create participant record:', e.message);
        }
      }

      // Notify the approved member
      dsaRoomNamespace.to(`user_${requesterId}`).emit('join_approved', {
        roomId,
        roomCode: roomData.roomCode,
        owner: socket.data.username,
      });

      // Broadcast to room
      dsaRoomNamespace.to(`room_${roomId}`).emit('member_joined', {
        userId: requesterId,
        username: requesterUsername,
        totalMembers: roomData.participants.length + 1,
      });

      console.log(`✓ ${requesterUsername} approved for room ${roomId}`);
    } catch (error) {
      console.error('[approve_member] Error:', error);
      socket.emit('error_response', { message: 'Failed to approve member' });
    }
  });

  /**
   * Room owner rejects a pending member join request
   */
  socket.on('reject_member', async (data) => {
    try {
      const { requesterId, requesterUsername } = data;
      const roomId = socket.data.roomId;

      if (!roomId || !requesterId) {
        socket.emit('error_response', { message: 'Missing required data' });
        return;
      }

      console.log(`[reject_member] Rejecting ${requesterUsername} from room ${roomId}`);

      // Notify the rejected member
      dsaRoomNamespace.to(`user_${requesterId}`).emit('join_rejected', {
        roomId,
        reason: 'Owner rejected your join request',
      });

      console.log(`✓ ${requesterUsername} rejected for room ${roomId}`);
    } catch (error) {
      console.error('[reject_member] Error:', error);
      socket.emit('error_response', { message: 'Failed to reject member' });
    }
  });

  // ─── VOTING ────────────────────────────────────────────────────────────

  socket.on('vote_time_limit', async (data) => {
    try {
      const { vote } = data;
      const roomId = socket.data.roomId;

      const roomRef = db.collection('dsa_rooms').doc(roomId);
      const roomData = (await roomRef.get()).data();

      // Update votes
      const newVotes = { ...roomData.timeVotes };
      newVotes[vote] = (newVotes[vote] || 0) + 1;

      await roomRef.update({
        timeVotes: newVotes,
        updatedAt: new Date(),
      });

      // Broadcast updated votes
      dsaRoomNamespace.to(`room_${roomId}`).emit('voting_update', {
        phase: 'time_limit',
        votes: newVotes,
        totalVoters: roomData.participants.length,
      });

      console.log(`[vote_time_limit] ${vote}min: ${newVotes[vote]}/${roomData.participants.length}`);
    } catch (error) {
      console.error('[vote_time_limit] Error:', error);
    }
  });

  socket.on('vote_question_mode', async (data) => {
    try {
      const { vote } = data; // 'same' or 'different'
      const roomId = socket.data.roomId;

      const roomRef = db.collection('dsa_rooms').doc(roomId);
      const roomData = (await roomRef.get()).data();

      // Update votes
      const newVotes = { ...roomData.questionModeVotes };
      newVotes[vote] = (newVotes[vote] || 0) + 1;

      await roomRef.update({
        questionModeVotes: newVotes,
        updatedAt: new Date(),
      });

      // Broadcast
      dsaRoomNamespace.to(`room_${roomId}`).emit('voting_update', {
        phase: 'question_mode',
        votes: newVotes,
        totalVoters: roomData.participants.length,
      });
    } catch (error) {
      console.error('[vote_question_mode] Error:', error);
    }
  });

  // ─── JOIN ROOM SOCKET (for members to join socket room) ────────────────

  socket.on('join_room_socket', async (data) => {
    try {
      const { roomId, userId, username } = data;

      if (!roomId || !userId) {
        console.log('[join_room_socket] Missing roomId or userId');
        socket.emit('error', { message: 'Missing room or user info' });
        return;
      }

      // Register socket data for this user
      socket.data.userId = userId;
      socket.data.username = username;
      socket.data.roomId = roomId;

      // Join the socket room so they receive broadcasts
      socket.join(`room_${roomId}`);
      console.log(`[join_room_socket] ${username} (${socket.id}) joined socket room for ${roomId}`);
      
      // Get room data and send current state
      try {
        const roomRef = db.collection('dsa_rooms').doc(roomId);
        const roomData = (await roomRef.get()).data();
        
        if (roomData) {
          socket.emit('room_state', {
            success: true,
            roomId,
            members: roomData.participants || [],
            status: roomData.status,
          });

          // 🔥 CRITICAL FIX: If game has already started, send game state immediately to late joiners
          if (roomData.status === 'in-progress' && roomData.questions) {
            console.log(`[join_room_socket] Game already in progress! Sending game_starting to ${username}`);
            socket.emit('game_starting', {
              roomId,
              questions: roomData.questions,
              leaderboard: roomData.leaderboard || [],
              startTime: roomData.serverStartTime?.toMillis?.() || Date.now(),
              questionMode: roomData.questionMode,
            });
          }
        }
      } catch (dbError) {
        console.log('[join_room_socket] Could not fetch room from DB:', dbError.message);
        socket.emit('room_state', { success: true, roomId, members: [] });
      }
    } catch (error) {
      console.error('[join_room_socket] Error:', error);
      socket.emit('error', { message: 'Failed to join room: ' + error.message });
    }
  });

  // ─── ROOM CREATE ───────────────────────────────────────────────────────
  
  /**
   * Create a new DSA room
   * Emitted by: Room creator
   */
  socket.on('room_create', async (data) => {
    try {
      const { userId, username, maxParticipants = 4 } = data;
      
      if (!userId || !username) {
        socket.emit('error_response', { message: 'Missing user info' });
        return;
      }

      console.log(`\n━━━ [room_create] START ━━━`);
      console.log(`👤 Creator: ${username} (${userId})`);

      // Generate room code
      const roomCode = `DSA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create room in Firestore
      const roomData = {
        roomCode,
        owner: userId,
        ownerName: username,
        status: 'lobby',
        participants: [userId],
        participantCount: 1,
        maxParticipants,
        timeVotes: {},
        questionModeVotes: {},
        questionIds: [],
        questions: [],
        leaderboard: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const roomRef = await db.collection('dsa_rooms').add(roomData);
      const roomId = roomRef.id;

      // Store socket data
      socket.data = { roomId, userId, username, isOwner: true };
      socket.join(`room_${roomId}`);

      console.log(`✓ Room created: ${roomCode} (ID: ${roomId})`);

      socket.emit('room_created', {
        roomId,
        roomCode,
        owner: username,
        participants: [{ userId, username }],
        status: 'lobby',
      });

      console.log(`✓ [room_create] Complete\n`);
    } catch (error) {
      console.error('[room_create] Error:', error);
      socket.emit('error_response', { message: 'Failed to create room: ' + error.message });
    }
  });

  // ─── REQUEST JOIN ROOM ─────────────────────────────────────────────────

  /**
   * Non-owner user requests to join a room
   * Sends notification to room owner
   */
  socket.on('request_join_room', async (data) => {
    try {
      const { roomCode, userId, username } = data;

      if (!roomCode || !userId || !username) {
        socket.emit('error_response', { message: 'Missing required data' });
        return;
      }

      console.log(`[request_join_room] ${username} requesting to join room ${roomCode}`);

      // Find room by code
      const roomQuery = await db
        .collection('dsa_rooms')
        .where('roomCode', '==', roomCode)
        .limit(1)
        .get();

      if (roomQuery.empty) {
        socket.emit('error_response', { message: 'Room not found' });
        return;
      }

      const roomDoc = roomQuery.docs[0];
      const roomData = roomDoc.data();
      const roomId = roomDoc.id;

      // Check if room is full
      if (roomData.participants.length >= roomData.maxParticipants) {
        socket.emit('error_response', { message: 'Room is full' });
        return;
      }

      // Check if already in room
      if (roomData.participants.includes(userId)) {
        socket.emit('error_response', { message: 'Already in this room' });
        return;
      }

      // Store join request temporarily
      socket.data = { roomId, userId, username, requestingJoin: true };

      // Notify owner of join request
      dsaRoomNamespace.to(`user_${roomData.owner}`).emit('member_request', {
        requesterId: userId,
        requesterUsername: username,
        roomId,
        requestTime: new Date(),
      });

      // Send acknowledgment to requester
      socket.emit('join_request_sent', {
        roomCode,
        roomId,
        message: 'Join request sent to room owner',
      });

      console.log(`✓ Join request sent for ${username} to room ${roomId}`);
    } catch (error) {
      console.error('[request_join_room] Error:', error);
      socket.emit('error_response', { message: 'Failed to request join' });
    }
  });

  // ─── START GAME ────────────────────────────────────────────────────────

  socket.on('start_game', async (data) => {
    try {
      const roomId = socket.data.roomId;
      const roomRef = db.collection('dsa_rooms').doc(roomId);
      const roomData = (await roomRef.get()).data();

      // Get decided values from votes
      const decidedTimeLimit = getMajorityVote(roomData.timeVotes);
      const decidedMode = getMajorityVote(roomData.questionModeVotes);

      if (!decidedTimeLimit || !decidedMode) {
        socket.emit('error', { message: 'Voting not complete' });
        return;
      }

      // Start game
      const now = new Date();
      await roomRef.update({
        status: 'in-progress',
        timeLimit: decidedTimeLimit,
        questionMode: decidedMode,
        serverStartTime: now,
        updatedAt: now,
      });

      // Broadcast game started
      dsaRoomNamespace.to(`room_${roomId}`).emit('game_started', {
        serverStartTime: now.getTime(),
        timeLimit: decidedTimeLimit,
        questionMode: decidedMode,
      });

      // Start timer broadcast (every 1 second)
      const timerInterval = setInterval(async () => {
        const roomData = (await roomRef.get()).data();
        const elapsed = new Date() - roomData.serverStartTime.toDate();
        const remaining = decidedTimeLimit * 60 * 1000 - elapsed;

        if (remaining <= 0) {
          clearInterval(timerInterval);
          await roomRef.update({
            status: 'completed',
            endedAt: new Date(),
          });

          dsaRoomNamespace.to(`room_${roomId}`).emit('game_ended', {
            reason: 'time_limit_reached',
          });
        } else {
          dsaRoomNamespace.to(`room_${roomId}`).emit('timer_tick', {
            serverTime: Date.now(),
            timeRemaining: remaining,
            secondsSinceStart: elapsed,
          });
        }
      }, 1000);

      console.log(`[start_game] Room ${roomId} started (${decidedTimeLimit}min, ${decidedMode} questions)`);
    } catch (error) {
      console.error('[start_game] Error:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // ─── CODE SUBMISSION ───────────────────────────────────────────────────

  socket.on('code_submit', async (data) => {
    try {
      const { questionId, code, language, submittedAt, timeFromStart } = data;
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;

      console.log(`[code_submit] ${socket.data.username} submitting for ${questionId}`);

      // Create submission record
      const submissionRef = await db.collection('dsa_room_submissions').add({
        roomId,
        userId,
        questionId,
        code,
        language,
        status: 'pending',
        submittedAt: new Date(submittedAt),
        timeFromStart,
        createdAt: new Date(),
      });

      // In production: Send to Judge0 or background queue
      // For now, emit a mock result after delay
      setTimeout(() => {
        const passed = Math.random() > 0.3; // 70% pass rate for demo

        socket.emit('submission_result', {
          submissionId: submissionRef.id,
          questionId,
          passed,
          points: passed ? 150 : 0,
        });

        if (passed) {
          // Update leaderboard
          dsaRoomNamespace.to(`room_${roomId}`).emit('leaderboard_update', [
            { rank: 1, userId, username: socket.data.username, points: 150 },
          ]);
        }
      }, 1500);
    } catch (error) {
      console.error('[code_submit] Error:', error);
      socket.emit('error', { message: 'Failed to submit code' });
    }
  });

  // ─── SET LANGUAGE ──────────────────────────────────────────────────────

  /**
   * Set code editor language for this user
   */
  socket.on('set_language', async (data) => {
    try {
      const { language } = data;
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;

      if (!roomId || !userId || !language) {
        socket.emit('error_response', { message: 'Missing language or room info' });
        return;
      }

      console.log(`[set_language] ${socket.data.username} set language to ${language}`);

      // Update participant language preference
      const participantQuery = await db
        .collection('dsa_room_participants')
        .where('roomId', '==', roomId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!participantQuery.empty) {
        await participantQuery.docs[0].ref.update({
          preferredLanguage: language,
          updatedAt: new Date(),
        });
      }

      // Broadcast language change to room
      dsaRoomNamespace.to(`room_${roomId}`).emit('user_language_changed', {
        userId,
        username: socket.data.username,
        language,
      });

      console.log(`✓ Language set for ${socket.data.username}`);
    } catch (error) {
      console.error('[set_language] Error:', error);
      socket.emit('error_response', { message: 'Failed to set language' });
    }
  });

  // ─── FIRST BLOOD (First to solve) ──────────────────────────────────────

  /**
   * Broadcast when first user solves a question
   */
  socket.on('first_blood_submission', async (data) => {
    try {
      const { questionId, username, timeFromStart } = data;
      const roomId = socket.data.roomId;

      if (!roomId || !questionId) {
        return;
      }

      console.log(`[first_blood] ${username} first solved ${questionId} at ${timeFromStart}ms`);

      // Broadcast to room
      dsaRoomNamespace.to(`room_${roomId}`).emit('first_blood', {
        userId: socket.data.userId,
        username,
        questionId,
        timeFromStart,
      });

      // Update room first blood record
      const roomRef = db.collection('dsa_rooms').doc(roomId);
      const roomData = (await roomRef.get()).data();
      
      const firstBloodList = roomData.firstBloodQuestions || [];
      if (!firstBloodList.find(fb => fb.questionId === questionId)) {
        firstBloodList.push({
          questionId,
          userId: socket.data.userId,
          username,
          timestamp: new Date(),
        });
        await roomRef.update({
          firstBloodQuestions: firstBloodList,
        });
      }
    } catch (error) {
      console.error('[first_blood_submission] Error:', error);
    }
  });

  // ─── USER JUDGING NOTIFICATION ────────────────────────────────────────

  /**
   * Notify room that someone's code is being judged
   */
  socket.on('user_judging_update', async (data) => {
    try {
      const { userId, username, questionId } = data;
      const roomId = socket.data.roomId;

      if (!roomId) return;

      console.log(`[user_judging] ${username} code being judged for ${questionId}`);

      // Broadcast to room
      dsaRoomNamespace.to(`room_${roomId}`).emit('user_judging', {
        username,
        questionId,
      });
    } catch (error) {
      console.error('[user_judging_update] Error:', error);
    }
  });

  // ─── GET ROOM STATE ────────────────────────────────────────────────────

  /**
   * Fetch current room state (for late joiners or state refresh)
   */
  socket.on('get_room_state', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.data.userId;

      if (!roomId) {
        socket.emit('error_response', { message: 'Missing room ID' });
        return;
      }

      console.log(`[get_room_state] Fetching state for room ${roomId}`);

      const roomRef = db.collection('dsa_rooms').doc(roomId);
      const roomData = (await roomRef.get()).data();

      if (!roomData) {
        socket.emit('error_response', { message: 'Room not found' });
        return;
      }

      // Get participants
      const participants = await fetchParticipants(roomId);

      socket.emit('room_state_update', {
        roomId,
        status: roomData.status,
        owner: roomData.ownerName,
        maxParticipants: roomData.maxParticipants,
        participants,
        timeVotes: roomData.timeVotes,
        questionModeVotes: roomData.questionModeVotes,
        questions: roomData.questions || [],
        leaderboard: roomData.leaderboard || [],
        serverStartTime: roomData.serverStartTime?.toDate?.() || null,
        timeLimit: roomData.timeLimit,
        questionMode: roomData.questionMode,
      });

      console.log(`✓ Room state sent for ${roomId}`);
    } catch (error) {
      console.error('[get_room_state] Error:', error);
      socket.emit('error_response', { message: 'Failed to fetch room state' });
    }
  });

  // ─── END ROOM ──────────────────────────────────────────────────────────

  /**
   * End the DSA room session
   */
  socket.on('end_room', async (data) => {
    try {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;

      if (!roomId) {
        socket.emit('error_response', { message: 'No active room' });
        return;
      }

      console.log(`\n━━━ [end_room] START ━━━`);
      console.log(`🏁 Ending room ${roomId}`);

      const roomRef = db.collection('dsa_rooms').doc(roomId);
      const roomData = (await roomRef.get()).data();

      // Only owner can end the room
      if (roomData.owner !== userId) {
        socket.emit('error_response', { message: 'Only room owner can end the room' });
        return;
      }

      // Get final leaderboard
      const participants = await fetchParticipants(roomId);
      const finalLeaderboard = participants
        .sort((a, b) => b.points - a.points)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

      // Update room status
      await roomRef.update({
        status: 'completed',
        endedAt: new Date(),
        finalLeaderboard,
      });

      // Broadcast room ended to all participants
      dsaRoomNamespace.to(`room_${roomId}`).emit('room_ended', {
        roomId,
        reason: 'owner_ended',
        leaderboard: finalLeaderboard,
        summary: {
          totalQuestions: roomData.questions?.length || 0,
          totalParticipants: participants.length,
          timeSpent: Date.now() - (roomData.serverStartTime?.getTime?.() || Date.now()),
        },
      });

      console.log(`✓ Room ${roomId} ended with ${participants.length} participants`);
      console.log(`✓ [end_room] Complete\n`);
    } catch (error) {
      console.error('[end_room] Error:', error);
      socket.emit('error_response', { message: 'Failed to end room' });
    }
  });

  // ─── DISCONNECT ───────────────────────────────────────────────────────

  socket.on('disconnect', async () => {
    try {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;

      if (roomId && userId) {
        // Update participant status
        const participantQuery = await db
          .collection('dsa_room_participants')
          .where('roomId', '==', roomId)
          .where('userId', '==', userId)
          .limit(1)
          .get();

        if (!participantQuery.empty) {
          await participantQuery.docs[0].ref.update({
            status: 'disconnected',
          });
        }

        // Broadcast
        dsaRoomNamespace.to(`room_${roomId}`).emit('user_left', {
          userId,
          username: socket.data.username,
        });

        console.log(`[disconnect] ${socket.data.username} left room ${roomId}`);
      }
    } catch (error) {
      console.error('[disconnect] Error:', error);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// HUMAN BUDDY MODE NAMESPACE (Isolated from DSA Room)
// ──────────────────────────────────────────────────────────────────────────
// Uses separate /interview-buddy namespace to ensure complete socket isolation

initializeHumanBuddyHandlers(io);

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

async function fetchParticipants(roomId) {
  const snapshot = await db
    .collection('dsa_room_participants')
    .where('roomId', '==', roomId)
    .get();

  return snapshot.docs.map((doc) => ({
    userId: doc.data().userId,
    username: doc.data().username,
    points: doc.data().points,
    status: doc.data().status,
  }));
}

function getMajorityVote(votes) {
  if (!votes || Object.keys(votes).length === 0) return null;
  return Object.entries(votes).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}

// ─── START SERVER ────────────────────────────────────────────────────────

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🎯 DSA Room Socket.io server running on port ${PORT}`);
});
