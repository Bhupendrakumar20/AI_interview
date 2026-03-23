// Socket.io Event Handlers for DSA Room
// FILE: lib/socket-handlers/dsa-room-handlers.js

import {
  calculatePoints,
  isSubmissionValid,
  ROOM_STATUS,
  PARTICIPANT_STATUS,
} from '../utils/dsa-room-utils.js';
import { db } from '../../firebase/client.js';

/**
 * Initialize DSA Room Socket.io handlers
 * Call this in your Socket.io server setup
 */
export function initializeDSARoomHandlers(io, socket) {
  const roomNamespace = io.of('/dsa-room');

  // ─── JOIN ROOM ────────────────────────────────────────────────────────────

  roomNamespace.on('connection', (socket) => {
    console.log(`[DSA Room] User connected: ${socket.id}`);

    /**
     * User joins a specific room
     * Emitted by: Client
     * Handled by: Server
     */
    socket.on('room_join', async (data) => {
      try {
        const { userId, username, roomCode } = data;
        console.log(`[room_join] ${username} (${userId}) joining room ${roomCode}`);

        // Validate room exists and has space
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

        // Check room status
        if (roomData.status !== ROOM_STATUS.LOBBY) {
          socket.emit('error', { message: 'Room is not in lobby phase' });
          return;
        }

        // Check capacity
        if (roomData.participants.length >= roomData.maxParticipants) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Add user to room
        await db.collection('dsa_rooms').doc(roomId).update({
          participants: [...roomData.participants, userId],
          participantCount: roomData.participants.length + 1,
          updatedAt: new Date(),
        });

        // Create participant document
        await db.collection('dsa_room_participants').add({
          roomId,
          userId,
          username,
          joinedAt: new Date(),
          status: PARTICIPANT_STATUS.ACTIVE,
          points: 0,
          submissionsCount: 0,
          correctSubmissions: [],
          firstBloodQuestions: [],
          lastCodeUpdate: null,
          isCodeVisible: false,
        });

        // Join Socket.io room
        socket.join(`room_${roomId}`);
        socket.data.roomId = roomId;
        socket.data.userId = userId;
        socket.data.username = username;

        // Send room state to joining user
        socket.emit('room_state_init', {
          roomId,
          roomCode,
          roomData,
          participants: await fetchParticipantsForRoom(roomId),
        });

        // Broadcast user joined to others
        roomNamespace.to(`room_${roomId}`).emit('user_joined', {
          userId,
          username,
        });

        console.log(`[room_join] ✓ ${username} joined room ${roomId}`);
      } catch (error) {
        console.error('[room_join] Error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ─── VOTING ────────────────────────────────────────────────────────────

    /**
     * User votes on time limit
     */
    socket.on('vote_time_limit', async (data) => {
      try {
        const { vote } = data; // 30, 45, or 60 minutes
        const roomId = socket.data.roomId;
        const userId = socket.data.userId;

        const roomRef = db.collection('dsa_rooms').doc(roomId);
        const roomData = (await roomRef.get()).data();

        // Update vote
        const newVotes = { ...roomData.timeVotes };
        newVotes[vote] = (newVotes[vote] || 0) + 1;

        await roomRef.update({ timeVotes: newVotes });

        // Broadcast updated votes
        roomNamespace.to(`room_${roomId}`).emit('voting_update', {
          phase: 'time_limit',
          votes: newVotes,
          totalVoters: roomData.participants.length,
        });

        // Auto-start if unanimous
        if (checkIfAllVoted(newVotes, roomData.participants.length)) {
          const decidedLimit = getMajorityVote(newVotes);
          await startGameCountdown(roomId, decidedLimit, roomNamespace);
        }
      } catch (error) {
        console.error('[vote_time_limit] Error:', error);
      }
    });

    /**
     * User votes on question mode (same vs different)
     */
    socket.on('vote_question_mode', async (data) => {
      try {
        const { vote } = data; // 'same' or 'different'
        const roomId = socket.data.roomId;

        const roomRef = db.collection('dsa_rooms').doc(roomId);
        const roomData = (await roomRef.get()).data();

        const newVotes = { ...roomData.questionModeVotes };
        newVotes[vote] = (newVotes[vote] || 0) + 1;

        await roomRef.update({ questionModeVotes: newVotes });

        roomNamespace.to(`room_${roomId}`).emit('voting_update', {
          phase: 'question_mode',
          votes: newVotes,
          totalVoters: roomData.participants.length,
        });
      } catch (error) {
        console.error('[vote_question_mode] Error:', error);
      }
    });

    // ─── CODE SUBMISSION ────────────────────────────────────────────────────

    /**
     * User submits their code
     * This is the CRITICAL event for judging
     */
    socket.on('code_submit', async (data) => {
      try {
        const {
          questionId,
          code,
          language,
          submittedAt,
          timeFromStart,
        } = data;
        const roomId = socket.data.roomId;
        const userId = socket.data.userId;
        const username = socket.data.username;

        console.log(`[code_submit] ${username} submitting code for ${questionId}`);

        // Get room and question data
        const roomRef = db.collection('dsa_rooms').doc(roomId);
        const roomData = (await roomRef.get()).data();
        const questionRef = db.collection('dsa_questions').doc(questionId);
        const questionData = (await questionRef.get()).data();

        // ─── VALIDATION ────────────────────────────────────────────────────
        const validationResult = isSubmissionValid({
          submissionTimestamp: submittedAt,
          roomStartTimestamp: roomData.serverStartTime.toMillis(),
          timeLimitMs: roomData.timeLimit * 60 * 1000,
          roomStatus: roomData.status,
          hasUserAlreadySolvedThis: roomData.solvedByUsers?.[questionId]?.includes(userId),
        });

        if (!validationResult.isValid) {
          socket.emit('submission_result', {
            status: 'invalid',
            reason: 'Time limit exceeded or already solved',
            questionId,
          });
          return;
        }

        // ─── CREATE SUBMISSION ─────────────────────────────────────────────
        const submissionRef = await db.collection('dsa_room_submissions').add({
          roomId,
          userId,
          questionId,
          code,
          language,
          status: 'pending',
          judge0SubmissionId: null,
          submittedAt: new Date(submittedAt),
          timeFromStart,
          attemptNumber: 1,
          testResults: null,
          executionTime: null,
          memoryUsed: null,
          createdAt: new Date(),
        });

        const submissionId = submissionRef.id;
        console.log(`[code_submit] Submission ${submissionId} created, queuing for Judge0...`);

        // ─── QUEUE TO JUDGE0 ───────────────────────────────────────────────
        // In production, send to a message queue (Bull, RabbitMQ) or call Judge0 API directly
        await submitToJudge0(submissionId, roomId, userId, code, language, questionData);

      } catch (error) {
        console.error('[code_submit] Error:', error);
        socket.emit('error', { message: 'Failed to submit code' });
      }
    });

    /**
     * Update leaderboard when Judge0 returns results
     * Called from your Judge0 processing service
     */
    socket.on('judge0_result', async (data) => {
      try {
        const {
          submissionId,
          roomId,
          userId,
          questionId,
          passed,
          testResults,
          executionTime,
          memoryUsed,
        } = data;

        console.log(`[judge0_result] Submission ${submissionId}: ${passed ? 'PASSED' : 'FAILED'}`);

        // Update submission in Firestore
        await db.collection('dsa_room_submissions').doc(submissionId).update({
          status: 'completed',
          passed,
          testResults,
          executionTime,
          memoryUsed,
          updatedAt: new Date(),
        });

        if (passed) {
          // ─── CALCULATE POINTS ──────────────────────────────────────────
          const roomRef = db.collection('dsa_rooms').doc(roomId);
          const roomData = (await roomRef.get()).data();
          const questionRef = db.collection('dsa_questions').doc(questionId);
          const questionData = (await questionRef.get()).data();

          // Get participant document
          const participantQuery = await db
            .collection('dsa_room_participants')
            .where('roomId', '==', roomId)
            .where('userId', '==', userId)
            .limit(1)
            .get();

          const participantRef = participantQuery.docs[0].ref;
          const participantData = participantQuery.docs[0].data();

          // Check if first to solve
          const isFirstToSolve = !roomData.solvedByUsers?.[questionId];

          // Calculate points
          const pointsBreakdown = calculatePoints({
            difficulty: questionData.difficulty,
            submissionTimeMs: data.timeFromStart || 0,
            timeLimitMs: roomData.timeLimit * 60 * 1000,
            isFirstToSolve,
          });

          const totalPoints = participantData.points + pointsBreakdown.total;

          // Update participant
          await participantRef.update({
            points: totalPoints,
            submissionsCount: participantData.submissionsCount + 1,
            correctSubmissions: [
              ...participantData.correctSubmissions,
              {
                questionId,
                timestamp: new Date(),
                timeMs: data.timeFromStart,
              },
            ],
            firstBloodQuestions: isFirstToSolve
              ? [...(participantData.firstBloodQuestions || []), questionId]
              : participantData.firstBloodQuestions,
          });

          // Track solved questions in room
          const solvedByUsers = roomData.solvedByUsers || {};
          if (!solvedByUsers[questionId]) {
            solvedByUsers[questionId] = [];
          }
          solvedByUsers[questionId].push(userId);
          await roomRef.update({ solvedByUsers });

          // BroadCAST RESULTS ──────────────────────────────────────────────
          const updatedLeaderboard = await fetchAndSortLeaderboard(roomId);

          io.of('/dsa-room')
            .to(`room_${roomId}`)
            .emit('submission_result', {
              userId,
              username: participantData.username,
              questionId,
              status: 'passed',
              points: pointsBreakdown.total,
              pointsBreakdown,
              isFirstBlood: isFirstToSolve,
              timestamp: new Date(),
            });

          io.of('/dsa-room')
            .to(`room_${roomId}`)
            .emit('leaderboard_update', updatedLeaderboard);

          console.log(`[judge0_result] ✓ ${participantData.username} earned ${pointsBreakdown.total} points`);
        } else {
          // Failed submission
          io.of('/dsa-room')
            .to(`room_${roomId}`)
            .emit('submission_result', {
              userId,
              questionId,
              status: 'failed',
              testResults,
            });
        }
      } catch (error) {
        console.error('[judge0_result] Error:', error);
      }
    });

    // ─── DISCONNECT ────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      try {
        const roomId = socket.data.roomId;
        const userId = socket.data.userId;
        const username = socket.data.username;

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
              status: PARTICIPANT_STATUS.DISCONNECTED,
            });
          }

          // Broadcast user left
          roomNamespace.to(`room_${roomId}`).emit('user_left', {
            userId,
            username,
          });

          console.log(`[disconnect] ${username} left room ${roomId}`);
        }
      } catch (error) {
        console.error('[disconnect] Error:', error);
      }
    });
  });
}

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

/**
 * Fetch all participants for a room formatted for client
 */
async function fetchParticipantsForRoom(roomId) {
  const snapshot = await db
    .collection('dsa_room_participants')
    .where('roomId', '==', roomId)
    .get();

  return snapshot.docs.map((doc) => ({
    userId: doc.data().userId,
    username: doc.data().username,
    points: doc.data().points,
    questionsCorrect: doc.data().correctSubmissions.length,
    firstBloodQuestions: doc.data().firstBloodQuestions,
    status: doc.data().status,
  }));
}

/**
 * Fetch and sort leaderboard
 */
async function fetchAndSortLeaderboard(roomId) {
  const snapshot = await db
    .collection('dsa_room_participants')
    .where('roomId', '==', roomId)
    .get();

  const participants = snapshot.docs.map((doc) => ({
    userId: doc.data().userId,
    username: doc.data().username,
    points: doc.data().points,
    questionsCorrect: doc.data().correctSubmissions.length,
    firstBloodQuestions: doc.data().firstBloodQuestions,
    lastSubmissionTime: doc.data().correctSubmissions[doc.data().correctSubmissions.length - 1]?.timestamp || 0,
  }));

  return participants
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.lastSubmissionTime - b.lastSubmissionTime;
    })
    .map((p, idx) => ({ ...p, rank: idx + 1 }));
}

/**
 * Check if all users have voted
 */
function checkIfAllVoted(votes, totalParticipants) {
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  return totalVotes === totalParticipants;
}

/**
 * Get majority vote from vote object
 */
function getMajorityVote(votes) {
  return Object.keys(votes).reduce((a, b) =>
    votes[a] > votes[b] ? a : b
  );
}

/**
 * Start game countdown (3... 2... 1... GO!)
 */
async function startGameCountdown(roomId, timeLimit, io) {
  const roomRef = db.collection('dsa_rooms').doc(roomId);
  const now = new Date();

  await roomRef.update({
    status: ROOM_STATUS.IN_PROGRESS,
    serverStartTime: now,
    timeLimit,
  });

  // Start timer broadcast (every 1 second)
  const timerInterval = setInterval(async () => {
    const roomData = (await roomRef.get()).data();
    const elapsed = new Date() - roomData.serverStartTime.toDate();
    const remaining = timeLimit * 60 * 1000 - elapsed;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      await roomRef.update({ status: ROOM_STATUS.COMPLETED, endedAt: new Date() });
      io.of('/dsa-room').to(`room_${roomId}`).emit('game_ended', {
        reason: 'time_limit_reached',
      });
    } else {
      io.of('/dsa-room')
        .to(`room_${roomId}`)
        .emit('timer_tick', {
          serverTime: Date.now(),
          timeRemaining: remaining,
          secondsSinceStart: elapsed,
        });
    }
  }, 1000);
}

/**
 * Submit code to Judge0
 * (Integrate with your actual Judge0 API here)
 */
async function submitToJudge0(submissionId, roomId, userId, code, language, questionData) {
  // In production, make actual API call to Judge0
  // This is where your judge0-service.js would be used
  console.log(`[submitToJudge0] Would submit ${submissionId} to Judge0`);
  
  // TODO: Implement actual Judge0 submission
  // For now, mock response after delay
  // setTimeout(() => {
  //   emitJudge0Result(submissionId, roomId, userId, ...);
  // }, 2000);
}
