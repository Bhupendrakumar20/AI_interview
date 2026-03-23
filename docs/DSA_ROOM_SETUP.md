# DSA Room — Production Setup Guide

## Overview

A complete real-time multiplayer DSA (Data Structures & Algorithms) competitive coding platform with:
- 🎮 Room creation & lobby management
- 🗳️ Voting phase for game settings
- ⚙️ Judge0 code execution
- 📊 Real-time leaderboard
- 🏁 Post-match code review dashboard
- 🩸 First Blood gamification

---

## Architecture

### Backend (Socket.io Server)
- **File**: `server/dsa-socket-server-prod.js`
- **Port**: `4001` (configurable via `PORT` env var)
- **Features**:
  - Room lifecycle management (lobby → voting → active → review → closed)
  - Vote aggregation for game settings
  - Server-authoritative timer (broadcasts every second)
  - Judge0 integration for code execution
  - Points calculation with bonuses
  - In-memory room store (use Redis for production scaling)

### Frontend (React Components)
- **Main Component**: `components/DSARoomLobbyProd.jsx`
  - Room creation/joining with professional card UI
  - Voting phase interface
  - Transition to live room
  
- **Live Room**: `components/DSALiveRoom.jsx`
  - Monaco editor with language switching
  - Real-time leaderboard
  - Server-synced timer
  - First blood celebrations
  - Post-match dashboard with code review
  
- **Entry Point**: `app/(root)/dsa-room/page.jsx`
  - Username prompt
  - Launch interface

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install express socket.io axios
```

### 2. Environment Variables

Create `.env.local`:
```env
# Socket.io Server
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:4001

# Judge0 (optional - for code execution)
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-api-key
```

### 3. Start the Socket Server

In one terminal:
```bash
node server/dsa-socket-server-prod.js
```

You should see:
```
🎮 [DSA Room Server] Running on port 4001
📊 Rooms: 0
✅ Ready for connections
```

### 4. Start the Next.js App

In another terminal:
```bash
npm run dev
```

### 5. Access DSA Room

Navigate to: `http://localhost:3000/dsa-room`

---

## Usage Flow

### 1. **Create Room**
- Enter username and click "Create as Owner"
- Receive unique room code (e.g., `DSA-7X4K9`)
- Share code with friends

### 2. **Join Room**
- Enter received room code
- Click "Request to Join"
- Wait for owner to approve (future enhancement)

### 3. **Voting Phase** (Host Only)
- Vote on question mode:
  - **Same**: Everyone solves the same problem
  - **Different**: Each player gets a unique problem
- Vote on time limit: 30, 45, or 60 minutes
- Click "Start Game" to begin

### 4. **Live Coding**
- Edit code in Monaco editor
- Switch language: JS, Python, Java, C++
- Real-time leaderboard shows:
  - Current rank (🥇🥈🥉)
  - Status: Solving vs. Solved
  - Points and time taken
  - First Blood bonus highlight
- Live timer counts down (server-authoritative)
- Submit with `Ctrl/Cmd + Enter` or button

### 5. **Results**
- Immediate feedback: All tests passed or details of failures
- Points awarded:
  - Base: 100 points
  - Speed bonus: +2 per remaining minute
  - First Blood bonus: +50 points
- Automatic transition to Post-Match when all solve or time expires

### 6. **Post-Match Dashboard**
- Final leaderboard standings
- Code review with submissions from all players
- Click usernames to expand and view their solutions

---

## Socket Events Reference

### Server → Client

| Event | Payload | Purpose |
|-------|---------|---------|
| `room_started` | `{config, question, endsAt}` | Game begins, send question |
| `timer_tick` | `{remaining, endsAt}` | Timer update each second |
| `leaderboard_update` | `{leaderboard, event}` | Real-time ranking change |
| `first_blood` | `{username, avatar, timeTakenSecs}` | Celebration notification |
| `user_judging` | `{userId, username}` | Show someone is being judged |
| `user_left` | `{userId, username, users}` | Player disconnected |
| `room_ended` | `{leaderboard, codeReview, summary}` | Game over, send results |
| `lobby_update` | `{users}` | User list changed |
| `vote_update` | `{questionModeVotes, timeLimitVotes, totalUsers}` | Vote counts |
| `host_transferred` | `{newHostId}` | Host disconnected, new host assigned |

### Client → Server

| Event | Payload | Response |
|-------|---------|----------|
| `room_create` | `{username, avatar}` | `{success, roomCode}` |
| `room_join` | `{roomCode, username, avatar}` | `{success, lobbyState}` |
| `cast_vote` | `{type, value}` | None (broadcasts updated votes) |
| `room_start` | `{}` | `{success, error?}` |
| `set_language` | `{language}` | None |
| `code_submit` | `{sourceCode, language}` | `{success, passed, points, testResults}` |

---

## Points System

```javascript
SOLVE_BASE = 100 points
SPEED_BONUS = +2 points per minute remaining
FIRST_BLOOD_BONUS = +50 points (claimed only once)

Total = 100 + (minutesLeft × 2) + (firstBlood ? 50 : 0)
Example: Solve in 10 mins with 50 mins left = 100 + (50 × 2) + 0 = 200 pts
```

---

## Judge0 Integration

### Supported Languages
- JavaScript (id: 63)
- Python (id: 71)
- Java (id: 62)
- C++ (id: 54)
- C (id: 50)

### Test Case Execution Flow
1. Client submits code with language selection
2. Server submits to Judge0 API for execution
3. Judge0 runs against all hidden test cases
4. Results validated: if all pass, award points
5. Real-time leaderboard update broadcast to room

### Error Handling
- Timeout: Judge0 returns execution timeout error
- Syntax error: Captured in stderr, sent back to client
- Runtime error: Shown in test results
- API error: Graceful fallback with message

---

## Production Considerations

### Scaling
- **In-Memory Store** → **Redis Adapter**
  ```javascript
  // In dsa-socket-server-prod.js
  const { createAdapter } = require("@socket.io/redis-adapter");
  const redis = require("redis");
  const pubClient = redis.createClient();
  const subClient = pubClient.duplicate();
  
  io = new Server(server, {
    adapter: createAdapter(pubClient, subClient)
  });
  ```

### Database Persistence
- Current: In-memory only (lost on restart)
- Recommended: PostgreSQL with schema from previous documentation
- Add async persistence in `endRoom()` function

### Security
- ✅ Store socket IDs (not user-generated)
- ✅ Server-authoritative timer (no client cheating)
- ✅ Hidden test cases never sent to client
- ⚠️ Add rate limiting on code submissions
- ⚠️ Validate Judge0 responses before trusting results
- ⚠️ Authenticate users (currently anonymous)

### Performance
- Monitor room count: `roomStore.size`
- Profile Judge0 latency (usually 1-3 seconds)
- Cache question bank to reduce DB queries
- Use pagination for large leaderboards

---

## Testing Checklist

- [ ] Create room → Get unique code
- [ ] Join room with code → See pending state
- [ ] Multiple users in lobby → See all listed
- [ ] Vote on settings → See votes tally
- [ ] Start game → Transition to live room
- [ ] See timer counting down
- [ ] Switch languages → Code startup template changes
- [ ] Submit code → See "judging" status
- [ ] Correct solution → Points awarded, leaderboard updates
- [ ] Wrong solution → Test results show which failed
- [ ] Timer expires → Game ends, show results
- [ ] Post-match → See final standings and code review
- [ ] Disconnect → Other players see "user left" event
- [ ] Host disconnects → Host transferred to next player

---

## Troubleshooting

### Socket Not Connecting
- Check `NEXT_PUBLIC_SOCKET_IO_URL` points to running server
- Verify server listening on port 4001
- Check CORS settings in server

### Code Submission Hangs
- Judge0 API key may be invalid or rate-limited
- Check server logs for timeout errors
- Fall back to mock results for testing

### Timer Not Syncing
- Server time and client time drift
- Timer is authoritative on server, clients just display
- Should auto-correct on next `timer_tick` event

### Leaderboard Not Updating
- Check socket connection status
- Verify `code_submit` callback is being called
- Check browser console for errors

---

## Future Enhancements

1. **User Profiles** - Track stats and ratings across games
2. **Queue System** - Auto-match players instead of manual rooms
3. **Difficulty Progression** - Select problem difficulty
4. **Achievements** - Badges for milestones (first blood, speed runner, etc.)
5. **Streaming** - Broadcast room to spectators
6. **Mobile App** - React Native version
7. **AI Hints** - ChatGPT integration for problem hints
8. **Custom Problems** - Users create and share problems
9. **Tournament Mode** - Bracket-based competitions
10. **Practice Mode** - Solo coding without competition

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅
