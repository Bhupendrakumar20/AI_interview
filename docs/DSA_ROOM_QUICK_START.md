# 🚀 DSA Room — Quick Start Guide

## One-Minute Setup

### Step 1: Install Dependencies
```bash
npm install express socket.io axios
```

### Step 2: Set Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:4001
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-key
```

### Step 3: Start Socket Server (Terminal 1)
```bash
node server/dsa-socket-server-prod.js
```

### Step 4: Start Next.js (Terminal 2)
```bash
npm run dev
```

### Step 5: Open Browser
```
http://localhost:3000/dsa-room
```

---

## Complete Feature Summary

| Feature | Status | Details |
|---------|--------|---------|
| Room Creation | ✅ | Unique codes, real-time updates |
| Room Joining | ✅ | Join by code |
| Voting Phase | ✅ | Question mode + time limit |
| Monaco Editor | ✅ | JS, Python, Java, C++ |
| Live Timer | ✅ | Server-synced, 1s updates |
| Judge0 Execution | ✅ | Real code testing |
| Leaderboard | ✅ | Real-time ranking |
| First Blood | ✅ | +50 bonus + celebration |
| Points System | ✅ | Base 100 + speed bonus |
| Code Review | ✅ | Post-match submission viewer |
| Disconnect Handling | ✅ | Host transfer, cleanup |
| Events Feed | ✅ | Real-time activity stream |

---

## Architecture at a Glance

```
┌─────────────────────────────────────┐
│  User  → DSARoomLobbyProd.jsx       │
│         (Create/Join/Vote)           │
│         ↓                            │
│  User  → DSALiveRoom.jsx            │
│         (Coding + Leaderboard)       │
│         ↓                            │
│  User  → PostMatchDashboard         │
│         (Results + Code Review)      │
└────────────────────┬────────────────┘
                     │ Socket.io
                     ↓
        ┌────────────────────────┐
        │ dsa-socket-server-prod │
        │ (port 4001)            │
        └────────┬───────────────┘
                 │
        ┌────────┴─────────┐
        ↓                  ↓
    Room Store         Judge0 API
    (in-memory)        (code exec)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `server/dsa-socket-server-prod.js` | Core socket server |
| `components/DSARoomLobbyProd.jsx` | Lobby + voting UI |
| `components/DSALiveRoom.jsx` | Live coding UI |
| `app/(root)/dsa-room/page.jsx` | Entry point |
| `docs/DSA_ROOM_SETUP.md` | Full setup guide |

---

## Event Examples

### Create Room
```javascript
socket.emit('room_create', 
  { username: 'Alice', avatar: '👤' }, 
  (res) => console.log(res.roomCode) // 'DSA-7X4K9'
);
```

### Cast Vote
```javascript
socket.emit('cast_vote', { 
  type: 'questionMode', 
  value: 'same' 
});
```

### Submit Code
```javascript
socket.emit('code_submit',
  { sourceCode: 'function solve...', language: 'javascript' },
  (res) => console.log(res.points) // 150
);
```

---

## Testing the System

### Test 1: Create & Join
1. User A: Click "Create as Owner"
2. Share code with User B
3. User B: Click "Request to Join", enter code
4. ✅ Room shows 2 players

### Test 2: Voting
1. Both users vote on question mode
2. Both users vote on time limit
3. User A (host): Click "Start Game"
4. ✅ Transition to live editor

### Test 3: Code Execution
1. User A: Type code solution
2. Click "Submit" (Ctrl+Enter)
3. See "judging" status
4. ✅ Leaderboard updates with points

### Test 4: Post-Match
1. All users solve or timer expires
2. ✅ See final standings
3. ✅ Click to expand code review

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Connection refused" | Check socket server running on 4001 |
| "Room not found" | Verify room code is active |
| "Judge0 Error" | Check API key in `.env.local` |
| Timer not syncing | Refresh page, server is authoritative |
| Leaderboard stuck | Check browser console for socket errors |

---

## Next Enhancements

- [ ] Database persistence (PostgreSQL)
- [ ] User authentication & profiles
- [ ] Difficulty selection
- [ ] Custom problem creation
- [ ] Tournament mode
- [ ] Spectator view
- [ ] Chat during game
- [ ] Mobile responsive UI

---

**Ready to compete?** 🎮
