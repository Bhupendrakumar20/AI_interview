# DEPLOYMENT GUIDE - Fix Human Buddy Mode (Socket Server Update)

## THE PROBLEM - Root Cause Analysis

### What's Happening ❌
```
User A joins → ✅ Success (gets session_joined)
User B joins → ✅ Success (gets session_joined)
BUT:
- User A never receives "User B joined" event
- User B doesn't see User A in remoteUsers
- WebRTC fails to initialize
- No video/audio connection
```

### WHY ❌

The Socket.io server running on **Render** (`https://ai-interview-socket.onrender.com`) is from a **SEPARATE REPOSITORY** (`socket-server-vercel`) and:

1. ❌ Either doesn't have the buddy handlers installed
2. ❌ Or has old/incomplete handlers
3. ❌ Or the handlers aren't being initialized in `index.js`

**Result:** When User B joins, the server doesn't broadcast `user_joined_session` to User A's room.

---

## THE SOLUTION ✅

### Option 1: Deploy Standalone Socket Server to Render (RECOMMENDED)

This is the **fastest fix**. The `STANDALONE_SOCKET_SERVER.js` file contains everything needed - complete, self-contained, no imports.

#### Step 1: Update Socket Server Repository

```bash
# Clone your socket server repo locally (if not already)
git clone https://github.com/Bhupendrakumar20/socket-server-vercel.git
cd socket-server-vercel

# Copy the standalone server file INTO this repo
cp ../AI_interview/STANDALONE_SOCKET_SERVER.js ./index.js

# OR manually create index.js and paste the full content from STANDALONE_SOCKET_SERVER.js
```

#### Step 2: Verify Dependencies

The file needs these npm packages (should already be installed):
```bash
npm install express socket.io cors firebase-admin dotenv
```

#### Step 3: Update Render Configuration

In **Render Dashboard:**

1. Go to your Socket Server deployment
2. **Settings → Build & Deploy**
3. **Build Command:** `npm install` (keep as is)
4. **Start Command:** Change from whatever it is to:
   ```
   node index.js
   ```

5. **Environment Variables** - Make sure these exist:
   ```
   PORT=10000
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   NEXT_PUBLIC_VERCEL_URL=your-vercel-url.vercel.app
   ```

#### Step 4: Deploy

```bash
# In your socket-server-vercel repo
git add index.js .gitignore
git commit -m "feat: Update to standalone socket server with all handlers included"
git push

# Render will auto-deploy. Watch logs at: https://dashboard.render.com/
```

#### Step 5: Verify Deployment

After 2-3 minutes, check Render logs:
```
✅ Socket.io Server Ready!
📍 Listening on port: 10000
🔗 Namespace: /interview-buddy
```

---

### Option 2: Copy Handlers to socket-server-vercel (Alternative)

If standalone deployment doesn't work, manually add handlers:

```bash
# In socket-server-vercel repo
cp ../AI_interview/lib/socket-handlers/human-buddy-handlers.js ./lib/socket-handlers/

# Update index.js to import:
import { initializeHumanBuddyHandlers } from './lib/socket-handlers/human-buddy-handlers.js';

// Then in your socket.io setup:
initializeHumanBuddyHandlers(io);
```

---

## Test the Fix ✅

### Test 1: Verify Socket Server Deployed

```bash
# Open browser to socket server URL
https://ai-interview-socket.onrender.com/health

# Should see: {"status":"ok","timestamp":"2026-04-04T..."}
```

### Test 2: End-to-End Flow

**User A (Creator):**
1. Open https://your-site.vercel.app/interview/buddy
2. Click "Start Human Buddy"
3. Share invite link with User B
4. Open browser console (F12 → Console)
5. **Look for these logs in order:**
   ```
   ✅ Socket connected: socket_id_123
   📤 Emitting join_session
   ✅ session_joined received:
      - Participants: ["user_a_id"]
      - Remote Users Count: 0  ← ALONE
   
   [After User B joins...]
   
   ✅ USER_JOINED_SESSION received  ← KEY LOG!
      - Joining User: UserB (user_b_id)
      - User Object Available: true
   
   🚀 Initializing RTCPeerConnection
   ✅ REMOTE TRACK RECEIVED
   ```

**User B (Joiner):**
1. Receive invite link from User A
2. Click link
3. Should auto-join
4. Open browser console (F12 → Console)
5. **Look for:**
   ```
   ✅ Socket connected: socket_id_456
   📤 Emitting join_session
   ✅ session_joined received:
      - Participants: ["user_a_id", "user_b_id"]
      - Remote Users Count: 1  ← SEE User A!

   👂 PEER: Waiting for WebRTC offer...
   
   📨 WEBRTC OFFER RECEIVED
   🎬 Creating answer...
   ✅ Answer sent
   
   ✅ REMOTE TRACK RECEIVED  ← User A's video!
   ```

### Test 3: Verify Video Connection

1. Both users should see:
   - ✅ Local video (self)
   - ✅ Remote video (other user)
   - ✅ No disconnects
   - ✅ Audio working

2. Try camera toggle:
   - User A toggles camera off
   - Should see `camera_toggled` log
   - User B should see User A's camera as off

3. Try screen share:
   - User A clicks "Share Screen"
   - Both should switch to screen view
   - Should see `screenshare_started` log

---

## Troubleshooting

### "Other member doesn't see" Still Happening ❌

**Check 1: Render logs**
```
Watch https://dashboard.render.com/ for errors
Look for: "Socket.io Server Ready!" message
```

**Check 2: Browser console**
```
If NO "USER_JOINED_SESSION" received log:
→ Socket events not being broadcast
→ Socket server code not running handlers
```

**Check 3: Firestore**
```
Browser DevTools → Application → Indexeddb → firebase-db
→ interview_buddy_sessions
→ Your session document
→ Verify: participants array should have BOTH users
```

**Check 4: Socket Connection**
```
Paste in browser console:
console.log('Socket ID:', socket?.id);
console.log('Socket connected:', socket?.connected);

Both should show valid values
```

### Socket Server Not Starting ❌

**Error in Render logs:** `Cannot find module`

**Fix:** 
```bash
cd socket-server-vercel
npm install express socket.io cors firebase-admin dotenv
git add package-lock.json
git commit -m "update: install dependencies"
git push
# Render will retry automatically
```

### Firebase Connection Fails ❌

**Error:** `Failed to initialize Firebase`

**Fix:**
1. Check environment variable: `FIREBASE_SERVICE_ACCOUNT`
2. Should be valid JSON with these fields:
   ```json
   {
     "type": "service_account",
     "project_id": "...",
     "private_key_id": "...",
     "private_key": "...",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "...",
     "token_uri": "...",
     "auth_provider_x509_cert_url": "...",
     "client_x509_cert_url": "..."
   }
   ```
3. If not set, socket server will run in mock mode (testing only)

---

## File Locations

### On Your Machine
- ✅ `STANDALONE_SOCKET_SERVER.js` - Complete socket server code
- ✅ `SOCKET_DEBUGGING_GUIDE.md` - Debugging reference
- ✅ `components/HumanBuddySession.jsx` - Frontend with logging

### On Socket Server Repo (socket-server-vercel)
- ❌ `index.js` - Should be replaced with STANDALONE_SOCKET_SERVER.js
- ✅ `package.json` - Dependencies (express, socket.io, firebase-admin, cors)
- ✅ `.env` or environment variables in Render dashboard

---

## Quick Checklist

- [ ] Copied `STANDALONE_SOCKET_SERVER.js` to socket-server-vercel as `index.js`
- [ ] Verified dependencies installed: `npm install`
- [ ] Updated Render start command to: `node index.js`
- [ ] Set environment variables on Render:
  - [ ] `PORT=10000`
  - [ ] `FIREBASE_SERVICE_ACCOUNT`
  - [ ] `NEXT_PUBLIC_VERCEL_URL`
- [ ] Deployed to Render: `git push`
- [ ] Verified server started: Check Render logs for "Socket.io Server Ready!"
- [ ] Tested User A joins: Check console for `session_joined`
- [ ] Tested User B joins: Check console for `USER_JOINED_SESSION` (User A) and `session_joined` with remoteUsers (User B)
- [ ] Verified video shows on both sides
- [ ] Tested no disconnects on camera/mic toggle

---

## Expected Result ✅

After deploying the socket server:

```
User A Console:
═════
✅ Socket connected
✅ session_joined (participants: [A])
✅ USER_JOINED_SESSION (B just joined!)  ← This should appear now!
🚀 Initializing RTCPeerConnection
✅ REMOTE TRACK RECEIVED
[User B's video shows]

User B Console:
═════
✅ Socket connected
✅ session_joined (participants: [A, B], remoteUsers: [A])  ← See User A!
📨 WEBRTC OFFER RECEIVED
✅ Answer sent
✅ REMOTE TRACK RECEIVED
[User A's video shows]

Both: Video call working EXACTLY like Google Meet! ✅
```

---

## Support

If issues persist after deployment:

1. **Check Render logs** - Full error messages
2. **Open browser console** (F12) - Detailed debug logs (added in latest version)
3. **Verify database** - Check Firestore participant data
4. **Check CORS** - Render logs should show allowed origins
5. **Search logs** for:
   - `Socket.io Server Ready!` = Server started ✅
   - `join_session` = User joining
   - `session_joined` = User received response
   - `user_joined_session` = Broadcast to other user
   - `webrtc_offer_received` = WebRTC call initiating
   - `ERROR` = Something failed

---

Let me know once you've deployed and what errors/logs you see!
