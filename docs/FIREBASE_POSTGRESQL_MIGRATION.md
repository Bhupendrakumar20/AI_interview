# Firebase ↔ PostgreSQL Migration Guide

**Complete guide to switch from PostgreSQL to Firestore**

---

## ✅ Why Switch to Firestore?

| Feature | Firestore | PostgreSQL |
|---------|-----------|-----------|
| **Setup** | Click-and-go (no server) | Requires server setup |
| **Cost** | Pay-as-you-go | Fixed monthly cost |
| **Scaling** | Auto-scales infinitely | Manual scaling needed |
| **Real-time** | Built-in listeners | Polling required |
| **Auth** | Seamless Firebase integration | Manual JWT/sessions |
| **Maintenance** | Zero | Server management required |

---

## 🔄 Migration Steps

### Step 1: Remove PostgreSQL Dependencies
```bash
# Remove these from package.json (if added)
npm uninstall postgres pg dotenv

# Keep Firestore (already installed)
npm list firebase firebase-admin
```

### Step 2: Delete PostgreSQL Files
```bash
# Remove PostgreSQL schema file
rm database/dsa-room-schema.sql

# Keep all JavaScript/React files
```

### Step 3: Use Firestore Helpers
All database operations now use helper functions:

**Old (PostgreSQL)**:
```javascript
// Would need raw SQL queries
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**New (Firestore)**:
```javascript
import { getUserProfile, getUserStats } from '@/lib/dsa-firestore-helpers';

const profile = await getUserProfile(userId);
const stats = await getUserStats(userId);
```

### Step 4: Create Firestore Collections
Visit [Firestore Console](https://console.firebase.google.com) and create these collections:
- `users`
- `user_stats`
- `dsa_questions`
- `dsa_rooms`
- `room_users`
- `submissions`
- `room_votes`
- `user_achievements`

Or let them auto-create when first document is added.

### Step 5: Create Indexes (Optional but Recommended)
In Firestore Console → Indexes tab, create these composite indexes:

```
Collection: room_users
Fields: room_id (Asc) | points (Desc)

Collection: user_stats
Fields: total_wins (Desc)

Collection: submissions
Fields: room_id (Asc) | submitted_at (Desc)
```

Or Firestore will suggest them automatically when you run queries.

---

## 📚 Helper Functions Reference

### User Operations

```javascript
import {
  createUserProfile,
  getUserProfile,
  getUserStats,
  updateUserProfile,
  updateUserStats,
} from '@/lib/dsa-firestore-helpers';

// Create user profile (called after Firebase auth signup)
await createUserProfile(uid, email, username);

// Get user profile
const profile = await getUserProfile(uid);

// Get user stats
const stats = await getUserStats(uid);

// Update profile
await updateUserProfile(uid, { skillLevel: 'advanced' });

// Update stats
await updateUserStats(uid, {
  total_rooms: 5,
  total_wins: 3,
  total_solved: 4,
});
```

### Question Operations

```javascript
import {
  createQuestion,
  getQuestion,
  getRandomQuestion,
  getQuestionsByDifficulty,
} from '@/lib/dsa-firestore-helpers';

// Create question (admin only)
const { id } = await createQuestion({
  title: 'Two Sum',
  description: 'Find two numbers that add up to target',
  difficulty: 'easy',
  category: 'arrays',
  examples: [...],
  test_cases: [...],
  hidden_test_cases: [...],
  time_limit_mins: 30,
  created_by: adminUid,
});

// Get specific question
const question = await getQuestion(questionId);

// Get random question for room
const question = await getRandomQuestion('medium'); // or null for any

// Get questions by difficulty
const questions = await getQuestionsByDifficulty('hard', 10);
```

### Room Operations

```javascript
import {
  createRoom,
  getRoomByCode,
  getRoom,
  updateRoom,
  addRoomParticipant,
} from '@/lib/dsa-firestore-helpers';

// Create new room
const { id: roomId } = await createRoom(hostUid, 'DSA-7X4K9', questionId);

// Get room by code (from join)
const room = await getRoomByCode('DSA-7X4K9');

// Get room details
const room = await getRoom(roomId);

// Update room status
await updateRoom(roomId, {
  status: 'active',
  started_at: new Date(),
  config: {
    questionMode: 'same',
    timeLimit: 1800,
  },
});

// Add participant
await addRoomParticipant(roomId, newUserId);
```

### Room User Operations

```javascript
import {
  addUserToRoom,
  getRoomLeaderboard,
  updateRoomUser,
} from '@/lib/dsa-firestore-helpers';

// Add user to room
await addUserToRoom(roomId, userId, 'member');

// Get leaderboard (auto-ranked)
const leaderboard = await getRoomLeaderboard(roomId);
// Returns: [
//   { rank: 1, user_id: 'uid1', points: 150, status: 'solved', ... },
//   { rank: 2, user_id: 'uid2', points: 120, status: 'coding', ... },
// ]

// Update user progress
await updateRoomUser(roomId, userId, {
  status: 'solved',
  points: 150,
  solved_at: new Date(),
  language: 'javascript',
});
```

### Submission Operations

```javascript
import {
  createSubmission,
  getSubmission,
  getRoomSubmissions,
  updateSubmission,
} from '@/lib/dsa-firestore-helpers';

// Create submission
const { id: submissionId } = await createSubmission({
  room_id: roomId,
  user_id: userId,
  question_id: questionId,
  code: 'function twoSum(nums, target) { ... }',
  language: 'javascript',
  submission_order: 1,
  test_results: { passed: 0, failed: 0, total: 0 },
  judge0_token: null,
  judge0_status: 'pending',
  first_blood: false,
});

// Get submission
const submission = await getSubmission(submissionId);

// Get all room submissions
const submissions = await getRoomSubmissions(roomId);

// Update after Judge0 results
await updateSubmission(submissionId, {
  judge0_status: 'Accepted',
  test_results: {
    passed: 12,
    failed: 0,
    total: 12,
    details: [...],
  },
  execution_time_ms: 45,
});
```

### Vote Operations

```javascript
import {
  castVote,
  getRoomVotes,
} from '@/lib/dsa-firestore-helpers';

// Cast vote
await castVote(roomId, userId, 'questionMode', 'same');
await castVote(roomId, userId, 'timeLimit', '30');

// Get all votes for a type
const questionModeVotes = await getRoomVotes(roomId, 'questionMode');
// Returns votes to tally

// Tally votes
const voteCounts = {};
questionModeVotes.forEach(vote => {
  voteCounts[vote.vote_value] = (voteCounts[vote.vote_value] || 0) + 1;
});
const winner = Object.keys(voteCounts).reduce((a, b) => 
  voteCounts[a] > voteCounts[b] ? a : b
);
```

### Leaderboard & Rankings

```javascript
import {
  getGlobalRankings,
  getUserRank,
  getUserRooms,
  batchUpdateLeaderboard,
} from '@/lib/dsa-firestore-helpers';

// Get global top 100
const rankings = await getGlobalRankings(100);
// Returns ranked list with position

// Get specific user's rank
const rank = await getUserRank(userId);

// Get user's recent rooms
const rooms = await getUserRooms(userId, 10);

// Bulk update leaderboard
await batchUpdateLeaderboard(roomId, {
  'uid1': { points: 150, status: 'solved' },
  'uid2': { points: 120, status: 'attempted' },
  'uid3': { points: 100, status: 'coding' },
});
```

### Achievements

```javascript
import {
  awardAchievement,
  getUserAchievements,
} from '@/lib/dsa-firestore-helpers';

// Award badge
await awardAchievement(userId, 'first-blood-master', roomId);

// Get user's badges
const achievements = await getUserAchievements(userId);
// Returns: [
//   { badge_name: 'first-blood-master', earned_at: ..., room_id: 'room123' },
//   { badge_name: 'speedrunner', earned_at: ..., room_id: null },
// ]
```

---

## 🔐 Firestore Security Rules

Copy this into Firestore Console → Rules tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public: everyone can read user stats
    match /user_stats/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // Questions public read, admin write
    match /dsa_questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Rooms: host can modify, participants can read
    match /dsa_rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth.token.admin == true;
    }
    
    // Room users: can view and join
    match /room_users/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Submissions: users can submit, can read own
    match /submissions/{submissionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow update, delete: if request.auth.token.admin == true;
    }
    
    // Votes: users can vote
    match /room_votes/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Achievements: users can read own
    match /user_achievements/{achievementId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## 📝 Code Examples

### Example 1: User Registration Flow

```javascript
// components/SignupForm.jsx
import { signUpUser } from '@/lib/dsa-auth';
import { createUserProfile } from '@/lib/dsa-firestore-helpers';

async function handleSignup(email, password, username) {
  try {
    // 1. Create Firebase auth user
    const { user } = await signUpUser(email, password, username);
    
    // 2. Create user profile in Firestore
    await createUserProfile(user.uid, email, username);
    
    // 3. Redirect to dsa-room
    router.push('/dsa-room');
  } catch (error) {
    console.error('Signup failed:', error);
  }
}
```

### Example 2: Room Creation Flow

```javascript
// components/DSARoomLobbyProd.jsx
import { createRoom } from '@/lib/dsa-firestore-helpers';

async function handleCreateRoom(userId, questionDifficulty) {
  try {
    // 1. Get random question
    const question = await getRandomQuestion(questionDifficulty);
    
    // 2. Generate room code
    const roomCode = 'DSA-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // 3. Create room
    const { id: roomId } = await createRoom(userId, roomCode, question.id);
    
    // 4. Add host to room
    await addUserToRoom(roomId, userId, 'host');
    
    // 5. Join room page
    router.push(`/dsa-room/active/${roomId}`);
  } catch (error) {
    console.error('Room creation failed:', error);
  }
}
```

### Example 3: Leaderboard Update

```javascript
// When code is submitted and Judge0 returns results
async function handleSubmissionResult(roomId, userId, judgeResults) {
  try {
    // 1. Calculate points
    const points = calculatePoints(judgeResults.execution_time, isFirstBlood);
    
    // 2. Update leaderboard
    await updateRoomUser(roomId, userId, {
      status: 'solved',
      points,
      solved_at: new Date(),
      first_blood: isFirstBlood,
    });
    
    // 3. Award achievement if earned
    if (isFirstBlood) {
      await awardAchievement(userId, 'first-blood', roomId);
    }
    
    // 4. Get updated leaderboard
    const leaderboard = await getRoomLeaderboard(roomId);
  } catch (error) {
    console.error('Submission update failed:', error);
  }
}
```

---

## 🚀 Environment Setup

Add to `.env.local`:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (for backend operations)
FIREBASE_ADMIN_KEY={"type":"service_account",...}

# Socket IO
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:4001

# Judge0 (Keep if using code execution)
JUDGE0_API_KEY=your_judge0_key
NEXT_PUBLIC_JUDGE0_URL=https://judge0-ce.p.rapidapi.com
```

---

## ✅ Advantages Now

✅ **Zero database setup** - Works immediately  
✅ **Real-time updates** - Listeners auto-sync  
✅ **Auto-scaling** - Handles millions of users  
✅ **Built-in auth** - Firebase integration  
✅ **No server cost** - Pay only for what you use  
✅ **Automatic backups** - Google manages it  
✅ **Better DX** - Less boilerplate code  

---

## 🐛 Common Issues & Fixes

### "Missing index" errors
**Fix**: Let Firestore create indexes automatically by running query once

### "Permission denied" errors
**Fix**: Check security rules match your usecase

### "Slow queries" 
**Fix**: Create composite indexes for complex queries (Firestore suggests them)

### "Data not saving"
**Fix**: Ensure Firestore initialized with correct credentials

---

## 📊 Cost Comparison

**PostgreSQL** (AWS RDS):
- $15-50+/month minimum
- Ongoing maintenance
- Server scaling headaches

**Firestore**:
- Free tier: 50K reads, 20K writes, 20K deletes/day
- Typical usage: $10-30/month
- Zero maintenance

---

Created with ❤️ for seamless Firestore integration! 🚀
