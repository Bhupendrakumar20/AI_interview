// DSA Room Socket.io Server - Simplified Version
// FILE: server/dsa-socket-server-simple.js
// This version runs without Firebase initialization for demo/testing

import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Load environment variables
dotenv.config({ path: '.env.local' });

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

// ─── Health Check Endpoint ────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DSA Room Socket.io server is running' });
});

// ─── In-Memory Room Storage (for demo) ────────────────────────────────────

const rooms = new Map(); // roomId -> { roomCode, ownerId, ownerUsername, approvedMembers: [], pendingRequests: [], etc. }
const userRooms = new Map(); // userId -> roomId
const userSockets = new Map(); // userId -> socketId for targeting specific users
const socketUsers = new Map(); // socketId -> { userId, username, roomId }

// Helper function to generate room codes
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Helper function to get room by code
function getRoomByCode(roomCode) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.roomCode === roomCode) return { roomId, room };
  }
  return null;
}

// Helper function to broadcast members list to room owner
function broadcastMembersListToOwner(roomId, ownerSocketId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const io_instance = io; // Get io from closure
  io_instance.to(ownerSocketId).emit('members_list', {
    approved: room.approvedMembers || [],
    pending: room.pendingRequests || [],
  });
}

// ─── DSA Room Socket.io Handlers ────────────────────────────────────────

const dsaRoomNamespace = io.of('/dsa-room');

dsaRoomNamespace.on('connection', (socket) => {
  console.log(`[DSA Room] User connected: ${socket.id}`);

  // ─── ON DISCONNECT ────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    const userData = socketUsers.get(socket.id);
    if (userData) {
      userSockets.delete(userData.userId);
      socketUsers.delete(socket.id);
      console.log(`[DSA Room] User disconnected: ${socket.id}`);
    }
  });

  // ─── CREATE ROOM ───────────────────────────────────────────────────────

  socket.on('create_room', (data) => {
    try {
      const { userId, username } = data;
      console.log(`[create_room] ${username} (${userId}) creating room`);

      // Generate unique room code and ID
      let roomCode = generateRoomCode();
      while (getRoomByCode(roomCode)) {
        roomCode = generateRoomCode();
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create room
      rooms.set(roomId, {
        roomCode,
        ownerId: userId,
        ownerUsername: username,
        ownerSocketId: socket.id,
        approvedMembers: [],
        pendingRequests: [],
        status: 'lobby',
        questionMode: 'same',
        createdAt: new Date(),
      });

      // Store user socket mapping
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, { userId, username, roomId });
      userRooms.set(userId, roomId);

      // Join room socket
      socket.join(`room_${roomId}`);

      console.log(`[create_room] Success: Room ${roomCode} created with ID ${roomId}`);
      
      // Send room created response with initial state
      socket.emit('room_created', {
        success: true,
        roomId,
        roomCode,
        message: 'Room created successfully',
      });
      
      // Also immediately send members list with empty pending/approved
      socket.emit('members_list', {
        approved: room.approvedMembers,
        pending: room.pendingRequests,
        pendingCount: 0,
        approvedCount: room.approvedMembers.length,
      });
    } catch (error) {
      console.error('[create_room] Error:', error);
      socket.emit('error_response', {
        success: false,
        message: 'Failed to create room: ' + error.message,
      });
    }
  });

  // ─── REQUEST JOIN ROOM ────────────────────────────────────────────────

  socket.on('request_join_room', (data) => {
    try {
      const { userId, username, roomCode } = data;
      console.log(`[request_join_room] ${username} (${userId}) requesting to join room ${roomCode}`);

      // Find room by code
      const result = getRoomByCode(roomCode);
      if (!result) {
        console.log(`[request_join_room] Room not found with code ${roomCode}`);
        socket.emit('join_response', {
          success: false,
          message: 'Room not found',
        });
        return;
      }

      const { roomId, room } = result;

      // Check if already a member
      if (room.approvedMembers.find((m) => m.userId === userId)) {
        console.log(`[request_join_room] ${username} already approved`);
        socket.emit('join_response', {
          success: true,
          roomId,
          roomCode,
          message: 'Already approved member',
        });
        socket.join(`room_${roomId}`);
        userRooms.set(userId, roomId);
        socketUsers.set(socket.id, { userId, username, roomId });
        return;
      }

      // Add to pending requests
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      room.pendingRequests.push({
        id: requestId,
        userId,
        username,
        requestedAt: new Date(),
      });

      console.log(
        `[request_join_room] Request added. Owner notified. Pending count: ${room.pendingRequests.length}`
      );

      // Send response to requester
      socket.emit('join_response', {
        success: true,
        roomId,
        roomCode,
        message: 'Request sent to room owner',
      });

      // Send email notification to room owner (async, non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dsa-room/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'join_request',
          requesterName: username,
          requesterEmail: data.userEmail || 'unknown@example.com',
          roomOwnerName: room.ownerUsername,
          roomOwnerEmail: data.ownerEmail || 'owner@example.com',
          roomCode: roomCode,
        }),
      }).catch(err => console.error('[request_join_room] Email send failed:', err));

      // Notify room owner of pending request with notification badge
      const ownerSocket = dsaRoomNamespace.sockets.get(room.ownerSocketId);
      if (ownerSocket) {
        console.log(`[request_join_room] Sending member_request to owner ${room.ownerId}`);
        ownerSocket.emit('member_request', {
          id: requestId,
          userId,
          username,
          requestedAt: new Date(),
        });

        // Also send updated members list with counts
        ownerSocket.emit('members_list', {
          approved: room.approvedMembers,
          pending: room.pendingRequests,
          pendingCount: room.pendingRequests.length,
          approvedCount: room.approvedMembers.length,
        });

        // Send notification event for toast/badge
        ownerSocket.emit('room_notification', {
          type: 'join_request',
          title: `Join Request from ${username}`,
          message: `${username} wants to join your room`,
          icon: '🔔',
          pendingCount: room.pendingRequests.length,
          requestedBy: username,
        });
      } else {
        // Try direct broadcast to socket ID
        dsaRoomNamespace.to(room.ownerSocketId).emit('member_request', {
          id: requestId,
          userId,
          username,
          requestedAt: new Date(),
        });
        dsaRoomNamespace.to(room.ownerSocketId).emit('members_list', {
          approved: room.approvedMembers,
          pending: room.pendingRequests,
          pendingCount: room.pendingRequests.length,
          approvedCount: room.approvedMembers.length,
        });
        dsaRoomNamespace.to(room.ownerSocketId).emit('room_notification', {
          type: 'join_request',
          title: `Join Request from ${username}`,
          message: `${username} wants to join your room`,
          icon: '🔔',
          pendingCount: room.pendingRequests.length,
          requestedBy: username,
        });
        console.log(`[request_join_room] Broadcasted to owner socket ID ${room.ownerSocketId}`);
      }
    } catch (error) {
      console.error('[request_join_room] Error:', error);
      socket.emit('join_response', {
        success: false,
        message: 'Failed to send join request: ' + error.message,
      });
    }
  });

  // ─── APPROVE MEMBER ───────────────────────────────────────────────────

  socket.on('approve_member', (data) => {
    try {
      const { requestId, memberId, roomId } = data;
      console.log(`[approve_member] Approving ${memberId} for room ${roomId}`);

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Find and remove from pending
      const requestIdx = room.pendingRequests.findIndex((r) => r.id === requestId);
      if (requestIdx === -1) {
        console.warn(`[approve_member] Request ${requestId} not found`);
        return;
      }

      const request = room.pendingRequests[requestIdx];
      room.pendingRequests.splice(requestIdx, 1);

      // Add to approved
      room.approvedMembers.push({
        userId: request.userId,
        username: request.username,
        joinedAt: new Date(),
      });

      console.log(`[approve_member] ${request.username} approved. Total approved: ${room.approvedMembers.length}`);

      // Send approval email to the user (async, non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dsa-room/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'join_approved',
          requesterName: request.username,
          requesterEmail: data.userEmail || 'user@example.com',
          roomOwnerName: room.ownerUsername,
          roomCode: room.roomCode,
        }),
      }).catch(err => console.error('[approve_member] Email send failed:', err));

      // Notify all room members
      dsaRoomNamespace.to(`room_${roomId}`).emit('member_joined', {
        userId: request.userId,
        username: request.username,
        joinedAt: new Date(),
      });

      // Notify the approved user via socket
      const approvedUserSocket = userSockets.get(request.userId);
      if (approvedUserSocket) {
        dsaRoomNamespace.to(approvedUserSocket).emit('join_approved', {
          roomId,
          message: `You've been approved by ${room.ownerUsername}!`,
        });
      }

      // Update members list for owner
      const ownerSocket = dsaRoomNamespace.sockets.get(room.ownerSocketId);
      if (ownerSocket) {
        ownerSocket.emit('members_list', {
          approved: room.approvedMembers,
          pending: room.pendingRequests,
        });
      } else {
        dsaRoomNamespace.to(room.ownerSocketId).emit('members_list', {
          approved: room.approvedMembers,
          pending: room.pendingRequests,
        });
      }
    } catch (error) {
      console.error('[approve_member] Error:', error);
      socket.emit('error', { message: 'Failed to approve member' });
    }
  });

  // ─── REJECT MEMBER ────────────────────────────────────────────────────

  socket.on('reject_member', (data) => {
    try {
      const { requestId, roomId } = data;
      console.log(`[reject_member] Rejecting request ${requestId} for room ${roomId}`);

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Remove from pending
      const requestIdx = room.pendingRequests.findIndex((r) => r.id === requestId);
      if (requestIdx === -1) {
        console.warn(`[reject_member] Request ${requestId} not found`);
        return;
      }

      const request = room.pendingRequests[requestIdx];
      room.pendingRequests.splice(requestIdx, 1);

      console.log(`[reject_member] Request from ${request.username} rejected`);

      // Send rejection email to the user (async, non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dsa-room/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'join_rejected',
          requesterName: request.username,
          requesterEmail: data.userEmail || 'user@example.com',
          roomOwnerName: room.ownerUsername,
          roomCode: room.roomCode,
        }),
      }).catch(err => console.error('[reject_member] Email send failed:', err));

      // Notify the rejected user via socket
      const rejectedUserSocket = userSockets.get(request.userId);
      if (rejectedUserSocket) {
        dsaRoomNamespace.to(rejectedUserSocket).emit('join_rejected', {
          roomId,
          message: `Your request was rejected by ${room.ownerUsername}`,
        });
      }

      // Update members list for owner
      const ownerSocket = dsaRoomNamespace.sockets.get(room.ownerSocketId);
      if (ownerSocket) {
        ownerSocket.emit('members_list', {
          approved: room.approvedMembers,
          pending: room.pendingRequests,
        });
      } else {
        dsaRoomNamespace.to(room.ownerSocketId).emit('members_list', {
          approved: room.approvedMembers,
          pending: room.pendingRequests,
        });
      }
    } catch (error) {
      console.error('[reject_member] Error:', error);
      socket.emit('error', { message: 'Failed to reject member' });
    }
  });

  // ─── JOIN ROOM SOCKET (for members to join socket room) ────────────────

  socket.on('join_room_socket', (data) => {
    try {
      const { roomId, userId, username } = data;
      
      if (!roomId || !userId) {
        console.log('[join_room_socket] Missing roomId or userId');
        socket.emit('error', { message: 'Missing room or user info' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        console.log(`[join_room_socket] Room not found: ${roomId}`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Register this socket with user info if not already registered
      if (!socketUsers.has(socket.id)) {
        socketUsers.set(socket.id, { userId, username, roomId });
        userSockets.set(userId, socket.id);
      }

      // Join the socket room so they receive game_starting broadcasts
      socket.join(`room_${roomId}`);
      console.log(`[join_room_socket] ${username} (${socket.id}) joined socket room for ${roomId}`);
      
      // Immediately send them the current room state
      socket.emit('room_state', {
        success: true,
        roomId,
        members: room.approvedMembers,
        pending: room.pendingRequests,
      });
    } catch (error) {
      console.error('[join_room_socket] Error:', error);
      socket.emit('error', { message: 'Failed to join room: ' + error.message });
    }
  });

  // ─── START GAME ───────────────────────────────────────────────────────

  socket.on('start_game', (data) => {
    try {
      const { roomId, questionMode, startTime, questions: clientQuestions } = data;
      console.log(`[start_game] Starting game for room ${roomId} with mode: ${questionMode}`);

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      room.status = 'playing';
      room.questionMode = questionMode;
      room.startTime = startTime;

      // Use questions from client (100 DAYS OF CODE) or fallback to mocks
      let questions = clientQuestions || [
        {
          id: 'q1',
          title: 'Two Sum',
          description: 'Find two numbers that add up to target',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          title: 'Longest Substring',
          description: 'Find longest substring without repeating characters',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          title: 'Median of Sorted Arrays',
          description: 'Find median of two sorted arrays',
          difficulty: 'hard',
        },
      ];

      // Build leaderboard with approved members
      const leaderboard = [
        {
          userId: room.ownerId,
          username: room.ownerUsername,
          points: 0,
          solved: 0,
          isOwner: true,
          status: 'idle',
        },
        ...room.approvedMembers.map((m) => ({
          userId: m.userId,
          username: m.username,
          points: 0,
          solved: 0,
          isOwner: false,
          status: 'idle',
        })),
      ];

      // Store leaderboard in room for updates
      room.leaderboard = leaderboard;

      // Broadcast game starting to all in room
      dsaRoomNamespace.to(`room_${roomId}`).emit('game_starting', {
        roomId,
        questions,
        leaderboard,
        startTime,
        questionMode,
      });

      console.log(`[start_game] Game started with ${questions.length} questions and ${leaderboard.length} players`);
    } catch (error) {
      console.error('[start_game] Error:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // ─── LEADERBOARD UPDATE ──────────────────────────────────────────────

  socket.on('leaderboard_update', (data) => {
    try {
      const { roomId, userId, points, solved, status } = data;
      console.log(`[leaderboard_update] ${userId} scoring ${points} points (${solved} solved)`);

      const room = rooms.get(roomId);
      if (!room || !room.leaderboard) return;

      // Update player in leaderboard
      const playerIdx = room.leaderboard.findIndex((p) => p.userId === userId);
      if (playerIdx >= 0) {
        room.leaderboard[playerIdx].points = points;
        room.leaderboard[playerIdx].solved = solved;
        room.leaderboard[playerIdx].status = status || 'coding';
      }

      // Sort by points descending
      const sortedLeaderboard = [...room.leaderboard].sort((a, b) => b.points - a.points);

      // Broadcast updated leaderboard to ALL members in room
      dsaRoomNamespace.to(`room_${roomId}`).emit('leaderboard_update', {
        leaderboard: sortedLeaderboard,
        updatedPlayer: {
          userId,
          points,
          solved,
          status,
        },
      });

      console.log(`[leaderboard_update] Broadcasted to room ${roomId}`);
    } catch (error) {
      console.error('[leaderboard_update] Error:', error);
    }
  });

  // ─── CODE SUBMISSION ────────────────────────────────────────────────

  socket.on('code_submit', (data) => {
    try {
      const { roomId, userId, username, questionId, isCorrect, time } = data;
      console.log(`[code_submit] ${username} submitted for question ${questionId} - ${isCorrect ? '✓ Correct' : '✗ Wrong'}`);

      const room = rooms.get(roomId);
      if (!room) return;

      if (isCorrect) {
        // Calculate points based on time (faster = more points)
        const timeBonus = Math.max(0, 100 - Math.floor(time / 6));
        const basePoints = 50;
        const points = basePoints + timeBonus;

        // Broadcast to all members in room
        dsaRoomNamespace.to(`room_${roomId}`).emit('submission_notification', {
          type: 'success',
          userId,
          username,
          questionId,
          points,
          time,
          message: `🎉 ${username} solved a problem in ${time}s (+${points} pts)`,
          icon: '✓',
        });

        // Trigger leaderboard update
        socket.emit('leaderboard_update', {
          roomId,
          userId,
          points,
          solved: 1,
          status: 'completed',
        });
      } else {
        // Wrong submission - broadcast to all
        dsaRoomNamespace.to(`room_${roomId}`).emit('submission_notification', {
          type: 'error',
          userId,
          username,
          questionId,
          message: `${username} tried a problem`,
          icon: '⚠️',
        });
      }

      console.log(`[code_submit] Broadcasted to room ${roomId}`);
    } catch (error) {
      console.error('[code_submit] Error:', error);
    }
  });

  // ─── JOIN ROOM (Legacy) ────────────────────────────────────────────────

  socket.on('room_join', (data) => {
    try {
      const { userId, username, roomCode } = data;
      console.log(`[room_join] ${username} (${userId}) joining room ${roomCode}`);

      // Create mock room if doesn't exist
      let roomId = null;
      for (const [rId, room] of rooms.entries()) {
        if (room.roomCode === roomCode) {
          roomId = rId;
          break;
        }
      }

      if (!roomId) {
        // Create new room
        roomId = `room_${Date.now()}`;
        rooms.set(roomId, {
          roomCode,
          createdBy: userId,
          status: 'lobby',
          participants: [userId],
          participantCount: 1,
          maxParticipants: 10,
          questions: [],
          votes: { timeLimit: {}, questionMode: {} },
          createdAt: new Date(),
        });
      } else {
        // Join existing room
        const room = rooms.get(roomId);
        if (!room.participants.includes(userId)) {
          room.participants.push(userId);
          room.participantCount++;
        }
      }

      userRooms.set(userId, roomId);
      socket.join(`room_${roomId}`);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.username = username;

      const room = rooms.get(roomId);

      // Send room state to joining user
      socket.emit('room_state_init', {
        roomId,
        roomCode,
        roomData: room,
        participants: room.participants.map((id) => ({
          userId: id,
          username: `User_${id.slice(0, 8)}`,
          joinedAt: new Date(),
        })),
      });

      // Broadcast user joined
      dsaRoomNamespace.to(`room_${roomId}`).emit('user_joined', {
        userId,
        username,
        participantCount: room.participantCount,
      });

      console.log(`[room_join] Success: ${username} joined room ${roomCode}`);
    } catch (error) {
      console.error('[room_join] Error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ─── VOTE TIME LIMIT ────────────────────────────────────────────────────

  socket.on('vote_time_limit', (data) => {
    try {
      const { timeLimit } = data;
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;

      if (!roomId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) return;

      // Record vote
      if (!room.votes.timeLimit[timeLimit]) {
        room.votes.timeLimit[timeLimit] = [];
      }
      room.votes.timeLimit[timeLimit].push(userId);

      // Broadcast vote update
      dsaRoomNamespace.to(`room_${roomId}`).emit('vote_update', {
        type: 'timeLimit',
        votes: room.votes.timeLimit,
        totalVoters: room.participants.length,
      });

      console.log(`[vote_time_limit] ${socket.data.username} voted for ${timeLimit}s`);
    } catch (error) {
      console.error('[vote_time_limit] Error:', error);
    }
  });

  // ─── CODE SUBMISSION ────────────────────────────────────────────────────

  socket.on('code_submit', (data) => {
    try {
      const { questionId, code, language } = data;
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;

      if (!roomId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      console.log(`[code_submit] ${socket.data.username} submitted code in ${language}`);

      // Mock result - simulate test passing
      const passed = Math.random() > 0.3; // 70% pass rate for demo

      socket.emit('submission_result', {
        questionId,
        passed,
        message: passed ? 'All tests passed!' : 'Test failed',
        points: passed ? 150 : 0,
      });

      // Broadcast to leaderboard
      dsaRoomNamespace.to(`room_${roomId}`).emit('leaderboard_update', {
        participantId: userId,
        username: socket.data.username,
        points: passed ? 150 : 0,
        solved: passed,
      });

      console.log(`[code_submit] Result: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error('[code_submit] Error:', error);
      socket.emit('error', { message: 'Submission failed' });
    }
  });

  // ─── TIMER TICK ─────────────────────────────────────────────────────────

  socket.on('request_timer', () => {
    socket.emit('timer_tick', {
      serverTime: Date.now(),
      timeRemaining: Math.max(0, 5 * 60 * 1000 - (Date.now() % (5 * 60 * 1000))),
    });
  });

  // ─── DISCONNECT ─────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;

    if (roomId && userId) {
      const room = rooms.get(roomId);
      if (room) {
        room.participants = room.participants.filter((id) => id !== userId);
        room.participantCount--;

        dsaRoomNamespace.to(`room_${roomId}`).emit('user_left', {
          userId,
          username: socket.data.username,
          participantCount: room.participantCount,
        });
      }

      userRooms.delete(userId);
    }

    console.log(`[disconnect] User ${socket.id} disconnected`);
  });
});

// ─── Timer Broadcast Loop ────────────────────────────────────────────────

setInterval(() => {
  io.of('/dsa-room').emit('timer_tick', {
    serverTime: Date.now(),
    timeRemaining: Math.max(0, 5 * 60 * 1000 - (Date.now() % (5 * 60 * 1000))),
  });
}, 1000);

// ─── Start Server ────────────────────────────────────────────────────────

const PORT = process.env.DSA_SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🚀 DSA Room Socket.io Server Started');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  📊 Server running on port ${PORT}`);
  console.log(`  🔗 WebSocket endpoint: ws://localhost:${PORT}/dsa-room`);
  console.log(`  ✅ Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('  Features:');
  console.log('    ✓ Room creation & joining');
  console.log('    ✓ Real-time timer synchronization');
  console.log('    ✓ Voting system');
  console.log('    ✓ Code submissions (mocked)');
  console.log('    ✓ Live leaderboard updates');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('[INFO] Server closed');
    process.exit(0);
  });
});

export { io, app };
