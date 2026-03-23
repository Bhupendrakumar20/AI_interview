# DSA Room - Complete System Architecture

## Overview
A real-time, multiplayer competitive coding platform with WebSocket-based synchronization, allowing up to 10 users to solve DSA problems concurrently with live leaderboards and gamification.

---

## 1. System Architecture

### WebSocket Event Flow

```
CLIENT                          SOCKET.IO SERVER                    DATABASE
├─ room_join
│  ├─ userId, code, username    └─> VALIDATE & ADD PARTICIPANT
│                                   ├─ Emit: room_state_init (room config, users)
│                                   └─ Broadcast: user_joined (new participant)
│
├─ vote_time_limit
│  └─ userId, vote (30/45/60)   └─> AGGREGATE VOTES
│                                   └─ If unanimous: Emit: timer_started
│
├─ vote_question_mode
│  └─ userId, mode (same/different) └─> AGGREGATE VOTES
│                                       └─ Load appropriate questions
│
├─ code_submit
│  ├─ userId, code, language    └─> SEND TO JUDGE0
│                                   ├─ Compile & test
│                                   ├─ Update submission (pass/fail)
│                                   ├─ Update leaderboard
│                                   └─ Broadcast: submission_result (with points)
│
├─ code_update (non-blocking)
│  └─ userId, code (snapshot)   └─> BROADCAST to room_viewers (observers)
│
├─ request_code_review
│  └─ targetUserId             └─> SHARE SUBMITTED CODE
│                                   └─ Load from submissions
│
└─ room_leave
   └─ userId                    └─> REMOVE PARTICIPANT
                                   └─ Broadcast: user_left
```

### Real-Time Components

| Component | Responsibility | Technology |
|-----------|-----------------|-----------|
| Timer Sync | Countdown from server time, resilient to drift | Socket.io + server timestamp |
| Leaderboard | Updates on successful submission | Socket.io broadcast |
| Code Editor | Live syntax highlighting, submit trigger | Monaco Editor |
| Judge0 Integration | Compilation & test execution | REST API + polling |
| Code Review | Share solutions after completion | Firestore query |

---

## 2. Database Schema (Firestore)

### Collection: `dsa_rooms`
```javascript
{
  roomId: "DSA-ABC123",
  roomCode: "9X2K5",                      // Unique 5-char code
  status: "lobby|voting|in-progress|completed",
  createdBy: "userId",
  createdAt: Timestamp,
  startedAt: Timestamp,
  endedAt: Timestamp,
  
  // Configuration
  maxParticipants: 10,
  questionMode: "same|different",         // Set by vote
  timeLimit: 30 | 45 | 60,               // minutes, set by vote
  questionIds: ["q1", "q2", ...],        // Set before room starts
  
  // Voting state
  timeVotes: { "30": 3, "45": 2, "60": 5 },
  questionModeVotes: { "same": 4, "different": 6 },
  
  // Participants
  participants: ["userId1", "userId2", ...], // Array of user IDs
  participantCount: 10,
  
  // Game state
  serverStartTime: Timestamp,            // Synchronized clock for timer
  serverCurrentTime: Timestamp,          // Updated every second
  
  // Results
  finalRanking: [
    {
      rank: 1,
      userId: "user1",
      username: "Alice",
      points: 450,
      submissionsCount: 3,
      totalTime: 25,
      questionsCorrect: 3,
      // ... more stats
    },
    // ... other rankings
  ]
}
```

### Collection: `dsa_room_participants`
```javascript
{
  participantId: "auto-generated",
  roomId: "DSA-ABC123",
  userId: "userId",
  username: "AliceCode",
  joinedAt: Timestamp,
  
  // Current state
  status: "active|idle|disconnected|left",
  currentQuestion: "q1",                 // For same-mode, all same
  
  // Scoring
  points: 450,
  submissionsCount: 3,
  correctSubmissions: [
    { questionId: "q1", timestamp: Timestamp, timeMs: 245000 }
  ],
  
  // Speed bonus
  firstBloodQuestions: ["q1"],           // First to solve
  
  // Progress
  lastCodeUpdate: Timestamp,
  isCodeVisible: false                   // For code review phase
}
```

### Collection: `dsa_room_submissions`
```javascript
{
  submissionId: "auto-generated",
  roomId: "DSA-ABC123",
  userId: "userId",
  questionId: "q1",
  
  // Code & Language
  code: "def solve():\n  pass",
  language: "python|javascript|cpp|java",
  
  // Execution
  status: "pending|compiling|compiled|executing|completed",
  judge0SubmissionId: "123456",
  executionTime: 45,                     // ms
  memoryUsed: 5242880,                   // bytes
  
  // Results
  testResults: {
    totalTests: 5,
    passed: 3,
    failed: 2,
    failedTests: [
      { input: "x = 5", expected: "5", actual: "0" }
    ]
  },
  
  // Timing
  submittedAt: Timestamp,
  timeFromStart: 125000,                 // ms from room start
  attemptNumber: 1
}
```

### Collection: `dsa_questions`
```javascript
{
  questionId: "q1",
  title: "Two Sum",
  difficulty: "easy|medium|hard",
  source: "LeetCode|BlindFiftyFive|HundredDaysOfCode",
  
  // Problem
  description: "Given an array of integers...",
  examples: [
    { input: "[2,7,11,15], target=9", output: "[0,1]" }
  ],
  constraints: "2 <= nums.length <= 10^4",
  
  // Testing
  testCases: [
    { input: "2 7 11 15\n9", expected: "0 1", visible: true },
    { input: "3 2 4\n6", expected: "1 2", visible: true },
    { input: "..." hidden: true }  // Hidden test cases
  ],
  
  // Metadata
  topics: ["array", "hash-table"],
  timeLimit: 30,                         // seconds per submission
  memoryLimit: 256                       // MB
}
```

---

## 3. Tech Stack Strategy

### Timer Synchronization (Anti-Drift)

**Problem**: Network latency + client clock skew → timer drift

**Solution: Server-Driven Timer**

```javascript
// Server sends authoritative time every second
const serverTime = Date.now();
io.to(roomId).emit('timer_tick', {
  serverTime,        // Timestamp from server
  timeRemaining: timeLimit * 60 * 1000 - (serverTime - roomStart),
  serverLatency: 0   // Allow client drift correction
});

// Client recalculates locally
const clientTime = Date.now();
const drift = clientTime - serverTime;
const correctedTimeRemaining = timeRemaining - drift;
```

**Benefits**:
- Server is source of truth
- Client syncs every tick (1 second)
- Cheating via local clock manipulation detected server-side

### Anti-Cheat Measures

| Layer | Measure |
|-------|---------|
| **Client** | Timer locked to server (can't modify) |
| **Network** | Submit timestamp verified by server |
| **Server** | Multiple validation checks |
| **Judge0** | Code execution sandboxed |

**Submission Validation**:
```javascript
const isValid = {
  isBeforeDeadline: submissionTime <= roomStartTime + timeLimit,
  isBeforeAcceptedTime: submissionTime <= roomEndTime,
  userWasParticipant: participants.includes(userId),
  noMultipleSubmitsSameQuestion: !alreadyPassed.includes(questionId),
  codeNotSuspiciouslySimilar: plagiarismCheck(code)  // Optional
};
```

### Performance Optimization

| Strategy | Implementation |
|----------|-----------------|
| **Broadcasting** | Only broadcast leaderboard on changes (not every edit) |
| **Debouncing** | Code updates debounced 2sec before broadcast |
| **Caching** | Questions cached in Redis (TTL: 24h) |
| **Connection Pooling** | Redis for session storage, not individual objects |
| **Judge0 Async** | Queue submissions, don't block UI |

---

## 4. Socket.io Event Specification

### Server → Client Events

```javascript
// Initial room state
'room_state_init', {
  roomId, roomCode, maxParticipants,
  participants: [{ userId, username, points, status }],
  questionMode, timeLimit,
  questions: [{ questionId, title, difficulty }]
}

// Room updates
'user_joined', { userId, username }
'user_left', { userId }
'participant_status_update', { userId, status }

// Game phase
'voting_started', { phase: 'time_limit|question_mode' }
'voting_ended', { phase, decision }  // e.g., { phase: 'time_limit', decision: 45 }
'game_started', { serverStartTime, timeLimit }

// Timer sync
'timer_tick', { serverTime, timeRemaining, secondsSinceStart }

// Leaderboard
'leaderboard_update', [
  { rank: 1, userId, username, points, questionsCorrect, firstBloodCount }
]
'submission_result', {
  userId, questionId, status: 'passed|failed',
  points, timestamp, totalCorrect
}

// Code review
'code_review_enabled'
'user_code_revealed', { userId, username, questionId, code }

// Match end
'game_ended', { finalRanking, stats }
```

### Client → Server Events

```javascript
'room_join', { userId, username, roomCode }
'vote_time_limit', { vote: 30|45|60 }
'vote_question_mode', { vote: 'same'|'different' }
'code_submit', { questionId, code, language }
'code_update', { questionId, code }  // Non-blocking snapshot
'request_code_review', { targetUserId, questionId }
'disconnect'  // Built-in Socket.io event
```

---

## 5. Judge0 Integration

### Submission Flow

```
User clicks "Submit Code"
    ↓
Client sends: code_submit event
    ↓
Server validates (timestamp, user, question)
    ↓
Save submission to Firestore (status: pending)
    ↓
Send to Judge0 API (async)
    ↓
Judge0 polls compilation + execution
    ↓
Parse results → check against test cases
    ↓
If all passed:
  - Award points (base + speed bonus + first blood)
  - Update leaderboard
  - Broadcast to room
    ↓
Emit: submission_result → client
```

### Judge0 API Payload

```javascript
{
  sourceCode: base64(userCode),
  languageId: 71,  // Python 3.8 or JavaScript, etc.
  stdin: testCaseInput,
  expectedOutput: testCaseOutput,
  timeLimit: 2000,  // ms
  memoryLimit: 256000,  // KB
  cpuTimeLimit: 5  // seconds
}
```

---

## 6. Scoring System

```javascript
basePoints = 100;  // Per correct question

speedBonus = timeLimit > 0 
  ? Math.max(0, 50 * (1 - (submissionTime / timeLimit)))
  : 0;

firstBloodBonus = isFirstToSolve ? 30 : 0;

totalPoints = basePoints + speedBonus + firstBloodBonus;
```

**Example**:
- Q1 solved in 2 min (30 min limit): 100 + 47 + 30 = **177 points**
- Q2 solved in 15 min: 100 + 25 + 0 = **125 points**

---

## 7. Deployment Considerations

### Scaling

- **Socket.io Adapter**: Use Redis adapter for multi-server deployments
- **Judge0**: Self-hosted or SaaS (use API key)
- **Firestore**: Built-in auto-scaling

### Monitoring

- Track submission queue length
- Monitor Judge0 API latency
- Alert on disconnection rates > 5%

---

## Next: Implementation Files

Ready to provide:
1. ✅ `DSARoomLive.jsx` - React component (Editor + Leaderboard)
2. ✅ `socket-io-config.js` - Socket.io backend handlers
3. ✅ `dsa-room-utils.js` - Utility functions
4. ✅ `/api/dsa-room/*` - Backend endpoints
5. ✅ `judge0-service.js` - Judge0 integration
