/**
 * STANDALONE SOCKET.IO SERVER - Copy this to socket-server-vercel repo
 * Deploy to Render by setting start command: node standalone-server.js
 * 
 * This is a complete, self-contained Socket.io server with all handlers included
 * No need to import from other files - all logic is here
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// ─── FIREBASE INITIALIZATION ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
} else {
  console.warn('⚠️ [WARNING] Firebase credentials not found - using mock database');
}

const db = admin.firestore ? admin.firestore() : null;

// ─── EXPRESS & SOCKET.IO SETUP ────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// CORS configuration - Allow all needed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4001',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '',
].filter(Boolean);

console.log(`\n${'═'.repeat(60)}`);
console.log('🔧 [Socket Server] Initializing...');
console.log(`${'═'.repeat(60)}`);
console.log('Allowed origins:');
allowedOrigins.forEach(origin => console.log(`  - ${origin}`));
console.log(``);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ─── HUMAN BUDDY MODE HANDLERS ────────────────────────────────────────────

const BUDDY_ROLES = {
  OWNER: 'owner',
  INTERVIEWER: 'interviewer',
  INTERVIEWEE: 'interviewee',
  WAITING: 'waiting',
};

// Initialize namespace
const buddyNamespace = io.of('/interview-buddy');

buddyNamespace.on('connection', (socket) => {
  console.log(`✅ [Buddy] User connected: ${socket.id}`);

  // ─── JOIN SESSION ──────────────────────────────────────────
  socket.on('join_session', async (data) => {
    try {
      const { userId, username, sessionCode, isCreator } = data;
      
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📍 [join_session] Received`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`   User: ${username} (${userId})`);
      console.log(`   Session Code: ${sessionCode}`);
      console.log(`   Is Creator: ${isCreator}`);
      console.log(`   Socket ID: ${socket.id}`);

      if (!userId || !sessionCode) {
        console.error('❌ Missing required fields');
        socket.emit('error', { message: 'Missing userId or sessionCode' });
        return;
      }

      // Query Firestore for session
      if (!db) {
        console.warn('⚠️ No Firestore - using mock response');
        // Mock response for testing
        socket.emit('session_joined', {
          sessionId: 'mock-' + Date.now(),
          sessionCode,
          participants: [userId],
          remoteUsers: [],
          role: BUDDY_ROLES.OWNER,
          isCreator,
        });
        return;
      }

      const sessionQuery = await db
        .collection('interview_buddy_sessions')
        .where('sessionCode', '==', sessionCode)
        .limit(1)
        .get();

      if (sessionQuery.empty) {
        console.error(`❌ Session not found: ${sessionCode}`);
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const sessionDoc = sessionQuery.docs[0];
      const sessionData = sessionDoc.data();
      const sessionId = sessionDoc.id;

      console.log(`✅ Session found: ${sessionId}`);
      console.log(`   Current participants: ${JSON.stringify(sessionData.participants)}`);

      // Check 2-member limit
      if (sessionData.participants.length >= 2) {
        console.error(`❌ Session full: ${sessionData.participants.length} members`);
        socket.emit('error', { 
          message: 'Session full',
          memberCount: sessionData.participants.length,
        });
        return;
      }

      // Check if already in session
      if (sessionData.participants.includes(userId)) {
        console.error(`❌ User already in session`);
        socket.emit('error', { message: 'User already in session' });
        return;
      }

      // Assign role
      let role = BUDDY_ROLES.WAITING;
      if (isCreator) {
        role = BUDDY_ROLES.OWNER;
      } else if (sessionData.participants.length === 1) {
        role = BUDDY_ROLES.WAITING;
      }

      console.log(`👔 Assigned role: ${role}`);

      // Update Firestore
      const updatedParticipants = [...sessionData.participants, userId];
      await db.collection('interview_buddy_sessions').doc(sessionId).update({
        participants: updatedParticipants,
        [`participants_${userId}`]: {
          joinedAt: new Date(),
          role: role,
          name: username,
          camera: false,
          mic: false,
          screenShare: false,
        },
        participantCount: updatedParticipants.length,
        status: sessionData.participants.length === 1 
          ? 'in_progress' 
          : sessionData.status,
      });

      console.log(`✅ Firestore updated with new participant`);

      // Store socket data
      socket.data = {
        sessionId,
        sessionCode,
        userId,
        username,
        role,
        isCreator,
      };

      // Join socket room
      const roomName = `buddy_${sessionId}`;
      socket.join(roomName);
      console.log(`🚪 Joined room: ${roomName}`);
      console.log(`   Users in room: ${buddyNamespace.adapter.rooms.get(roomName)?.size || 0}`);

      // Get updated session for remote users
      const updatedSession = (
        await db.collection('interview_buddy_sessions').doc(sessionId).get()
      ).data();

      // Build remote users array
      const remoteUsers = updatedParticipants
        .filter(pid => pid !== userId)
        .map(pid => ({
          userId: pid,
          username: updatedSession[`participants_${pid}`]?.name || `User ${pid}`,
          camera: updatedSession[`participants_${pid}`]?.camera || false,
          mic: updatedSession[`participants_${pid}`]?.mic || false,
          screenShare: updatedSession[`participants_${pid}`]?.screenShare || false,
        }));

      console.log(`👥 Remote users for this user: ${JSON.stringify(remoteUsers)}`);

      // Send session_joined to this user
      socket.emit('session_joined', {
        sessionId,
        sessionCode,
        participants: updatedParticipants,
        remoteUsers: remoteUsers,
        role: role,
        isCreator: isCreator,
        sessionData: updatedSession,
      });

      console.log(`📤 Emitted session_joined to ${username}`);

      // Broadcast user_joined_session to OTHER users in room
      socket.to(roomName).emit('user_joined_session', {
        userId,
        username,
        user: {
          userId,
          username,
          camera: false,
          mic: false,
          screenShare: false,
        },
        participants: updatedParticipants,
        participantCount: updatedParticipants.length,
      });

      console.log(`📢 Broadcasted user_joined_session to room ${roomName}`);
      console.log(`${'═'.repeat(60)}\n`);

    } catch (error) {
      console.error('❌ [join_session] Error:', error);
      socket.emit('error', { message: 'Failed to join session: ' + error.message });
    }
  });

  // ─── ASSIGN ROLE ───────────────────────────────────────────
  socket.on('assign_role', (data) => {
    try {
      const { targetUserId, role } = data;
      const { sessionId } = socket.data;
      const roomName = `buddy_${sessionId}`;

      console.log(`👔 [assign_role] ${socket.data.userId} assigning ${role} to ${targetUserId}`);

      buddyNamespace.to(roomName).emit('role_assigned', {
        targetUserId,
        role,
        assignedBy: socket.data.userId,
      });
    } catch (error) {
      console.error('❌ [assign_role] Error:', error);
      socket.emit('error', { message: 'Failed to assign role' });
    }
  });

  // ─── MEDIA CONTROLS ────────────────────────────────────────
  socket.on('toggle_camera', (data) => {
    const { sessionId } = socket.data;
    const roomName = `buddy_${sessionId}`;
    
    buddyNamespace.to(roomName).emit('camera_toggled', {
      userId: socket.data.userId,
      enabled: data.enabled,
    });
  });

  socket.on('toggle_mic', (data) => {
    const { sessionId } = socket.data;
    const roomName = `buddy_${sessionId}`;
    
    buddyNamespace.to(roomName).emit('mic_toggled', {
      userId: socket.data.userId,
      enabled: data.enabled,
    });
  });

  // ─── SCREEN SHARING ────────────────────────────────────────
  socket.on('start_screenshare', (data) => {
    const { sessionId } = socket.data;
    const roomName = `buddy_${sessionId}`;
    
    buddyNamespace.to(roomName).emit('screenshare_started', {
      userId: socket.data.userId,
      startTime: new Date().toISOString(),
    });
  });

  socket.on('stop_screenshare', (data) => {
    const { sessionId } = socket.data;
    const roomName = `buddy_${sessionId}`;
    
    buddyNamespace.to(roomName).emit('screenshare_stopped', {
      userId: socket.data.userId,
    });
  });

  // ─── WEBRTC SIGNALING ──────────────────────────────────────
  socket.on('webrtc_offer', (data) => {
    const { offer, targetUserId } = data;
    console.log(`📨 [webrtc_offer] From ${socket.data.userId} to ${targetUserId}`);
    
    buddyNamespace.to(targetUserId).emit('webrtc_offer_received', {
      offer: offer,
      from: socket.data.userId,
    });
  });

  socket.on('webrtc_answer', (data) => {
    const { answer, targetUserId } = data;
    console.log(`📤 [webrtc_answer] From ${socket.data.userId} to ${targetUserId}`);
    
    buddyNamespace.to(targetUserId).emit('webrtc_answer_received', {
      answer: answer,
      from: socket.data.userId,
    });
  });

  socket.on('ice_candidate', (data) => {
    const { candidate, targetUserId } = data;
    
    buddyNamespace.to(targetUserId).emit('ice_candidate_received', {
      candidate: candidate,
      from: socket.data.userId,
    });
  });

  // ─── SHARED NOTES ──────────────────────────────────────────
  socket.on('update_notes', (data) => {
    const { sessionId } = socket.data;
    const roomName = `buddy_${sessionId}`;
    
    buddyNamespace.to(roomName).emit('notes_updated', {
      content: data.content,
      updatedBy: socket.data.userId,
    });
  });

  // ─── DISCONNECT ────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`❌ [Buddy] User disconnected: ${socket.id}`);
    
    if (socket.data) {
      const { sessionId, userId, username } = socket.data;
      const roomName = `buddy_${sessionId}`;
      
      buddyNamespace.to(roomName).emit('user_disconnected', {
        userId,
        username,
      });
    }
  });
});

// ─── EXPRESS ROUTES ───────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'Socket server running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── START SERVER ───────────────────────────────────────────────────────

const PORT = process.env.PORT || 10000;

httpServer.listen(PORT, () => {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Socket.io Server Ready!`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`📍 Listening on port: ${PORT}`);
  console.log(`🔗 Namespace: /interview-buddy`);
  console.log(`🌐 URL: http://localhost:${PORT}/socket.io/`);
  console.log(`${'═'.repeat(60)}\n`);
});
