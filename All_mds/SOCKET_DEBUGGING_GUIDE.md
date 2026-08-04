# Socket.io Debugging Guide - Human Buddy Mode

## CRITICAL ISSUE DISCOVERED

The socket server running on **Render** (`https://ai-interview-socket.onrender.com`) is deployed from a **separate repository** (`socket-server-vercel`), NOT from your AI_interview repo.

This means:
- ❌ The handlers in `lib/socket-handlers/human-buddy-handlers.js` are NOT being used by production socket server
- ❌ The socket server might have old/incomplete code
- ✅ The frontend code with handlers is in `lib/socket-handlers/` for reference  
- ✅ The handlers are ALSO imported in `server/dsa-socket-server.js` (for local dev)

---

## Expected Socket Flow (What SHOULD Happen)

### When User A Creates Session
```
User A Browser:                          Socket Server:                       Database:
1. Create session → POST /api/create ─────────────────> Create in Firestore
2. Launches HumanBuddySession component
3. Socket connects
4. emit('join_session') ───────────────> Update Firestore
                                         └─ Set participants = [UserA]
5. Receive emit('session_joined')
   - participants: [UserA]  
   - remoteUsers: [] (empty, waiting for User B)
```

### When User B Joins Session  
```
User B Browser:                          Socket Server:                       Database:
1. env /interview/buddy/[code] page
2. Socket connects
3. emit('join_session') ───────────────> Query Firestore for session
                                         Update: participants = [UserA, UserB]
                                         └─ Also store User B data
4. Receive emit('session_joined') ◄────
   - participants: [UserA, UserB]
   - remoteUsers: [{ userId: UserA, username: 'UserA', ... }]
   
                                         Broadcast to room 'buddy_[sessionId]':
                                         emit('user_joined_session') ────────> User A receives!
                                                                   - userId: UserB
                                                                   - participants: [UserA, UserB]
```

### User A Receives User B Joined
```
User A Browser (in room 'buddy_[sessionId]'):
1. Receive emit('user_joined_session')
2. Extract remoteUser from event data
3. Set remoteUser state with User B info
4. WebRTC flow starts:
   - User A (owner) creates WebRTC offer
   - Sends offer to User B
   - User B receives offer, creates answer
   - Answer sent back to User A  
   - ICE candidates exchanged
   - ✅ VIDEO CALL ESTABLISHED
```

---

## Current Issue: Likely Causes

### Scenario 1: Socket Server Missing Handlers ❌
**Symptom**: "Other member doesn't see" + "No approval arrives"
**Cause**: Render socket server doesn't have `initializeHumanBuddyHandlers()` or has incomplete version
**Fix**: Update socket server code

### Scenario 2: Wrong Room Name ❌  
**Symptom**: User A connects, User B connects, but they don't see each other
**Cause**: `socket.join()` uses wrong room name or rooms don't match
**Expected**: Both use room name = `buddy_${sessionId}`
**Check**: Console log showing room name

### Scenario 3: CORS Still Blocking
**Symptom**: Socket won't connect at all
**Current Status**: ✅ FIXED (CORS configured in Render logs)

### Scenario 4: Session Code Not Found
**Symptom**: Second user gets "Session not found" error
**Cause**: Database query fails or session not saved properly
**Check**: Console should show session found in Firestore

---

## How to Debug Using New Logs

### Step 1: Open Browser Console
User A:
```
Press F12 → Console tab
```

### Step 2: Watch for These Log Sections
Look for section dividers: `════════════════════════════════════════════════════════`

**User A should see:**
```
═════════ [HumanBuddy] ONE-TIME Socket Connection ═════════
📍 UserId: [user_a_id]
👤 Username: UserA
🔑 SessionCode: IB-XXXXX
👑 IsOwner: true
🌐 Socket URL: https://ai-interview-socket.onrender.com
✅ Socket connected: [socket_id_1]
📤 [HumanBuddy] Emitting join_session
✅ [HumanBuddy] session_joined received:
  - Participants: ["user_a_id"]
  - Remote Users Count: 0  ← ALONE so far
  
[After User B joins...]

✅ [HumanBuddy] USER_JOINED_SESSION received  ← THIS IS KEY!
  - Joining User: UserB (user_b_id)
  - User Object Available: true
🎯 [ACTION] Setting remote user from user_joined_session
   User: UserB (user_b_id)
   Camera: false, Mic: false, Screen: false

✅ [HumanBuddy] RTCPeerConnection created
📹 [HumanBuddy] Adding local 2 tracks...
   ✅ Added local video track #1
   ✅ Added local audio track #2

🎬 [HumanBuddy] OWNER: Creating WebRTC offer...
🔨 [HumanBuddy] Offer created and set as local description
📤 [HumanBuddy] Sending offer to UserB...
✅ [HumanBuddy] Offer sent via socket

[User should see remote video after answer received...]
```

**User B should see:**
```
═════════ [HumanBuddy] ONE-TIME Socket Connection ═════════
📍 UserId: [user_b_id]
👤 Username: UserB
🔑 SessionCode: IB-XXXXX
👑 IsOwner: false
...
✅ [HumanBuddy] session_joined received:
  - Participants: ["user_a_id", "user_b_id"]
  - Remote Users Count: 1  ← Can see User A!
🎯 [ACTION] Setting remote user from session_joined
   User: UserA (user_a_id)
   ...

👂 [HumanBuddy] PEER: Waiting for WebRTC offer...

[After receiving offer...]

📨 [HumanBuddy] WEBRTC OFFER RECEIVED
   From User: user_a_id
🔨 [HumanBuddy] Creating PeerConnection...
📹 [HumanBuddy] Adding local tracks...
🔄 [HumanBuddy] Setting remote description from offer...
✅ [HumanBuddy] Remote description set
🎬 [HumanBuddy] Creating answer...
✅ [HumanBuddy] Answer created and set as local description
📤 [HumanBuddy] Sending answer back...
✅ [HumanBuddy] Answer sent

[After ICEs exchanged...]
✅ [HumanBuddy] Remote track received in offer handler: video
✅ [HumanBuddy] Set remote video source
```

---

## Comparison: What's Working vs What's Broken

### ✅ WORKING
- Socket connects (check CORS logs on Render show it's listening)
- User A can join session (first emit works)
- Session created in Firestore

### ❌ LIKELY BROKEN  
- User B doesn't receive `session_joined` with proper remoteUsers
- User A doesn't receive `user_joined_session` when User B joins
- WebRTC signaling events not transmitted

### 🔍 NEED TO VERIFY
- Does socket server emit events back to client?
- Are room broadcasts working (`socket.to(roomName).emit()`)?
- Is Firestore query finding the session?

---

## The Fix: Update Socket Server

The socket server code (`socket-server-vercel` repo on Render) needs:

1. **Initialize Human Buddy Handlers**
```javascript
import { initializeHumanBuddyHandlers } from '../lib/socket-handlers/human-buddy-handlers.js';
// In your socket.io setup:
initializeHumanBuddyHandlers(io);
```

2. **Ensure `/interview-buddy` namespace exists**
```javascript
const buddyNamespace = io.of('/interview-buddy');
// Then register handlers on this namespace
```

3. **Ensure handler exports are correct**
The `human-buddy-handlers.js` exports a function `initializeHumanBuddyHandlers()` that sets up all listeners

---

## Quick Test

### Test 1: Check Socket Connection
```javascript
// Paste in console while in buddy session
console.log('Socket ID:', socket?.id);
console.log('Socket Connected:', socket?.connected);
console.log('Socket URL:', socket?.iolient?.opts?.path);
```

### Test 2: Check Firestore Session
```javascript
// Browser DevTools → Application → Indexeddb → firebase-db → interview_buddy_sessions
// Should show your session with correct participants
```

### Test 3: Manual Event Emission
```javascript
// Emit event to see if server responds (for testing only!)
socket?.emit('test_event', { message: 'hello' });
socket?.on('test_response', (data) => console.log('Server responded!', data));
```

---

## Next Steps

1. **Check Render Socket Server Code**
   - Repo: `https://github.com/Bhupendrakumar20/socket-server-vercel`
   - File to check: `index.js` or main server file
   - Verify: `initializeHumanBuddyHandlers()` is called

2. **Copy Latest Handlers**
   - Copy `lib/socket-handlers/human-buddy-handlers.js` from AI_interview repo
   - Paste into socket-server repo
   - Ensure import path is correct

3. **Deploy Updated Socket Server**
   - Push to `socket-server-vercel` repo
   - Render will auto-deploy (watch logs)
   - Verify new code is running

4. **Test End-to-End**
   - User A creates session
   - Check console logs (should see session_joined with remoteUsers = [])
   - User B joins via invite
   - Check console logs:
     - User A: should receive 'user_joined_session'
     - User B: should receive 'session_joined' with User A in remoteUsers
   - Both: WebRTC should initialize and video should show

---

## Console Log Blueprint

For reference, here are the log sections to look for:

```
✅ Socket connected
─────
✅ session_joined received
─────
✅ USER_JOINED_SESSION received  ← Most important! If missing = socket server not emitting
─────
🚀 Initializing RTCPeerConnection
─────
✅ REMOTE TRACK RECEIVED  ← Video showing up!
```

If ANY of these are missing from either user's console, that's where the problem is.
