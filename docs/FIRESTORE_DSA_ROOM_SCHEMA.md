# Firestore Database Schema for DSA Room
**Complete Firestore structure replacing PostgreSQL**

---

## 📦 Collections Overview

```
firestore/
├── users/
│   ├── {uid}/
│   │   ├── email: string
│   │   ├── username: string
│   │   ├── avatar_url: string
│   │   ├── bio: string
│   │   ├── skillLevel: string (beginner|intermediate|advanced)
│   │   ├── created_at: timestamp
│   │   ├── updated_at: timestamp
│   │   ├── last_login: timestamp
│
├── user_stats/
│   ├── {uid}/
│   │   ├── user_id: string
│   │   ├── total_rooms: number
│   │   ├── total_wins: number
│   │   ├── total_solved: number
│   │   ├── avg_points: number
│   │   ├── current_streak: number
│   │   ├── best_streak: number
│   │   ├── first_bloods: number
│   │   ├── favorite_language: string
│   │   ├── favorite_difficulty: string
│   │   ├── updated_at: timestamp
│
├── dsa_questions/
│   ├── {questionId}/
│   │   ├── title: string
│   │   ├── description: string
│   │   ├── difficulty: string (easy|medium|hard)
│   │   ├── category: string (arrays|linked-lists|trees|etc)
│   │   ├── examples: array [{input, output, explanation}]
│   │   ├── test_cases: array [{input, expected_output}]
│   │   ├── hidden_test_cases: array [{input, expected_output}]
│   │   ├── time_limit_mins: number
│   │   ├── created_by: string (uid)
│   │   ├── created_at: timestamp
│   │   ├── is_active: boolean
│
├── dsa_rooms/
│   ├── {roomId}/
│   │   ├── room_code: string (DSA-7X4K9)
│   │   ├── host_id: string (uid)
│   │   ├── question_id: string
│   │   ├── status: string (lobby|voting|active|review|closed)
│   │   ├── max_players: number
│   │   ├── created_at: timestamp
│   │   ├── started_at: timestamp (null until start)
│   │   ├── ended_at: timestamp (null until end)
│   │   ├── config: object {
│   │   │   ├── questionMode: string (same|different)
│   │   │   ├── timeLimit: number (1800|2700|3600 seconds)
│   │   │   ├── difficulty: string
│   │   │ }
│   │   ├── participants: array [uid1, uid2, ...]
│
├── room_users/
│   ├── {roomId}__{uid}/
│   │   ├── room_id: string
│   │   ├── user_id: string (uid)
│   │   ├── role: string (host|member)
│   │   ├── points: number
│   │   ├── solved_at: timestamp (null if not solved)
│   │   ├── language: string (javascript|python|java|cpp|c)
│   │   ├── status: string (coding|solved|attempted)
│   │   ├── joined_at: timestamp
│
├── submissions/
│   ├── {submissionId}/
│   │   ├── room_id: string
│   │   ├── user_id: string (uid)
│   │   ├── question_id: string
│   │   ├── code: string
│   │   ├── language: string
│   │   ├── submission_order: number (1st, 2nd, 3rd)
│   │   ├── test_results: object {
│   │   │   ├── passed: number
│   │   │   ├── failed: number
│   │   │   ├── total: number
│   │   │   ├── details: array [{status, message}]
│   │   │ }
│   │   ├── judge0_token: string (null if not submitted)
│   │   ├── judge0_status: string (In Queue|Processing|Accepted|etc)
│   │   ├── first_blood: boolean
│   │   ├── submitted_at: timestamp
│   │   ├── completed_at: timestamp (null until judged)
│   │   ├── execution_time_ms: number
│
├── room_votes/
│   ├── {roomId}__{uid}__{voteType}/
│   │   ├── room_id: string
│   │   ├── user_id: string (uid)
│   │   ├── vote_type: string (questionMode|timeLimit)
│   │   ├── vote_value: string (same|different|30|45|60)
│   │   ├── voted_at: timestamp
│
├── user_achievements/
│   ├── {achievementId}/
│   │   ├── user_id: string (uid)
│   │   ├── badge_name: string (first-blood-master|speedrunner|etc)
│   │   ├── earned_at: timestamp
│   │   ├── room_id: string (optional)
```

---

## 🔍 Composite Indexes (Required for Performance)

Create these in Firestore Console or via code:

### 1. Room Leaderboard
```
Collection: room_users
Fields: room_id (Asc) | points (Desc) | joined_at (Asc)
```

### 2. User Rankings
```
Collection: user_stats
Fields: total_wins (Desc) | updated_at (Desc)
```

### 3. Room Submissions
```
Collection: submissions
Fields: room_id (Asc) | submitted_at (Desc)
```

### 4. User Submissions
```
Collection: submissions
Fields: user_id (Asc) | completed_at (Asc)
```

### 5. Questions by Difficulty
```
Collection: dsa_questions
Fields: difficulty (Asc) | is_active (Asc) | created_at (Desc)
```

### 6. Room Status
```
Collection: dsa_rooms
Fields: status (Asc) | created_at (Desc)
```

---

## 📝 Data Migration (PostgreSQL → Firestore)

If migrating from PostgreSQL:

```javascript
// Copy this data using Node.js script
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Pool } = require('pg');

const serviceAccount = require('./firebase-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    // Migrate users
    const usersRes = await pool.query('SELECT * FROM users');
    for (const user of usersRes.rows) {
      await db.collection('users').doc(user.id).set({
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
        skillLevel: user.skillLevel,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: new Date(user.last_login),
      });
    }
    console.log('✅ Users migrated');

    // Migrate user_stats
    const statsRes = await pool.query('SELECT * FROM user_stats');
    for (const stat of statsRes.rows) {
      await db.collection('user_stats').doc(stat.user_id).set(stat);
    }
    console.log('✅ Stats migrated');

    // Continue for other collections...
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

migrate();
```

---

## 🔐 Firestore Security Rules (Combined)

**Merge these rules with your existing rules. Keep everything in the same `service cloud.firestore` block.**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================================
    // EXISTING COLLECTIONS (Keep as-is)
    // ========================================================
    
    // INTERNSHIPS
    match /internships/{internshipId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // APPLICATIONS
    match /applications/{applicationId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.token.admin == true);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // INTERVIEW BUDDY SESSIONS (CRITICAL - DO NOT REMOVE)
    match /interview_buddy_sessions/{sessionId} {
      allow create: if request.auth != null && 
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.mode in ['human', 'ai'];
      
      allow read: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.uid in resource.data.participants);
      
      allow update: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
      
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    // INTERVIEW BUDDY STATS
    match /user_interview_buddy_stats/{userId} {
      allow read: if request.auth != null && 
        request.auth.uid == userId;
      
      allow write: if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // ========================================================
    // NEW: DSA ROOM COLLECTIONS
    // ========================================================
    
    // DSA USERS - Users can only read/write their own profile
    match /users/{uid} {
      allow read: if true; // Public profile viewing
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    // DSA USER STATS - Everyone can read, users write their own
    match /user_stats/{uid} {
      allow read: if true; // Public leaderboards
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    // DSA QUESTIONS - Public read, admin write only
    match /dsa_questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // DSA ROOMS - Authenticated users read, host/creator can modify
    match /dsa_rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                      (resource.data.host_id == request.auth.uid || 
                       request.resource.data.host_id == request.auth.uid);
      allow delete: if request.auth != null && 
                      resource.data.host_id == request.auth.uid;
    }
    
    // ROOM USERS - Participants can read/update their own, users can join
    match /room_users/{doc} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null && 
                      resource.data.user_id == request.auth.uid;
    }
    
    // SUBMISSIONS - Users can submit, read own submissions
    match /submissions/{submissionId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.user_id || 
                      request.auth.token.admin == true);
      allow create: if request.auth != null && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null && 
                      request.auth.token.admin == true;
    }
    
    // ROOM VOTES - Users can vote in rooms they're in
    match /room_votes/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // USER ACHIEVEMENTS - Users read own, admin awards
    match /user_achievements/{achievementId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // ========================================================
    // SECURITY: DENY ALL OTHER COLLECTIONS
    // ========================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ✅ Advantages Over PostgreSQL

| Feature | Firestore | PostgreSQL |
|---------|-----------|-----------|
| **Setup** | No server needed | Requires server |
| **Auth Integration** | Native Firebase | Manual JWT |
| **Scaling** | Auto-scales | Manual scaling |
| **Real-time Updates** | Built-in listeners | Polling needed |
| **Cost** | Pay per operation | Fixed monthly |
| **Queries** | Simple, index-based | Complex SQL |

---

## 🚀 Setup Steps

1. Create collections in Firestore Console
2. Create composite indexes (or auto-create via first query)
3. Update security rules
4. Use helper functions in `lib/dsa-firestore-helpers.js`

Done! No database server needed. 🎯
