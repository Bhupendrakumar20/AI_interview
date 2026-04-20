// DSA Room Socket.io Server - Simplified Version
// FILE: server/dsa-socket-server-simple.js
// This version runs without Firebase initialization for demo/testing

import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { getQuestionTestCases } from '../constants/dsaTestCaseBank.js';

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

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
const PISTON_TIMEOUT_MS = 8000;
const LANGUAGE_MAP = {
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
};

function normalizeOutput(text) {
  return String(text ?? '').replace(/\r\n/g, '\n').trim();
}

function getPistonLanguage(language) {
  return LANGUAGE_MAP[String(language || '').toLowerCase()] || 'javascript';
}

function getFileName(language) {
  const names = {
    javascript: 'main.js',
    python: 'main.py',
    cpp: 'main.cpp',
    java: 'Main.java',
  };
  return names[language] || 'main.js';
}

async function executeWithPiston(sourceCode, language, stdin = '') {
  const pistonLanguage = getPistonLanguage(language);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PISTON_TIMEOUT_MS);

  try {
    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLanguage,
        version: '*',
        files: [{ name: getFileName(pistonLanguage), content: sourceCode }],
        stdin,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Piston request failed (${response.status})`);
    const data = await response.json();

    return {
      success: true,
      stdout: data?.run?.stdout || '',
      stderr: data?.run?.stderr || '',
      exitCode: data?.run?.exit_code ?? 0,
    };
  } catch (error) {
    return {
      success: false,
      stdout: '',
      stderr: error?.message || 'Execution error',
      exitCode: -1,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function judgeSubmission(sourceCode, language, question) {
  const bankCases = getQuestionTestCases(question);
  const testCases = question?.hiddenTestCases || question?.testCases || bankCases || [];
  if (!Array.isArray(testCases) || testCases.length === 0) {
    return {
      passed: false,
      testResults: [{ testCase: 1, status: 'No Test Cases Configured', stderr: 'Question has no tests' }],
    };
  }

  const testResults = [];
  for (let i = 0; i < testCases.length; i += 1) {
    const tc = testCases[i];
    const run = await executeWithPiston(sourceCode, language, tc.stdin || tc.input || '');
    const expected = normalizeOutput(tc.expectedOutput || tc.expected || '');
    const actual = normalizeOutput(run.stdout);
    const passed = run.success && run.exitCode === 0 && actual === expected;

    testResults.push({
      testCase: i + 1,
      status: passed ? 'Accepted' : 'Failed',
      stdout: run.stdout,
      stderr: run.stderr,
      expectedOutput: expected,
      actualOutput: actual,
    });

    if (!passed) return { passed: false, testResults };
  }

  return { passed: true, testResults };
}

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
        votes: {
          questionMode: {},
          timeLimit: {},
        },
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

      // 🔥 FIX: Notify the approved user via socket FIRST (if they're online)
      const approvedUserSocket = userSockets.get(request.userId);
      if (approvedUserSocket) {
        console.log(`[approve_member] Member is online, sending join_approved to ${approvedUserSocket}`);
        dsaRoomNamespace.to(approvedUserSocket).emit('join_approved', {
          roomId,
          members: room.approvedMembers,
          message: `You've been approved by ${room.ownerUsername}!`,
        });
      } else {
        console.log(`[approve_member] Member is offline, will receive update when they reconnect`);
      }

      // Notify all room members of the new approved member
      dsaRoomNamespace.to(`room_${roomId}`).emit('member_joined', {
        userId: request.userId,
        username: request.username,
        joinedAt: new Date(),
      });

      // ✅ Update lobby with new members list (for DSARoomLobbyProd listeners)
      const updatedUsers = [
        { userId: room.ownerId, username: room.ownerUsername, isOwner: true },
        ...room.approvedMembers.map((m) => ({ userId: m.userId, username: m.username, isOwner: false })),
      ];
      dsaRoomNamespace.to(`room_${roomId}`).emit('lobby_update', {
        users: updatedUsers,
      });

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
      
      // 🔥 FIX: If game is already playing, send game_starting to the newly approved member
      if (room.status === 'playing' && room.questions && approvedUserSocket) {
        console.log(`[approve_member] Game is in progress! Sending game_starting to newly approved ${request.username}`);
        
        // Rebuild leaderboard to include the newly approved member
        const updatedLeaderboard = [
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
            points: (room.leaderboard?.find(p => p.userId === m.userId)?.points) || 0,
            solved: (room.leaderboard?.find(p => p.userId === m.userId)?.solved) || 0,
            isOwner: false,
            status: (room.leaderboard?.find(p => p.userId === m.userId)?.status) || 'idle',
          })),
        ];
        
        dsaRoomNamespace.to(approvedUserSocket).emit('game_starting', {
          roomId,
          questions: room.questions,
          leaderboard: updatedLeaderboard,
          startTime: room.startTime,
          questionMode: room.questionMode,
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

      // 🔥 CRITICAL FIX: If game has already started, send game_starting immediately
      // This handles the case where member approves -> joins socket room AFTER owner started game
      // Check with better reliability - if room.status is playing AND we have questions, send immediately
      if (room.status === 'playing' && room.questions) {
        console.log(`[join_room_socket] Game already in progress! Sending game_starting to ${username}`);
        socket.emit('game_starting', {
          roomId,
          questions: room.questions,
          leaderboard: room.leaderboard,
          startTime: room.startTime,
          questionMode: room.questionMode,
        });
      } else if (room.gameStartedAt) {
        // Fallback: if we have gameStartedAt timestamp but status isn't set correctly, still send the game data
        console.log(`[join_room_socket] Game was started at ${room.gameStartedAt}, sending game_starting to ${username}`);
        socket.emit('game_starting', {
          roomId,
          questions: room.questions || [],
          leaderboard: room.leaderboard || [],
          startTime: room.startTime,
          questionMode: room.questionMode,
        });
      }
    } catch (error) {
      console.error('[join_room_socket] Error:', error);
      socket.emit('error', { message: 'Failed to join room: ' + error.message });
    }
  });

  // ─── START GAME ───────────────────────────────────────────────────────

  socket.on('start_game', (data) => {
    try {
      const { roomId, questionMode, startTime, questions: clientQuestions } = data;
      console.log(`[start_game] Owner starting game for room ${roomId}`);
      console.log(`[start_game] Received ${clientQuestions?.length || 0} questions from client`);

      const room = rooms.get(roomId);
      if (!room) {
        console.error(`[start_game] Room not found: ${roomId}`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Questions must come from the same 100-days flow payload (no static fallback).
      const questions = Array.isArray(clientQuestions) ? clientQuestions : [];
      if (questions.length === 0) {
        socket.emit('error', { message: 'No questions received from 100 days source.' });
        return;
      }

      // Build leaderboard with approved members (CRITICAL: include owner + all approved members)
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

      // 🔥 CRITICAL: Store questions and leaderboard BEFORE marking room as playing (prevents race condition)
      room.questions = questions;
      room.leaderboard = leaderboard;
      room.questionMode = questionMode;
      room.startTime = startTime;
      room.status = 'playing';  // Mark as playing AFTER data is ready
      room.gameStartedAt = new Date();

      // Log who should receive the broadcast
      console.log(`[start_game] Leaderboard has ${leaderboard.length} players: ${leaderboard.map(p => p.username).join(', ')}`);
      console.log(`[start_game] Approved members in room: ${room.approvedMembers.map(m => m.username).join(', ')}`);
      
      // Get all sockets in room before broadcast
      const roomSockets = dsaRoomNamespace.sockets.adapter.rooms.get(`room_${roomId}`);
      const socketCount = roomSockets ? roomSockets.size : 0;
      console.log(`[start_game] Currently in socket room: ${socketCount} members`);

      // Broadcast game starting to all in room
      const broadcastData = {
        roomId,
        questions,
        leaderboard,
        startTime,
        questionMode,
      };
      
      console.log(`[start_game] BROADCASTING game_starting with ${questions.length} questions`);
      dsaRoomNamespace.to(`room_${roomId}`).emit('game_starting', broadcastData);
      
      // 🔥 CRITICAL FIX: Also send to approved members directly in case they haven't joined socket room yet
      // This ensures members who are online but haven't called join_room_socket still get the event
      room.approvedMembers.forEach((member) => {
        const memberSocket = userSockets.get(member.userId);
        if (memberSocket) {
          console.log(`[start_game] Sending game_starting directly to ${member.username} (socket: ${memberSocket})`);
          dsaRoomNamespace.to(memberSocket).emit('game_starting', broadcastData);
        }
      });

      // ✅ Also emit room_started for DSARoomLobbyProd listeners
      dsaRoomNamespace.to(`room_${roomId}`).emit('room_started', {
        roomId,
        startTime,
      });

      console.log(`[start_game] ✓ Game started successfully`);
    } catch (error) {
      console.error('[start_game] Error:', error);
      socket.emit('error', { message: 'Failed to start game: ' + error.message });
    }
  });

  // ─── CAST VOTE ─────────────────────────────────────────────────────────

  socket.on('cast_vote', (data) => {
    try {
      const { roomId, type, value } = data;
      console.log(`[cast_vote] Room ${roomId}: ${type} = ${value}`);

      const room = rooms.get(roomId);
      if (!room) {
        console.error(`[cast_vote] Room not found: ${roomId}`);
        return;
      }

      // Only accept votes during lobby phase
      if (room.status !== 'lobby') {
        console.warn(`[cast_vote] Room not in lobby phase (status: ${room.status})`);
        return;
      }

      // Record vote
      const socketId = socket.id;
      if (type === 'questionMode') {
        room.votes.questionMode[socketId] = value;
      } else if (type === 'timeLimit') {
        room.votes.timeLimit[socketId] = value;
      }

      // Broadcast vote update to room
      dsaRoomNamespace.to(`room_${roomId}`).emit('vote_update', {
        questionModeVotes: room.votes.questionMode,
        timeLimitVotes: room.votes.timeLimit,
        totalUsers: (room.approvedMembers?.length || 0) + 1, // +1 for owner
      });

      console.log(`[cast_vote] ✓ Vote recorded (${Object.keys(room.votes.questionMode).length} questionMode votes)`);
    } catch (error) {
      console.error('[cast_vote] Error:', error);
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

  socket.on('code_submit', async (data, callback) => {
    try {
      const { roomId, userId, username, questionId, sourceCode, language = 'javascript' } = data;
      console.log(`[code_submit] ${username} submitted for question ${questionId} in ${language}`);

      const room = rooms.get(roomId);
      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const question = (room.questions || []).find((q) => q.id === questionId) || room.questions?.[0];
      if (!question) {
        callback?.({ success: false, error: 'Question not found' });
        return;
      }

      // ✅ Notify room that user is being judged
      dsaRoomNamespace.to(`room_${roomId}`).emit('user_judging', {
        userId,
        username,
        questionId,
        questionTitle: question.title,
      });

      const verdict = await judgeSubmission(sourceCode, language, question);
      if (!verdict.passed) {
        dsaRoomNamespace.to(`room_${roomId}`).emit('submission_notification', {
          type: 'error',
          userId,
          username,
          questionId,
          message: `${username} tried a problem`,
          icon: '⚠️',
        });

        callback?.({ success: true, passed: false, testResults: verdict.testResults });
        return;
      }

      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - (room.startTime || Date.now())) / 1000));
      const timeBonus = Math.max(0, 100 - Math.floor(elapsedSeconds / 6));
      const points = 50 + timeBonus;

      const playerIdx = room.leaderboard?.findIndex((p) => p.userId === userId);
      if (playerIdx >= 0) {
        const current = room.leaderboard[playerIdx];
        current.points = Number(current.points || 0) + points;
        current.solved = Number(current.solved || 0) + 1;
        current.status = 'completed';
      }

      const sortedLeaderboard = [...(room.leaderboard || [])].sort(
        (a, b) => (b.points || 0) - (a.points || 0)
      );
      room.leaderboard = sortedLeaderboard;

      dsaRoomNamespace.to(`room_${roomId}`).emit('submission_notification', {
        type: 'success',
        userId,
        username,
        questionId,
        points,
        time: elapsedSeconds,
        message: `🎉 ${username} solved a problem (+${points} pts)`,
        icon: '✓',
      });

      dsaRoomNamespace.to(`room_${roomId}`).emit('leaderboard_update', {
        leaderboard: sortedLeaderboard,
        updatedPlayer: {
          userId,
          username,
          points: sortedLeaderboard.find((p) => p.userId === userId)?.points || points,
          solved: sortedLeaderboard.find((p) => p.userId === userId)?.solved || 1,
          status: 'completed',
        },
      });

      callback?.({
        success: true,
        passed: true,
        points,
        testResults: verdict.testResults,
      });
    } catch (error) {
      console.error('[code_submit] Error:', error);
      callback?.({ success: false, error: 'Submission failed' });
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

  // NOTE: code_submit is handled above with Piston judging.

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
    const username = socket.data.username;
    const socketId = socket.id;

    if (roomId && userId) {
      const room = rooms.get(roomId);
      if (room) {
        room.participants = room.participants.filter((id) => id !== userId);
        room.participantCount--;

        // Emit user_left event
        dsaRoomNamespace.to(`room_${roomId}`).emit('user_left', {
          userId,
          username,
          participantCount: room.participantCount,
        });

        // ✅ Remove from approved members and update lobby
        room.approvedMembers = room.approvedMembers.filter(m => m.userId !== userId);
        const updatedUsers = [
          { userId: room.ownerId, username: room.ownerUsername, isOwner: true },
          ...room.approvedMembers.map((m) => ({ userId: m.userId, username: m.username, isOwner: false })),
        ];
        dsaRoomNamespace.to(`room_${roomId}`).emit('lobby_update', {
          users: updatedUsers,
        });

        // ✅ Handle host transfer if owner left
        if (userId === room.ownerId && room.approvedMembers.length > 0) {
          const newHost = room.approvedMembers[0];
          room.ownerId = newHost.userId;
          room.ownerUsername = newHost.username;
          
          dsaRoomNamespace.to(`room_${roomId}`).emit('host_transferred', {
            newHostId: newHost.userId,
            newHostName: newHost.username,
          });
        }
      }

      userRooms.delete(userId);
      userSockets.delete(userId);
      socketUsers.delete(socketId);
    }

    console.log(`[disconnect] User ${socketId} disconnected`);
  });

  // ─── GET QUESTION LIST ────────────────────────────────────────────

  socket.on('get_question_list', ({ difficulty = 'Medium' }, callback) => {
    try {
      console.log(`[get_question_list] Fetching ${difficulty} questions...`);
      
      // Import questions from 100-days constant
      import('../constants/hundredDaysOfCode.js').then(({ HUNDRED_DAYS_DSA, getAllDays }) => {
        try {
          const allDays = getAllDays?.() || Object.values(HUNDRED_DAYS_DSA);
          const questions = allDays
            .flatMap(day => day.questions || [])
            .filter(q => !difficulty || q.difficulty === difficulty)
            .slice(0, 5) // Return top 5 for performance
            .map(q => ({
              id: q.id,
              title: q.title,
              difficulty: q.difficulty,
              topic: q.topic,
              source: 'babbar',
              tags: [q.topic] || [],
            }));

          console.log(`[get_question_list] ✅ Loaded ${questions.length} questions`);
          callback?.({
            success: true,
            questions,
          });
        } catch (importErr) {
          console.error('[get_question_list] Import error:', importErr);
          callback?.({
            success: false,
            error: 'Failed to load questions',
            questions: [],
          });
        }
      }).catch(importErr => {
        console.error('[get_question_list] Module load error:', importErr);
        callback?.({
          success: false,
          error: 'Failed to load questions module',
          questions: [],
        });
      });
    } catch (error) {
      console.error('[get_question_list] Error:', error);
      callback?.({
        success: false,
        error: 'Failed to fetch questions: ' + error.message,
        questions: [],
      });
    }
  });

  // ─── GET QUESTION DETAILS ────────────────────────────────────────

  socket.on('get_question_details', ({ questionId, titleSlug }, callback) => {
    try {
      console.log(`[get_question_details] Fetching question ${questionId}...`);

      // Import questions from 100-days constant
      import('../constants/hundredDaysOfCode.js').then(({ HUNDRED_DAYS_DSA, getAllDays }) => {
        try {
          const allDays = getAllDays?.() || Object.values(HUNDRED_DAYS_DSA);
          
          // Find the question in all days
          let foundQuestion = null;
          for (const day of allDays) {
            const q = (day.questions || []).find(q => q.id === questionId);
            if (q) {
              foundQuestion = q;
              break;
            }
          }

          if (!foundQuestion) {
            console.error(`[get_question_details] Question not found: ${questionId}`);
            return callback?.({
              success: false,
              error: 'Question not found',
            });
          }

          // Import test cases
          import('../constants/dsaTestCaseBank.js').then(({ getQuestionTestCases }) => {
            try {
              const testCases = getQuestionTestCases?.(foundQuestion) || [];
              
              const response = {
                success: true,
                question: {
                  id: foundQuestion.id,
                  title: foundQuestion.title,
                  difficulty: foundQuestion.difficulty,
                  description: foundQuestion.description || 'See problem statement URL',
                  topic: foundQuestion.topic,
                  tags: [foundQuestion.topic] || [],
                  examples: [], // Not in constant, but OK
                  testCases: testCases.slice(0, 3), // First 3 test cases
                  constraints: [], // Not in constant
                  source: 'babbar',
                  problemStatementUrl: foundQuestion.problemStatementUrl,
                  leetcodeUrl: foundQuestion.leetcodeUrl,
                },
              };

              console.log(`[get_question_details] ✅ Loaded question: "${foundQuestion.title}"`);
              callback?.(response);
            } catch (err) {
              console.error('[get_question_details] Test case fetch error:', err);
              // Return without test cases
              callback?.({
                success: true,
                question: {
                  id: foundQuestion.id,
                  title: foundQuestion.title,
                  difficulty: foundQuestion.difficulty,
                  description: foundQuestion.description || 'See problem statement URL',
                  topic: foundQuestion.topic,
                  tags: [foundQuestion.topic] || [],
                  testCases: [],
                  source: 'babbar',
                },
              });
            }
          }).catch(testErr => {
            // Return without test cases
            console.error('[get_question_details] Test case module error:', testErr);
            callback?.({
              success: true,
              question: {
                id: foundQuestion.id,
                title: foundQuestion.title,
                difficulty: foundQuestion.difficulty,
                description: foundQuestion.description || 'See problem statement URL',
                topic: foundQuestion.topic,
                tags: [foundQuestion.topic] || [],
                testCases: [],
                source: 'babbar',
              },
            });
          });
        } catch (err) {
          console.error('[get_question_details] Question fetch error:', err);
          callback?.({
            success: false,
            error: 'Failed to find question: ' + err.message,
          });
        }
      }).catch(importErr => {
        console.error('[get_question_details] Module load error:', importErr);
        callback?.({
          success: false,
          error: 'Failed to load questions module',
        });
      });
    } catch (error) {
      console.error('[get_question_details] Error:', error);
      callback?.({
        success: false,
        error: 'Failed to fetch question details: ' + error.message,
      });
    }
  });

  // ─── GET ROOM STATE ──────────────────────────────────────────────────

  socket.on('get_room_state', (data) => {
    try {
      const { roomId } = data;
      console.log(`[get_room_state] Fetching state for room ${roomId}`);

      const room = rooms.get(roomId);
      if (!room) {
        console.log(`[get_room_state] Room not found: ${roomId}`);
        socket.emit('room_state', {
          success: false,
          message: 'Room not found',
        });
        return;
      }

      const userData = socketUsers.get(socket.id);
      
      // Send current room state
      socket.emit('room_state', {
        success: true,
        roomId,
        roomCode: room.roomCode,
        ownerId: room.ownerId,
        ownerUsername: room.ownerUsername,
        status: room.status,
        approvedMembers: room.approvedMembers || [],
        pendingRequests: room.pendingRequests || [],
        currentUser: userData || {
          userId: userData?.userId,
          username: userData?.username,
          isOwner: userData?.userId === room.ownerId,
        },
        gameData: room.status === 'playing' ? {
          questions: room.questions || [],
          leaderboard: room.leaderboard || [],
          startTime: room.startTime,
          questionMode: room.questionMode,
        } : null,
      });

      console.log(`[get_room_state] ✅ Room state sent to ${userData?.username || 'user'}`);
    } catch (error) {
      console.error('[get_room_state] Error:', error);
      socket.emit('room_state', {
        success: false,
        message: 'Failed to get room state: ' + error.message,
      });
    }
  });

  // ─── SET LANGUAGE ────────────────────────────────────────────────────

  socket.on('set_language', (data) => {
    try {
      const { language } = data;
      const userData = socketUsers.get(socket.id);
      
      if (!userData) {
        console.log('[set_language] User data not found for socket');
        return;
      }

      console.log(`[set_language] ${userData.username} set language to ${language}`);

      // Store language preference in user socket data
      if (!socket.data.preferences) {
        socket.data.preferences = {};
      }
      socket.data.preferences.language = language;

      // Update in userData as well
      const updatedUserData = socketUsers.get(socket.id);
      if (updatedUserData) {
        updatedUserData.language = language;
        socketUsers.set(socket.id, updatedUserData);
      }

      // Optionally broadcast to room so others know
      const roomId = userData.roomId;
      if (roomId) {
        dsaRoomNamespace.to(`room_${roomId}`).emit('user_language_changed', {
          userId: userData.userId,
          username: userData.username,
          language,
        });
      }

      console.log(`[set_language] ✅ Language preference saved`);
    } catch (error) {
      console.error('[set_language] Error:', error);
    }
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
