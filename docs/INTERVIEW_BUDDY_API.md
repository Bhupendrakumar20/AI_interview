# Interview Buddy - Backend API Documentation

## Overview
Interview Buddy is a dual-mode interview practice system supporting:
- **Human Buddy Mode**: Practice with peer via video call with shared code editor
- **AI Buddy Mode**: Practice with AI interviewer with personalized personas

## API Endpoints

### 1. Create Session
**POST** `/api/interview-buddy/create-session`

Create a new interview buddy session.

**Request Body:**
```json
{
  "userId": "string (required)",
  "mode": "ai" | "human" (default: "ai"),
  "persona": "hiring-manager" | "hr-partner" | "startup-founder" | "drill-sergeant",
  "topics": ["DSA", "System Design", ...],
  "difficulty": "easy" | "medium" | "hard" (default: "medium"),
  "duration": 30,  // 15-90 minutes
  "jobDescription": "string | null"
}
```

**Response (201):**
```json
{
  "sessionId": "string",
  "sessionCode": "IB-7X4K9" (only for human mode),
  "success": true
}
```

**Error Responses:**
- `400`: Missing required fields
- `500`: Server error

---

### 2. Join Session
**POST** `/api/interview-buddy/join-session`

Join an existing human buddy session using session code.

**Request Body:**
```json
{
  "userId": "string (required)",
  "sessionCode": "IB-7X4K9 (required)"
}
```

**Response (200):**
```json
{
  "sessionId": "string",
  "sessionCode": "IB-7X4K9",
  "participants": ["uid1", "uid2"],
  "success": true
}
```

**Error Responses:**
- `400`: Invalid input or session full
- `404`: Invalid/non-existent session code
- `410`: Session code expired (24 hours)
- `500`: Server error

---

### 3. Get Sessions
**GET** `/api/interview-buddy/sessions`

Get user's interview buddy sessions or details of a specific session.

**Query Parameters:**
- `userId`: string (required)
- `sessionId`: string (optional) - Get specific session

**Response (200) - List:**
```json
{
  "count": 12,
  "sessions": [
    {
      "id": "sessionId",
      "createdBy": "userId",
      "mode": "ai",
      "persona": "hiring-manager",
      "topics": ["DSA", "System Design"],
      "difficulty": "medium",
      "duration": 30,
      "status": "completed",
      "score": 85,
      "createdAt": "2026-03-22T10:00:00Z",
      "updatedAt": "2026-03-22T10:30:00Z",
      ...
    }
  ]
}
```

**Response (200) - Single:**
```json
{
  "id": "sessionId",
  "createdBy": "userId",
  "mode": "ai",
  "persona": "hiring-manager",
  "topics": ["DSA"],
  "difficulty": "medium",
  "duration": 30,
  "status": "completed",
  "score": 85,
  "feedback": {
    "clarity": 85,
    "technicalAccuracy": 90,
    "communication": 80,
    "confidence": 85,
    "pacing": 88,
    "fillerWords": 3,
    "overallScore": 85
  },
  "recordingUrl": "url",
  "transcriptUrl": "url",
  "createdAt": "2026-03-22T10:00:00Z",
  ...
}
```

**Error Responses:**
- `400`: Missing userId
- `403`: Access denied (not participant/creator)
- `404`: Session not found
- `500`: Server error

---

### 4. Update Session
**PUT** `/api/interview-buddy/sessions/{sessionId}/update`

Update session status, score, feedback, and media URLs.

**Request Body:**
```json
{
  "status": "in-progress" | "completed",
  "score": 85,  // 0-100
  "feedback": {
    "clarity": 85,
    "technicalAccuracy": 90,
    "communication": 80,
    "confidence": 85,
    "pacing": 88,
    "fillerWords": 3,
    "overallScore": 85
  },
  "recordingUrl": "https://...",
  "transcriptUrl": "https://..."
}
```

**Response (200):**
```json
{
  "id": "sessionId",
  "status": "completed",
  "score": 85,
  "feedback": {...},
  "recordingUrl": "...",
  "success": true,
  ...
}
```

**Error Responses:**
- `400`: Invalid input
- `404`: Session not found
- `500`: Server error

---

### 5. Delete Session
**DELETE** `/api/interview-buddy/sessions/{sessionId}`

Delete a session (only creator can delete).

**Query Parameters:**
- `userId`: string (required) - Must be session creator

**Response (200):**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

**Error Responses:**
- `400`: Missing userId
- `403`: Only creator can delete
- `404`: Session not found
- `500`: Server error

---

### 6. Get Statistics
**GET** `/api/interview-buddy/stats`

Get user's interview buddy statistics.

**Query Parameters:**
- `userId`: string (required)

**Response (200):**
```json
{
  "totalSessions": 12,
  "completedSessions": 10,
  "avgScore": 78,
  "totalPracticeTime": 270,  // minutes
  "topicsCovered": ["DSA", "System Design", "OOP"],
  "sessionsByMode": {
    "human": 3,
    "ai": 9
  },
  "sessionsByDifficulty": {
    "easy": 2,
    "medium": 7,
    "hard": 3
  },
  "recentSessions": [
    {
      "mode": "ai",
      "persona": "hiring-manager",
      "topics": ["System Design"],
      "difficulty": "hard",
      "score": 84,
      "status": "completed",
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `400`: Missing userId
- `500`: Server error

---

## Server Actions (use server)

### `createInterviewBuddySession()`
Create session from client component.
```javascript
import { createInterviewBuddySession } from "@/lib/actions/interview-buddy.action";

const result = await createInterviewBuddySession({
  userId: "user123",
  mode: "ai",
  persona: "hiring-manager",
  topics: ["DSA"],
  difficulty: "medium",
  duration: 30
});
```

### `joinInterviewBuddySession()`
Join session using code.
```javascript
const result = await joinInterviewBuddySession({
  userId: "user456",
  sessionCode: "IB-7X4K9"
});
```

### `getUserInterviewBuddySessions()`
Get user's sessions.
```javascript
const sessions = await getUserInterviewBuddySessions("user123");
```

### `getInterviewBuddySessionDetails()`
Get single session.
```javascript
const session = await getInterviewBuddySessionDetails("sessionId");
```

### `updateInterviewBuddySession()`
Update session.
```javascript
const result = await updateInterviewBuddySession({
  sessionId: "sessionId",
  status: "completed",
  score: 85,
  feedback: {...}
});
```

### `getInterviewBuddyStats()`
Get user stats.
```javascript
const stats = await getInterviewBuddyStats("user123");
```

### `deleteInterviewBuddySession()`
Delete session.
```javascript
const result = await deleteInterviewBuddySession("sessionId", "user123");
```

---

## Utilities

### Session Code Generation
```javascript
import { generateSessionCode } from "@/lib/utils/interview-buddy-utils";

const code = generateSessionCode(); // "IB-7X4K9"
```

### Validation Functions
```javascript
import {
  isValidPersona,
  isValidDifficulty,
  areValidTopics,
  isValidDuration,
  isSessionCodeExpired,
  getPersonaInfo
} from "@/lib/utils/interview-buddy-utils";

isValidPersona("hiring-manager");               // true
isValidDifficulty("medium");                    // true
areValidTopics(["DSA", "System Design"]);       // true
isValidDuration(30);                            // true
isSessionCodeExpired(createdAtTimestamp);       // boolean
getPersonaInfo("hiring-manager");               // {...emoji, name, style}
```

---

## Firestore Collections

### `interview_buddy_sessions`

**Indexes Required:**
1. `participants` (Ascending) + `createdAt` (Descending)
   - For efficient user session queries
2. `sessionCode` (Ascending)
   - For fast session lookup by code

**Security Rules:**
- Users can create sessions
- Only participant/creator can view
- Only creator can modify/delete

---

## Environment Variables

No additional environment variables needed. Uses existing:
- `NEXT_PUBLIC_FIREBASE_*` (web config)
- `FIREBASE_*` (admin SDK)

---

## Error Handling

All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "status": 400
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad request
- `403`: Forbidden (permission denied)
- `404`: Not found
- `410`: Gone (expired)
- `500`: Server error

---

## Rate Limiting

Currently no rate limiting. Consider adding if needed.

---

## Testing

Example cURL requests:

```bash
# Create session
curl -X POST http://localhost:4001/api/interview-buddy/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "mode": "ai",
    "persona": "hiring-manager",
    "topics": ["DSA"],
    "difficulty": "medium",
    "duration": 30
  }'

# Join session
curl -X POST http://localhost:4001/api/interview-buddy/join-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user456",
    "sessionCode": "IB-7X4K9"
  }'

# Get sessions
curl "http://localhost:4001/api/interview-buddy/sessions?userId=user123"

# Get stats
curl "http://localhost:4001/api/interview-buddy/stats?userId=user123"

# Update session
curl -X PUT http://localhost:4001/api/interview-buddy/sessions/sessionId/update \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "score": 85,
    "feedback": {...}
  }'

# Delete session
curl -X DELETE "http://localhost:4001/api/interview-buddy/sessions/sessionId?userId=user123"
```

---

## Future Enhancements

1. **Real-time Updates**: Add Firestore listeners for live session updates
2. **WebRTC Integration**: For video/audio streaming
3. **Recording**: Integrate with storage bucket for session recordings
4. **Notifications**: Send alerts for session invitations
5. **Analytics**: Track session performance trends
6. **Premium Features**: Paywall certain personas or session types
