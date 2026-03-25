# 🚀 Deploy DSA Socket Server to Railway

## The Problem
Your DSA room feature requires a WebSocket server on port 3001, but Vercel doesn't support WebSocket directly (stateless functions). 

## Solution: Deploy to Railway (Free)

Railway is a cloud platform that supports Node.js WebSocket servers perfectly.

### Step 1: Deploy Socket Server to Railway

1. **Sign up** at [railway.app](https://railway.app)
2. **Create a new project**
3. **Connect your GitHub** (or upload the code)
4. **Create `Procfile`** in your project root:
   ```
   web: node server/dsa-socket-server-prod.js
   ```

5. **Add Environment Variables** in Railway dashboard:
   ```
   PORT=3001
   JUDGE0_API_KEY=your_key_here
   JUDGE0_URL=https://judge0-ce.p.rapidapi.com
   NODE_ENV=production
   ```

6. **Deploy** - Railway will automatically start the server

### Step 2: Get Your Socket Server URL

After deployment, Railway will give you a URL like:
```
https://your-project-abc123.railway.app
```

### Step 3: Update Vercel Environment

In your **Vercel project settings**, add:
```
NEXT_PUBLIC_SOCKET_IO_URL=https://your-project-abc123.railway.app
```

### Step 4: Update `.env.local` for Local Development

```env
# Local development
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:3001

# For production testing
# NEXT_PUBLIC_SOCKET_IO_URL=https://your-project-abc123.railway.app
```

### Step 5: Test Locally

**Terminal 1** - Start the socket server:
```bash
node server/dsa-socket-server-prod.js
```

**Terminal 2** - Start Next.js dev server:
```bash
npm run dev
```

**Browser** - Check console for:
```
✓ [DSA Room] Connected to socket server
```

---

## 🎯 Quick Checklist

- [ ] Create Railway account
- [ ] Deploy socket server to Railway
- [ ] Get the Railway URL
- [ ] Add `NEXT_PUBLIC_SOCKET_IO_URL` to Vercel
- [ ] Add `NEXT_PUBLIC_SOCKET_IO_URL` to `.env.local`
- [ ] Test: Create a room and join with another user
- [ ] Verify pending requests show up immediately
- [ ] Test approve/reject functionality

---

## 🔧 Troubleshooting

### WebSocket Still Failing?

**Check 1**: Is `NEXT_PUBLIC_SOCKET_IO_URL` set?
```bash
echo $NEXT_PUBLIC_SOCKET_IO_URL
```

**Check 2**: Is the socket server running?
```
curl https://your-railway-url/socket.io/?EIO=4&transport=polling
```
Should return: `ok`

**Check 3**: Are the ports correct?
- Railway: port `3001`
- Vercel: uses your domain (no port)

### Port Issues?

If port 3001 is taken locally:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in Procfile/server code
```

### CORS Issues?

The socket server has CORS enabled for all origins in development. For production:
```javascript
io.engine.on('headers', (headers, req) => {
  headers['Cross-Origin-Embedder-Policy'] = 'credentialless';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
});
```

---

## 📊 Expected Network Flow

```
┌─────────────────┐
│  User Browser   │
│   (Vercel App)  │
└────────┬────────┘
         │ WebSocket
         │ (Socket.io)
         ▼
┌─────────────────┐
│  Railway.app    │
│  Socket Server  │
│  (Node.js)      │
└─────────────────┘
         │
         ▼
    Firebase DB
    (Real-time)
```

---

## 💡 Alternative Options

If Railway doesn't work for you:

1. **Heroku** (better free tier ending):
   - Procfile: `web: node server/dsa-socket-server-prod.js`
   - Heroku URL: `https://your-app.herokuapp.com`

2. **AWS Lambda + API Gateway**:
   - Enable WebSocket support
   - Point to Lambda socket handler

3. **Self-hosted**:
   - Digital Ocean, AWS EC2, or similar
   - VPS with Node.js pre-installed

---

## ✅ Success Indicators

Once set up correctly:
- ✓ No WebSocket connection errors
- ✓ Pending requests show instantly
- ✓ Approve/reject buttons work
- ✓ Real-time updates work
- ✓ Leaderboard updates live
- ✓ Email notifications send

---

**Need Help?** Check console logs:
```javascript
// In Browser DevTools Console
socket.on('connect', () => console.log('✓ Connected'))
socket.on('disconnect', () => console.log('✗ Disconnected'))
```
