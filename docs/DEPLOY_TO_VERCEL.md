# 🚀 Deploy DSA Socket Server to Vercel

## Quick Start (5 Minutes)

### Step 1: Create Separate GitHub Repo for Socket Server

```bash
# Create new folder for socket server
mkdir ai-interview-socket-server
cd ai-interview-socket-server

# Initialize git
git init
git remote add origin https://github.com/YOUR_USERNAME/ai-interview-socket-server.git
```

### Step 2: Copy Socket Server Files

```bash
# Copy the socket server file
cp ../ai-interview/server/dsa-socket-vercel.js ./index.js

# Create package.json
```

Create `package.json`:
```json
{
  "name": "ai-interview-socket-server",
  "version": "1.0.0",
  "description": "Socket.io server for DSA room",
  "main": "index.js",
  "scripts": {
    "dev": "node index.js",
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "socket.io": "^4.6.1"
  }
}
```

### Step 3: Create `vercel.json`

```json
{
  "buildCommand": "npm install",
  "devCommand": "npm run dev",
  "outputDirectory": ".",
  "installCommand": "npm install"
}
```

### Step 4: Push to GitHub

```bash
git add .
git commit -m "Initial socket server setup"
git push -u origin main
```

### Step 5: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Select your `ai-interview-socket-server` repo
4. **Project Name:** `ai-interview-socket-server`
5. **Framework Preset:** Other
6. **Root Directory:** `.` (leave as is)
7. **Environment Variables:**
   ```
   JUDGE0_API_KEY = your_key_here
   NODE_ENV = production
   ```
8. Click "Deploy"

### Step 6: Get Your Socket URL

After deployment, Vercel shows:
```
https://ai-interview-socket-server.vercel.app
```

### Step 7: Update Main App (Vercel)

In your main **AI_Interview** Vercel project:

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_SOCKET_IO_URL = https://ai-interview-socket-server.vercel.app
   ```
3. **Redeploy** your main app (push new commit or use Vercel UI)

---

## ✅ That's It!

Your DSA room will now:
- ✓ Connect via HTTP polling (Vercel compatible)
- ✓ Send/receive join requests in real-time
- ✓ Show pending approvals instantly
- ✓ Work on production!

---

## 🧪 Testing

After deployment:

1. Go to your production URL (e.g., `https://ai-interview-abc.vercel.app`)
2. Navigate to DSA Room
3. Create a room
4. Open second browser tab with the room code
5. **Check console** (F12) - should NOT see WebSocket errors
6. Should see: `Socket connected ✓`

---

## 🔧 Troubleshooting

### "Cannot connect to socket server"
- [ ] Check `NEXT_PUBLIC_SOCKET_IO_URL` is set in Vercel
- [ ] Make sure socket server deployment finished
- [ ] Check Vercel dashboard → Deployments → Socket server

### "CORS error"
- [ ] The code already handles CORS
- [ ] Make sure ports are correct
- [ ] Check environment variables are set

### "Room requests not showing"
- [ ] Clear browser cache (Ctrl+Shift+Del)
- [ ] Check Network tab in DevTools
- [ ] Verify socket server is running (curl the URL)

---

## 📋 Checklist

- [ ] Created GitHub repo for socket server
- [ ] Added `index.js`, `package.json`, `vercel.json`
- [ ] Pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Got socket URL from Vercel
- [ ] Added `NEXT_PUBLIC_SOCKET_IO_URL` to main app
- [ ] Redeployed main app
- [ ] Tested with two browser tabs
- [ ] Verified no WebSocket errors

---

## 🎯 File Structure

```
ai-interview-socket-server/
├── index.js              (socket server code)
├── package.json          (dependencies)
├── vercel.json          (vercel config)
└── .gitignore           (node_modules)
```

---

**Done! Your DSA room feature is now fully deployed! 🎉**
