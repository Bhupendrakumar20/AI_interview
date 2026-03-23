# DSA Room - Integration with Interview Buddy

## Overview

Add "DSA Room" as a third mode alongside "Human Buddy" and "AI Buddy" in your existing Interview Buddy component.

---

## File Structure

```
components/
├── InterviewBuddy.jsx           (existing - add DSA mode toggle)
├── AiBuddyInterviewSession.jsx  (existing)
├── DSARoomLive.jsx              (new - live coding interface)
└── DSARoomLobby.jsx             (new - joining/creating)

lib/
├── utils/
│   ├── dsa-room-utils.js        (new - utilities)
│   └── ai-buddy-questions.js    (existing)
├── socket-handlers/
│   └── dsa-room-handlers.js     (new - Socket.io events)
├── judge0-service.js            (new - Judge0 integration)
└── firebase-helpers.js          (existing)

app/api/dsa-room/
├── create/route.js              (new - create room)
├── [roomId]/route.js            (new - get room)
└── [roomId]/results/route.js    (new - final results)

server/
└── dsa-socket-server.js         (new - Socket.io server)

docs/
├── DSA_ROOM_ARCHITECTURE.md     (new)
├── DSA_ROOM_DEPLOYMENT_GUIDE.md (new)
├── DSA_ROOM_FIRESTORE_RULES.txt (new)
└── DSA_ROOM_INTEGRATION.md      (this file)
```

---

## Step 1: Update Interview Buddy Component

**Modify: `components/InterviewBuddy.jsx`**

```jsx
'use client';
import React, { useState } from 'react';
import DSARoomLobby from './DSARoomLobby';
import DSARoomLive from './DSARoomLive';

const InterviewBuddy = ({ userId }) => {
  const [currentMode, setCurrentMode] = useState('human'); // 'human' | 'ai' | 'dsa'
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isRoomActive, setIsRoomActive] = useState(false);

  return (
    <>
      {isRoomActive && activeRoomId && currentMode === 'dsa' ? (
        <DSARoomLive roomId={activeRoomId} userId={userId} />
      ) : (
        <div className="min-h-screen bg-slate-950 text-slate-100">
          {/* HEADER */}
          <div className="relative px-10 pt-9">
            <h1 className="text-5xl font-black mb-3 leading-tight">
              Interview<br />
              <span className="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Buddy
              </span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed max-w-md">
              Practice with a human partner, AI interviewer, or in a competitive DSA room.
            </p>
          </div>

          {/* MODE SELECTOR */}
          <div className="px-10 mb-8 mt-8">
            <h2 className="text-xl font-bold mb-4">🎯 Choose Your Mode</h2>
            <div className="grid md:grid-cols-3 gap-4">
              
              {/* Human Buddy */}
              <div
                onClick={() => setCurrentMode('human')}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  currentMode === 'human'
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <div className="text-3xl mb-3">👥</div>
                <h3 className="text-lg font-bold mb-2">Human Buddy</h3>
                <p className="text-sm text-slate-300">
                  Interview with a peer via video
                </p>
              </div>

              {/* AI Buddy */}
              <div
                onClick={() => setCurrentMode('ai')}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  currentMode === 'ai'
                    ? 'border-purple-500 bg-purple-500/5'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="text-lg font-bold mb-2">AI Buddy</h3>
                <p className="text-sm text-slate-300">
                  AI interviewer with live coaching
                </p>
              </div>

              {/* DSA Room (NEW) */}
              <div
                onClick={() => setCurrentMode('dsa')}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  currentMode === 'dsa'
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="text-lg font-bold mb-2">DSA Room</h3>
                <p className="text-sm text-slate-300">
                  Multiplayer competitive coding (up to 10 users)
                </p>
              </div>
            </div>
          </div>

          {/* RENDER SELECTED MODE */}
          {currentMode === 'human' && <HumanBuddyUI />}
          {currentMode === 'ai' && <AIBuddyUI />}
          {currentMode === 'dsa' && (
            <DSARoomLobby
              userId={userId}
              onRoomCreated={(roomId) => {
                setActiveRoomId(roomId);
                setIsRoomActive(true);
              }}
              onRoomJoined={(roomId) => {
                setActiveRoomId(roomId);
                setIsRoomActive(true);
              }}
            />
          )}
        </div>
      )}
    </>
  );
};

export default InterviewBuddy;
```

---

## Step 2: Create DSA Room Lobby Component

**New file: `components/DSARoomLobby.jsx`**

```jsx
'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { isValidRoomCode } from '@/lib/utils/dsa-room-utils';

const DSARoomLobby = ({ userId, onRoomCreated, onRoomJoined }) => {
  const [action, setAction] = useState('choose'); // 'choose' | 'create' | 'join'
  const [isLoading, setIsLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dsa-room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username: username || 'Anonymous' }),
      });

      const { roomId } = await response.json();
      toast.success('Room created! Waiting for players...');
      onRoomCreated(roomId);
    } catch (error) {
      toast.error('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!isValidRoomCode(roomCode)) {
      toast.error('Invalid room code format');
      return;
    }

    setIsLoading(true);
    try {
      // Socket.io join will be handled in DSARoomLive
      onRoomJoined(roomCode);
    } catch (error) {
      toast.error('Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  if (action === 'choose') {
    return (
      <div className="px-10 py-8">
        <h2 className="text-2xl font-bold mb-6">🏆 DSA Room</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
          
          {/* Create Room */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 cursor-pointer hover:border-blue-500/30 transition"
            onClick={() => setAction('create')}>
            <h3 className="text-lg font-bold text-white mb-2">✦ Create Room</h3>
            <p className="text-sm text-slate-400 mb-4">
              Start a new competitive coding session. Invite up to 9 friends.
            </p>
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              Create <span>→</span>
            </div>
          </div>

          {/* Join Room */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 cursor-pointer hover:border-green-500/30 transition"
            onClick={() => setAction('join')}>
            <h3 className="text-lg font-bold text-white mb-2">🔗 Join Room</h3>
            <p className="text-sm text-slate-400 mb-4">
              Join an existing room using a code. Compete with others in real-time.
            </p>
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              Join <span>→</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (action === 'create') {
    return (
      <div className="px-10 py-8 max-w-md">
        <button
          onClick={() => setAction('choose')}
          className="mb-6 text-blue-400 text-sm font-semibold hover:text-blue-300"
        >
          ← Back
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Create DSA Room</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Your Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="AliceCode"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 text-white font-bold rounded transition"
          >
            {isLoading ? '⚡ Creating...' : '✦ Create Room'}
          </button>
        </div>
      </div>
    );
  }

  if (action === 'join') {
    return (
      <div className="px-10 py-8 max-w-md">
        <button
          onClick={() => setAction('choose')}
          className="mb-6 text-green-400 text-sm font-semibold hover:text-green-300"
        >
          ← Back
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Join DSA Room</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="X9K2L"
              maxLength="5"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-center"
            />
            <p className="text-xs text-slate-500 mt-1">Ask your friends for the room code</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Your Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="BobCode"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={isLoading || roomCode.length < 5}
            className="w-full px-6 py-3 bg-linear-to-r from-green-600 to-green-700 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 text-white font-bold rounded transition"
          >
            {isLoading ? '⚡ Joining...' : '🔗 Join Room'}
          </button>
        </div>
      </div>
    );
  }
};

export default DSARoomLobby;
```

---

## Step 3: Environment Setup

**Add to `.env.local`:**

```env
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:3001
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_api_key_here
```

---

## Step 4: Installation

```bash
# Install Socket.io client
npm install socket.io-client

# Install Judge0 service (optional, if using batch processing)
npm install axios

# Install Bull for background jobs (optional, production)
npm install bull redis ioredis
```

---

## Step 5: Update Firestore Rules

Add DSA Room rules to your existing rules:

**Firebase Console → Firestore Database → Rules:**

```
match /dsa_rooms/{roomId} {
  allow read: if request.auth.uid != null;
  allow create: if request.auth.uid != null;
  allow update: if request.auth.uid in resource.data.participants;
  allow delete: if resource.data.createdBy == request.auth.uid;
}

match /dsa_room_participants/{participantId} {
  allow read: if request.auth.uid in get(/databases/$(database)/documents/dsa_rooms/$(resource.data.roomId)).data.participants;
  allow create: if true;
  allow update: if request.auth.uid == resource.data.userId;
}

match /dsa_room_submissions/{submissionId} {
  allow read: if request.auth.uid in get(/databases/$(database)/documents/dsa_rooms/$(resource.data.roomId)).data.participants;
  allow create: if request.auth.uid == resource.data.userId;
  allow update, delete: if false;
}

match /dsa_questions/{questionId} {
  allow read: if true;
  allow write: if false;
}
```

---

## Step 6: Start Socket.io Server (Development)

```bash
# In a separate terminal
node server/dsa-socket-server.js
```

Or use a process manager:

```bash
npm install -g pm2
pm2 start server/dsa-socket-server.js --name "dsa-socket"
```

---

## Testing Checklist

- [ ] Create room → receive room code
- [ ] Join room with code → connect to Socket.io
- [ ] 2+ users in room
- [ ] Vote on time limit
- [ ] Vote on question mode
- [ ] Timer starts and counts down
- [ ] Submit code → Judge0 processes
- [ ] Leaderboard updates on successful submission
- [ ] First Blood bonus awarded
- [ ] Disconnect/reconnect → state preserved
- [ ] Room closes after time limit

---

## Deployment

### Development

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Socket.io server
node server/dsa-socket-server.js

# Terminal 3: (Optional) Judge0 background processor
node server/judge0-processor.js
```

### Production

**Option 1: Hosted Socket.io (Recommended)**
- Use **socket.io cloud** or **Heroku**
- Set `NEXT_PUBLIC_SOCKET_IO_URL` to hosted URL

**Option 2: Self-Hosted**
- Deploy Node.js Socket server to same infrastructure
- Use load balancer with Redis adapter

---

## Key Metrics to Track

```javascript
// In your analytics/logging
{
  event: 'dsa_room_created',
  roomId,
  createdBy: userId,
  timestamp,
  maxParticipants
}

{
  event: 'dsa_submission_success',
  roomId,
  userId,
  questionId,
  language,
  timeFromStart,
  pointsEarned,
  isFirstBlood
}

{
  event: 'dsa_room_completed',
  roomId,
  totalParticipants,
  totalSubmissions,
  averageScore,
  duration
}
```

---

## API Documentation Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dsa-room/create` | POST | Create new room |
| `/api/dsa-room/[roomCode]` | GET | Get room by code |
| `/api/dsa-room/[roomId]/leaderboard` | GET | Fetch live leaderboard |
| `/api/dsa-room/[roomId]/results` | GET | Get final results |

---

## Next Steps

1. ✅ Create `DSARoomLobby.jsx` component
2. ✅ Modify `InterviewBuddy.jsx` to include DSA mode
3. ✅ Set up Firestore collections & rules
4. ✅ Configure Judge0 API key
5. ✅ Start Socket.io server
6. ⚠️ Test end-to-end
7. ⚠️ Add code plagiarism detection
8. ⚠️ Deploy to production

---

## Support

For issues, refer to:
- Architecture: `docs/DSA_ROOM_ARCHITECTURE.md`
- Deployment: `docs/DSA_ROOM_DEPLOYMENT_GUIDE.md`
- Firestore Rules: `docs/DSA_ROOM_FIRESTORE_RULES.txt`
