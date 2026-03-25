# Socket Server Vercel Deployment - Step by Step

## Option A: Deploy to Vercel (Recommended for your setup)

### TL;DR - 3 Commands

```bash
# 1. Create repo folder
mkdir ai-interview-socket && cd ai-interview-socket

# 2. Initialize with these files (see section below)
# Then:

# 3. Deploy
git init && git add . && git commit -m "init" && git push
# Then go to vercel.com and import the repo
```

### Detailed Setup

#### Step 1: Create Repo Structure

Create a new folder anywhere ON YOUR COMPUTER:
```
ai-interview-socket-server/
├── index.js
├── package.json
├── vercel.json
└── .gitignore
```

#### Step 2: Add `package.json`

```json
{
  "name": "ai-interview-socket-server",
  "version": "1.0.0",
  "description": "Socket.io server for DSA interviews",
  "main": "index.js",
  "engines": {
    "node": "18.x"
  },
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "cors": "^2.8.5"
  },
  "keywords": ["socket", "realtime", "dsa"],
  "author": "",
  "license": "MIT"
}
```

#### Step 3: Add `vercel.json`

```json
{
  "buildCommand": "npm install",
  "devCommand": "node index.js",
  "outputDirectory": "."
}
```

#### Step 4: Add `.gitignore`

```
node_modules/
.env
.env.local
.DS_Store
*.log
```

#### Step 5: Copy `index.js`

From your main project, get content from `server/dsa-socket-vercel.js` and save as `index.js` in new folder.

Or use this complete version:

```javascript
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = http.createServer(app);

// CORS configuration for Vercel
const allowedOrigins = [
  'https://ai-interview-abc.vercel.app',  // Replace with YOUR main app domain
  'http://localhost:3000',
  'http://localhost:3001',
];

const io = socketIO(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const rooms = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'Socket server is running', rooms: rooms.size });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_room', (data) => {
    const { roomCode, creatorId, creatorName } = data;

    rooms.set(roomCode, {
      code: roomCode,
      creator: creatorId,
      creatorName: creatorName,
      members: [creatorId],
      pendingRequests: [],
      createdAt: new Date(),
    });

    socket.join(roomCode);
    socket.emit('room_created', { roomCode, success: true });
    console.log(`Room created: ${roomCode}`);
  });

  socket.on('request_join_room', (data) => {
    const { roomCode, userId, userName } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('join_response', {
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Check if already member
    if (room.members.includes(userId)) {
      socket.emit('join_response', {
        success: true,
        message: 'Already a member',
      });
      return;
    }

    // Check if already requested
    const alreadyRequested = room.pendingRequests.some(
      (r) => r.userId === userId
    );
    if (alreadyRequested) {
      socket.emit('join_response', {
        success: false,
        message: 'Already requested',
      });
      return;
    }

    // Add to pending requests
    room.pendingRequests.push({
      userId,
      userName,
      requestedAt: new Date(),
    });

    socket.emit('join_response', {
      success: true,
      message: 'Request sent',
    });

    // Notify room creator
    io.to(roomCode).emit('member_request', {
      userId,
      userName,
      pendingCount: room.pendingRequests.length,
      requests: room.pendingRequests,
    });

    console.log(`Join request: ${userName} → ${roomCode}`);
  });

  socket.on('approve_member', (data) => {
    const { roomCode, userId } = data;
    const room = rooms.get(roomCode);

    if (!room) return;

    // Remove from pending
    room.pendingRequests = room.pendingRequests.filter(
      (r) => r.userId !== userId
    );

    // Add to members
    if (!room.members.includes(userId)) {
      room.members.push(userId);
    }

    // Notify all
    io.to(roomCode).emit('join_approved', {
      userId,
      members: room.members,
      pendingRequests: room.pendingRequests,
    });

    socket.emit('member_joined', {
      roomCode,
      userId,
      members: room.members,
    });

    console.log(`Approved: ${userId} in ${roomCode}`);
  });

  socket.on('reject_member', (data) => {
    const { roomCode, userId } = data;
    const room = rooms.get(roomCode);

    if (!room) return;

    // Remove from pending
    room.pendingRequests = room.pendingRequests.filter(
      (r) => r.userId !== userId
    );

    // Notify all
    io.to(roomCode).emit('join_rejected', {
      userId,
      pendingRequests: room.pendingRequests,
    });

    console.log(`Rejected: ${userId} in ${roomCode}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

---

## Deployment Steps

### Step 1: Push to GitHub

```bash
cd ai-interview-socket-server
git init
git add .
git commit -m "Initial socket server"
git remote add origin https://github.com/YOUR_USERNAME/ai-interview-socket-server.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to **https://vercel.com/dashboard**
2. Click **Add New** → **Project**
3. **Import Git Repository** → Select `ai-interview-socket-server`
4. **Configure Project:**
   - Framework Preset: `Other`
   - Build Command: `npm install`
   - Output Directory: `.`
5. **Environment Variables:**
   - Add key: `NODE_ENV`
   - Value: `production`
6. Click **Deploy**

### Step 3: Get Your Socket URL

After successful deployment, Vercel shows:
```
https://ai-interview-socket-server.vercel.app
```

Copy this URL!

---

## Step 4: Update Main App

In your **AI_Interview** Vercel project:

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   Key: NEXT_PUBLIC_SOCKET_IO_URL
   Value: https://ai-interview-socket-server.vercel.app
   ```
3. Go to **Deployments** → Click latest
4. Click **...** → **Redeploy** (to use new env var)

Or push a new commit to redeploy automatically.

---

## Verify It Works

### Local Testing First (Optional)

Before deploying, test locally:

```bash
# Terminal 1: Socket server
cd ai-interview-socket-server
npm install
npm start

# Terminal 2: Main app
cd ../AI_interview
npm run dev
```

Visit `http://localhost:3000`, create DSA room, check console for **no errors**.

### Production Testing

After deployment:

1. Visit your production URL
2. Open **DevTools** (F12)
3. Go to **Console** tab
4. Navigate to DSA Room → Create Room
5. **Expected:** 
   - No red errors
   - See `Socket connected ✓` (or similar)
6. Open **Network** tab
7. Look for requests to your socket server domain
8. Should see successful responses ✓

---

## ✅ Complete Checklist

- [ ] Created new GitHub repo for socket server
- [ ] Added `package.json`, `vercel.json`, `index.js`, `.gitignore`
- [ ] Pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Copied socket server URL from Vercel
- [ ] Added `NEXT_PUBLIC_SOCKET_IO_URL` env var to main app
- [ ] Redeployed main app
- [ ] Tested in production (no WebSocket errors)
- [ ] Verified room features work (create, join, approve)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect" | Check env var is set in Vercel |
| "CORS error" | Update `allowedOrigins` in `index.js` with your domain |
| "WebSocket failed" | Normal - uses polling fallback. Check Network tab. |
| "Room code not found" | Restart socket server (redeploy on Vercel) |
| "Requests stuck pending" | Hard refresh main app (Ctrl+Shift+R) |

---

## Need Help?

Check your browser console (F12) for specific error messages. Share the error and I'll help fix it!
