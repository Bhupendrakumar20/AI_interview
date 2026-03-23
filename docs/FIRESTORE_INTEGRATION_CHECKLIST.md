# DSA Room + Firestore Integration Checklist

**Quick guide to wire everything up with Firestore (no PostgreSQL needed)**

---

## 🎯 What You Have Now

✅ `DSARoomLobbyProd.jsx` - Room creation/joining UI  
✅ `DSALiveRoom.jsx` - Live coding editor & leaderboard  
✅ `CodeReviewPanel.jsx` - Code review & comparison  
✅ `DSAStatsDashboard.jsx` - User stats & rankings  
✅ `DSAAdminPanel.jsx` - Admin controls  
✅ `dsa-firestore-helpers.js` - All database functions  
✅ `dsa-auth.js` - User authentication  
✅ `dsa-security.js` - Input validation & rate limiting  

---

## 🔌 Integration Points

### 1. **User Registration** → Firestore Profile

**Component**: `lib/dsa-auth.js`

```javascript
// In signUpUser() - already integrated ✅
await createUserProfile(user.uid, email, username);
```

### 2. **Room Creation** → Firestore Room

**Component**: `components/DSARoomLobbyProd.jsx`

**Add to create room handler**:
```javascript
import { createRoom, addUserToRoom } from '@/lib/dsa-firestore-helpers';

async function handleCreateRoom() {
  try {
    // Get random question
    const question = await getRandomQuestion();
    
    // Generate code
    const roomCode = 'DSA-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Create room in Firestore ⬅️ ADD THIS
    const { id: roomId } = await createRoom(
      currentUser.uid,
      roomCode,
      question.id
    );
    
    // Add host to room ⬅️ ADD THIS
    await addUserToRoom(roomId, currentUser.uid, 'host');
    
    // Continue with socket emit...
  }
}
```

### 3. **Room Joining** → Firestore Participant

**Component**: `components/DSARoomLobbyProd.jsx`

**Add to join room handler**:
```javascript
import { getRoomByCode, addUserToRoom } from '@/lib/dsa-firestore-helpers';

async function handleJoinRoom(roomCode) {
  try {
    // Get room by code ⬅️ ADD THIS
    const room = await getRoomByCode(roomCode);
    
    if (!room) {
      alert('Room not found');
      return;
    }
    
    // Add user to room ⬅️ ADD THIS
    await addUserToRoom(room.id, currentUser.uid, 'member');
    
    // Continue with socket operations...
  }
}
```

### 4. **Voting** → Firestore Votes

**Component**: `components/DSARoomLobbyProd.jsx`

**Add to vote handler**:
```javascript
import { castVote } from '@/lib/dsa-firestore-helpers';

async function handleVote(roomId, voteType, value) {
  try {
    // Save vote in Firestore ⬅️ ADD THIS
    await castVote(roomId, currentUser.uid, voteType, value);
    
    // Also emit to socket (for real-time updates)
    socket.emit('cast_vote', { roomId, voteType, value });
  }
}
```

### 5. **Code Submission** → Firestore Submission

**Component**: `components/DSALiveRoom.jsx`

**Add to submit handler**:
```javascript
import { createSubmission, updateSubmission } from '@/lib/dsa-firestore-helpers';

async function handleCodeSubmit(code, language) {
  try {
    // Create submission in Firestore ⬅️ ADD THIS
    const { id: submissionId } = await createSubmission({
      room_id: roomId,
      user_id: currentUser.uid,
      question_id: question.id,
      code,
      language,
      submission_order: submissionCount + 1,
      test_results: { passed: 0, failed: 0, total: 0 },
      judge0_token: null,
      judge0_status: 'pending',
      first_blood: false,
    });
    
    // Judge0 execution...
    const results = await judgeCode(code, language);
    
    // Update submission with results ⬅️ ADD THIS
    await updateSubmission(submissionId, {
      judge0_status: results.status,
      test_results: results.test_results,
      execution_time_ms: results.time,
    });
  }
}
```

### 6. **Leaderboard Updates** → Firestore Room Users

**Component**: `components/DSALiveRoom.jsx`

**Real-time listener**:
```javascript
import { getRoomLeaderboard } from '@/lib/dsa-firestore-helpers';

useEffect(() => {
  // Fetch leaderboard on mount
  const fetchLeaderboard = async () => {
    const lb = await getRoomLeaderboard(roomId);
    setLeaderboard(lb);
  };
  
  // Update when socket events arrive
  socket.on('leaderboard_update', (data) => {
    // Update Firestore ⬅️ ADD THIS
    updateRoomUser(roomId, data.userId, {
      points: data.points,
      status: data.status,
      solved_at: data.solvedAt,
    });
    
    // Refresh leaderboard
    fetchLeaderboard();
  });
}, [roomId]);
```

### 7. **Stats Dashboard** → Firestore Stats

**Component**: `components/DSAStatsDashboard.jsx`

**Already integrated** ✅
- Fetches from `user_stats` collection
- Shows global rankings from Firestore
- Displays achievements from Firestore

### 8. **Admin Panel** → Firestore Management

**Component**: `components/DSAAdminPanel.jsx`

**Already integrated** ✅
- Manages `dsa_questions` collection
- Views `dsa_rooms` collection
- Edits `users` collection

---

## 📋 Setup Checklist

### Phase 1: Firestore Setup
- [ ] Visit [Firebase Console](https://console.firebase.google.com)
- [ ] Go to Firestore Database
- [ ] Create database in production mode
- [ ] Collections auto-create or manually create:
  - [ ] `users`
  - [ ] `user_stats`
  - [ ] `dsa_questions`
  - [ ] `dsa_rooms`
  - [ ] `room_users`
  - [ ] `submissions`
  - [ ] `room_votes`
  - [ ] `user_achievements`

### Phase 2: Security Rules
- [ ] Copy rules from `FIRESTORE_DSA_ROOM_SCHEMA.md`
- [ ] Paste into Firestore Console → Rules tab
- [ ] Click Publish

### Phase 3: Environment Variables
- [ ] Add to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_ADMIN_KEY={"type":"service_account",...}
```

### Phase 4: Code Integration
- [ ] Update `DSARoomLobbyProd.jsx` - Add create/join room handlers
- [ ] Update `DSALiveRoom.jsx` - Add submission handlers
- [ ] Update `DSARoomLobbyProd.jsx` - Add vote handlers
- [ ] Test user profile creation
- [ ] Test room creation & joining
- [ ] Test submissions & leaderboard
- [ ] Test stats dashboard

### Phase 5: Verification
- [ ] Signup user → profile created in Firestore
- [ ] Create room → room doc created in Firestore
- [ ] Join room → added to participants array
- [ ] Cast vote → vote doc created in Firestore
- [ ] Submit code → submission doc created
- [ ] View stats → pulls from Firestore stats
- [ ] Admin panel → lists all collections

---

## 🧪 Testing Queries

Open Firestore Console and test these queries:

```
users collection → Should have your user doc
user_stats collection → Should have stats for each user
dsa_questions collection → Should have 1+ questions
dsa_rooms collection → Should have created rooms
room_users collection → Should have participants
submissions collection → Should have code submissions
```

---

## 🔗 Key Files to Update

| File | What to Add | Status |
|------|----------|--------|
| `DSARoomLobbyProd.jsx` | Create/join handlers | ⏳ TODO |
| `DSALiveRoom.jsx` | Submission handlers | ⏳ TODO |
| `DSARoomLobbyProd.jsx` | Vote handlers | ⏳ TODO |
| `DSAStatsDashboard.jsx` | Already done | ✅ DONE |
| `DSAAdminPanel.jsx` | Already done | ✅ DONE |
| `.env.local` | Firebase credentials | ⏳ TODO |

---

## 💡 Pro Tip: Real-time Listeners

For live updates, use Firestore listeners instead of polling:

```javascript
import { onSnapshot, query, where } from 'firebase/firestore';

// Listen to room leaderboard in real-time
useEffect(() => {
  const q = query(
    collection(db, 'room_users'),
    where('room_id', '==', roomId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data());
    setLeaderboard(users.sort((a, b) => b.points - a.points));
  });

  return unsubscribe; // Cleanup listener
}, [roomId]);
```

---

## 🚀 After Everything Works

1. **Remove PostgreSQL files**
   ```bash
   rm database/dsa-room-schema.sql
   rm -rf database/
   ```

2. **Remove unused packages**
   ```bash
   npm uninstall postgres pg dotenv
   ```

3. **Deploy to production**
   - Firestore handles all scaling
   - Security rules protect your data
   - No database server needed

---

## 📞 Troubleshooting

**Q: "Collection not found" error**  
A: Create collection in Firestore console or let first write auto-create it

**Q: "Permission denied" error**  
A: Check security rules - user must be authenticated for most operations

**Q: Data not appearing**  
A: Check console logs for errors, ensure Firestore initialized

**Q: Slow queries**  
A: Create indexes as suggested by Firestore or manually in Console

---

Now you're ready to go! 🎉

Next step: Update the components above, test locally, then deploy! 🚀
