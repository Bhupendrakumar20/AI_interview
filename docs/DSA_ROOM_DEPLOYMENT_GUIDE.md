# DSA Room - Implementation & Deployment Guide

## Quick Start

### Step 1: Database Setup

**1a. Create Collections in Firestore:**

```javascript
// Collections to create (with sample documents):

dsa_rooms/
  - roomId: "room_1234abcd"
  - roomCode: "X9K2L"
  - createdBy: "user123"
  - status: "lobby|voting|in-progress|completed"
  - participants: ["user1", "user2", ...]
  - maxParticipants: 10
  - questionIds: ["q1", "q2", ...]
  - timeVotes: { "30": 3, "45": 2 }
  - questionModeVotes: { "same": 5 }
  - serverStartTime: Timestamp
  - solvedByUsers: { "q1": ["user2", "user5"], "q2": ["user1"] }

dsa_room_participants/
  - roomId: "room_1234abcd"
  - userId: "user123"
  - username: "alice_dev"
  - joinedAt: Timestamp
  - status: "active|disconnected|left"
  - points: 250
  - correctSubmissions: [{ questionId, timestamp, timeMs }]
  - firstBloodQuestions: ["q1"]

dsa_room_submissions/
  - roomId: "room_1234abcd"
  - userId: "user123"
  - questionId: "q1"
  - code: "def solve():\n  pass"
  - language: "python|javascript|..."
  - submittedAt: Timestamp
  - timeFromStart: 125000 (ms)
  - status: "pending|completed"
  - testResults: { totalTests: 5, passed: 4, failed: 1 }

dsa_questions/
  - questionId: "q1"
  - title: "Two Sum"
  - difficulty: "easy|medium|hard"
  - source: "HundredDaysOfCode|LeetCode"
  - description: "..."
  - testCases: [{ input, expected, visible }]
  - topics: ["array", "hash-table"]
```

**1b. Add Security Rules:**

Go to Firebase Console → Firestore Database → Rules tab:
1. Copy entire `DSA_ROOM_FIRESTORE_RULES.txt`
2. Paste into rules editor
3. Click "Publish"

**1c. Create Composite Indexes:**

Firestore will auto-suggest these, or create manually:
- Collection: `dsa_rooms` | Fields: `participants (Asc)` + `createdAt (Desc)`
- Collection: `dsa_room_participants` | Fields: `roomId (Asc)` + `points (Desc)`

---

### Step 2: Environment Configuration

**.env.local:**

```env
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here
SOCKET_IO_URL=http://localhost:3001  # Your Socket.io server
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:3001
```

**Get Judge0 API Key:**
1. Sign up at https://rapidapi.com/judge0-judge0-default/api/judge0
2. Subscribe to Judge0 API (free tier available)
3. Copy API Key from dashboard → Endpoints

---

### Step 3: Socket.io Server Setup

**Create socket server (Node.js/Express):**

```javascript
// server/socket-server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeDSARoomHandlers } from '../lib/socket-handlers/dsa-room-handlers.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:4001', // Your Next.js dev server
    methods: ['GET', 'POST'],
  },
});

// Initialize DSA Room handlers
initializeDSARoomHandlers(io, Socket);

httpServer.listen(3001, () => {
  console.log('Socket.io server running on port 3001');
});
```

**Start Socket.io server:**

```bash
node server/socket-server.js
```

---

### Step 4: Frontend Integration

**Create room creation page:**

```jsx
// app/(root)/dsa-room/create/page.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function CreateDSARoom({ userId, username }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dsa-room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username }),
      });

      const { roomId, roomCode } = await response.json();
      toast.success(`Room created! Code: ${roomCode}`);
      
      // Redirect to room
      router.push(`/dsa-room/${roomId}`);
    } catch (error) {
      toast.error('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleCreateRoom} disabled={isLoading}>
      {isLoading ? 'Creating...' : '✦ Create DSA Room'}
    </button>
  );
}
```

**Create room live page:**

```jsx
// app/(root)/dsa-room/[roomId]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import DSARoomLive from '@/components/DSARoomLive';

export default function DSARoomPage({ params, user }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_IO_URL, {
      namespace: '/dsa-room',
    });

    newSocket.on('connect', () => {
      console.log('[Socket.io] Connected');
      newSocket.emit('room_join', {
        userId: user.id,
        username: user.name,
        roomCode: params.roomCode, // From query params
      });
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [user, params]);

  if (!socket) return <div>Connecting...</div>;

  return (
    <DSARoomLive
      roomId={params.roomId}
      userId={user.id}
      username={user.name}
      socket={socket}
    />
  );
}
```

---

### Step 5: Judge0 Processing Service

**Create background job processor (optional but recommended):**

```javascript
// server/judge0-processor.js
import { runAllTestCases, getLanguageId } from '../lib/judge0-service.js';
import { db } from '../firebase/admin.js';

// Poll for pending submissions every 2 seconds
setInterval(async () => {
  const submissions = await db
    .collection('dsa_room_submissions')
    .where('status', '==', 'pending')
    .limit(10)
    .get();

  for (const doc of submissions.docs) {
    const submission = doc.data();
    
    try {
      const question = await db
        .collection('dsa_questions')
        .doc(submission.questionId)
        .get();

      const results = await runAllTestCases({
        sourceCode: submission.code,
        languageId: getLanguageId(submission.language),
        testCases: question.data().testCases,
      });

      // Emit result via Socket.io
      io.to(`room_${submission.roomId}`).emit('judge0_result', {
        submissionId: doc.id,
        roomId: submission.roomId,
        userId: submission.userId,
        questionId: submission.questionId,
        passed: results.allPassed,
        testResults: results,
        timeFromStart: submission.timeFromStart,
      });

      // Update submission
      await doc.ref.update({
        status: 'completed',
        testResults: results,
      });
    } catch (error) {
      console.error('Judge0 processing error:', error);
    }
  }
}, 2000);
```

---

## Architecture Decisions

### Why Socket.io?

✅ Real-time synchronization for 10+ users
✅ Bi-directional communication (server → client leaderboard updates)
✅ Built-in reconnection handling
✅ Easy deployment with horizontal scaling via Redis Adapter

### Why Firestore?

✅ Real-time listeners for live updates
✅ Built-in security rules (no separate auth layer needed)
✅ Scales automatically
✅ Easy integration with Next.js

### Why Judge0?

✅ Multi-language support (20+ languages)
✅ Sandboxed execution (secure)
✅ Free tier available (5 req/sec)
✅ No self-hosting needed

---

## Performance Tuning

### Timer Sync

```javascript
// Server sends time every 1 second
// Client corrects drift instantly
const drift = clientTime - serverTime;
if (Math.abs(drift) > 500) {
  // Resync
  localTimeRemaining = serverTimeRemaining;
}
```

**Result**: Timer never drifts > 500ms

### Leaderboard Updates

Only broadcast when points change (not on every keystroke):

```javascript
socket.on('code_submit', async (data) => {
  // Submit and judge
  // Only emit leaderboard_update if passed
  if (testsPassed) {
    io.to(`room_${roomId}`).emit('leaderboard_update', ranking);
  }
});
```

### Code Editor Optimization

Debounce non-submitting updates:

```javascript
const debouncedCodeUpdate = debounce((code) => {
  socket.emit('code_update', code); // Share with observers (optional)
}, 2000);

<textarea onChange={(e) => debouncedCodeUpdate(e.target.value)} />
```

---

## Testing Checklist

- [ ] Create room → join with 2 users
- [ ] Vote on time limit → timer starts
- [ ] User 1 submits code → leaderboard updates
- [ ] User 2 solves same question later → correct scoring
- [ ] First Blood bonus awarded
- [ ] Timer syncs correctly (no drift)
- [ ] Disconnect/reconnect → state recovered
- [ ] Navigation to next question → code editor resets
- [ ] Results screen shows final ranking

---

## Scaling for Production

### Horizontal Scaling

```javascript
// Use Redis Adapter for multi-server Socket.io
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const pubClient = new Redis();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Caching Questions

```javascript
// Cache questions in Redis (24h TTL)
const question = await redis.get(`question:${questionId}`);
if (!question) {
  const data = await db.collection('dsa_questions').doc(questionId).get();
  await redis.setex(`question:${questionId}`, 86400, JSON.stringify(data.data()));
}
```

### Judge0 Queuing

Use Bull for background job processing:

```javascript
import Queue from 'bull';

const judgeQueue = new Queue('judge0-submissions', {
  redis: { host: 'localhost', port: 6379 },
});

judgeQueue.process(async (job) => {
  const { submissionId } = job.data;
  await processSubmissionWithJudge0(submissionId);
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Timer drifts on client | Server sends `serverTime` every tick for correction |
| Submissions slow | Queue to background job (Bull/RabbitMQ) |
| WebSocket drops | Socket.io auto-reconnects, leverage `disconnect` event |
| Judge0 API limits | Use batching or upgrade plan |
| Leaderboard lag | Only emit on state changes, not every update |

---

## Next Steps

1. ✅ Set up Firestore collections & rules
2. ✅ Configure Judge0 API key
3. ✅ Start Socket.io server
4. ✅ Integrate React component
5. ✅ Test end-to-end flow
6. ⚠️ Add analytics (track room creation, submissions, completion)
7. ⚠️ Add code plagiarism detection (optional)
8. ⚠️ Add admin dashboard (view all rooms, stats)

---

## Support Resources

- Socket.io Docs: https://socket.io/docs/
- Judge0 API: https://rapidapi.com/judge0-judge0-default/api/judge0
- Firestore: https://firebase.google.com/docs/firestore
- Next.js: https://nextjs.org/docs
