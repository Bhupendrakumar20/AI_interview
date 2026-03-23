# Interview Buddy - Backend Implementation Guide

## 🎯 Overview

This document explains the complete backend implementation for the Interview Buddy feature in PrepPath. The feature supports dual-mode interview practice:
- **Human Buddy Mode**: Practice with peers via video call  
- **AI Buddy Mode**: Practice with AI interviewers using different personas

## 📁 Files Created/Modified

### Backend Files

#### 1. **Server Actions** - `lib/actions/interview-buddy.action.js`
Core server-side logic for all Interview Buddy operations.

**Functions:**
- `createInterviewBuddySession()` - Create new session
- `joinInterviewBuddySession()` - Join using session code
- `getUserInterviewBuddySessions()` - Fetch user's sessions
- `getInterviewBuddySessionDetails()` - Get single session
- `updateInterviewBuddySession()` - Update session status/results
- `getInterviewBuddyStats()` - Calculate user statistics
- `deleteInterviewBuddySession()` - Delete session

#### 2. **API Routes**

**Create Session**  
- **Route:** `app/api/interview-buddy/create-session/route.js`
- **Method:** POST
- **Purpose:** Initialize new interview buddy session

**Join Session**
- **Route:** `app/api/interview-buddy/join-session/route.js`
- **Method:** POST
- **Purpose:** Join human buddy session with code

**Get Sessions**
- **Route:** `app/api/interview-buddy/sessions/route.js`
- **Method:** GET
- **Purpose:** Fetch user sessions or single session details

**Update Session**
- **Route:** `app/api/interview-buddy/sessions/[sessionId]/update/route.js`
- **Methods:** PUT (update), DELETE (remove)
- **Purpose:** Modify session or delete

**Get Statistics**
- **Route:** `app/api/interview-buddy/stats/route.js`
- **Method:** GET
- **Purpose:** Fetch user statistics and analytics

#### 3. **Utilities** - `lib/utils/interview-buddy-utils.js`

Helper functions for:
- Session code generation
- Session expiration checking
- Persona/difficulty/topic validation
- Display formatting
- Feedback creation

#### 4. **Documentation**

- **API Docs:** `docs/INTERVIEW_BUDDY_API.md`
- **Firestore Schema:** `docs/INTERVIEW_BUDDY_FIRESTORE.md`

### Frontend Files Modified

- **Component:** `components/InterviewBuddy.jsx`
  - Integrated API calls
  - Added backend data fetching
  - Loading states and error handling
  - Real-time stats display

- **Page:** `app/(root)/interview/buddy/page.jsx`
  - Server-rendered page wrapper

- **Interview Page:** `app/(root)/interview/page.jsx`
  - Added CTA banner for Interview Buddy

## 🗄️ Database Schema

### Collection: `interview_buddy_sessions`

```javascript
{
  // Creator & Participants
  createdBy: string (user UID),
  participants: string[] (array of UIDs),
  
  // Session Config
  mode: "human" | "ai",
  persona: "hiring-manager" | "hr-partner" | "startup-founder" | "drill-sergeant",
  topics: string[],
  difficulty: "easy" | "medium" | "hard",
  duration: number (15-90 min),
  jobDescription: string | null,
  
  // Session Code (Human mode only)
  sessionCode: string | null (e.g., "IB-7X4K9"),
  
  // Status & Timing
  status: "created" | "in-progress" | "completed",
  startTime: Timestamp | null,
  endTime: Timestamp | null,
  
  // Results
  score: number | null (0-100),
  feedback: { clarity, technicalAccuracy, communication, ... },
  recordingUrl: string | null,
  transcriptUrl: string | null,
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Required Firestore Indexes

1. **Composite Index:** `interview_buddy_sessions`
   - Ascending: `participants`
   - Descending: `createdAt`
   - **Purpose:** Efficient user session queries

2. **Single Field Index:** `interview_buddy_sessions`
   - Ascending: `sessionCode`
   - **Purpose:** Fast session code lookup

> **Note:** Firestore will suggest these automatically when you run the first query.

## 🔐 Firestore Security Rules

Add to Firestore Console > Rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /interview_buddy_sessions/{sessionId} {
      // Users can create sessions
      allow create: if request.auth != null;
      
      // Users can read if they're creator or participant
      allow read: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.uid in resource.data.participants);
      
      // Only creator can update
      allow update: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
      
      // Only creator can delete
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🚀 Setup Instructions

### 1. No Additional Dependencies Needed
Interview Buddy uses existing project dependencies:
- Firebase (already configured)
- Next.js (already using)
- TypeScript/JavaScript (already using)

### 2. Firestore Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Create collection: `interview_buddy_sessions`
5. Update security rules (copy from above)
6. Enable automatic index creation

### 3. Environment Variables
No new environment variables needed. Uses existing:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_ADMIN_*` (for admin SDK)

### 4. Deploy Files

All files are already created:
```
lib/
├── actions/
│   └── interview-buddy.action.js
└── utils/
    └── interview-buddy-utils.js

app/
└── api/
    └── interview-buddy/
        ├── create-session/route.js
        ├── join-session/route.js
        ├── sessions/route.js
        └── sessions/[sessionId]/update/route.js

components/
└── InterviewBuddy.jsx (modified)

docs/
├── INTERVIEW_BUDDY_API.md
└── INTERVIEW_BUDDY_FIRESTORE.md
```

## 🧪 Testing the Backend

### Create Session
```bash
curl -X POST http://localhost:4001/api/interview-buddy/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "mode": "ai",
    "persona": "hiring-manager",
    "topics": ["DSA"],
    "difficulty": "medium",
    "duration": 30
  }'
```

### Join Session
```bash
curl -X POST http://localhost:4001/api/interview-buddy/join-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-456",
    "sessionCode": "IB-7X4K9"
  }'
```

### Get User Sessions
```bash
curl "http://localhost:4001/api/interview-buddy/sessions?userId=test-user-123"
```

### Get Statistics
```bash
curl "http://localhost:4001/api/interview-buddy/stats?userId=test-user-123"
```

### Update Session
```bash
curl -X PUT http://localhost:4001/api/interview-buddy/sessions/sessionId/update \
  -H "Content-Type: application/json" \
  -d '{
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
    }
  }'
```

## 📊 Data Flow

```
User Action
    ↓
Frontend Component (InterviewBuddy.jsx)
    ↓
API Route (/api/interview-buddy/*)
    ↓
Server Action (lib/actions/interview-buddy.action.js)
    ↓
Firestore Database
    ↓
Response back to Component
    ↓
UI Update + Toast Notification
```

## 🔄 Session Lifecycle

1. **Created** - User initiates (session code generated for human mode)
2. **In-Progress** - Session starts (2 participants for human mode)
3. **Completed** - Session ends (results saved, score calculated)

## 📈 Statistics Calculation

The `getInterviewBuddyStats()` function:
- Counts total/completed sessions
- Calculates average score
- Sums total practice time
- Tracks topics covered
- Groups by mode and difficulty
- Returns recent sessions

## ⚠️ Error Handling

All API routes and server actions include:
- Input validation
- Error logging
- User-friendly error messages
- Proper HTTP status codes
- Toast notifications to user

## 🔒 Security Features

1. **Authentication:** Firebase Auth integration
2. **Authorization:** 
   - Users can only view their sessions
   - Only creator can modify/delete
   - Session code expires in 24 hours
3. **Data Validation:** Input validation on all endpoints
4. **Firestore Rules:** Row-level security rules

## 🔗 Integration Points

### Component Integration
```javascript
import { createInterviewBuddySession } from "@/lib/actions/interview-buddy.action";

// In your component
const result = await createInterviewBuddySession({
  userId: user.id,
  mode: "ai",
  persona: "hiring-manager",
  topics: ["DSA"],
  difficulty: "medium",
  duration: 30
});
```

### API Integration
```javascript
// From frontend
const response = await fetch("/api/interview-buddy/create-session", {
  method: "POST",
  body: JSON.stringify({...})
});
```

## 🚨 Common Issues & Solutions

**Issue:** Collections don't appear in Firestore
- **Solution:** Run first API call, Firestore creates collections automatically

**Issue:** Composite index error
- **Solution:** Firestore error message includes link to create index, click it

**Issue:** "Access denied" errors
- **Solution:** Check Firebase security rules are updated correctly

**Issue:** Session code expired
- **Solution:** Session codes auto-expire after 24 hours, create new session

## 📝 Next Steps

1. ✅ Backend files created
2. ✅ API routes implemented
3. ✅ Frontend integrated
4. ⏳ **You need to:**
   - Update Firestore security rules
   - Test with real Firebase project
   - Create composite indexes when needed
   - Integrate video/recording features (optional)
   - Add WebRTC for real-time communication (optional)

## 📚 Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- API Documentation: `docs/INTERVIEW_BUDDY_API.md`
- Schema Documentation: `docs/INTERVIEW_BUDDY_FIRESTORE.md`

## 💡 Tips

1. **Testing:** Use browser DevTools Network tab to inspect API calls
2. **Debugging:** Check browser console and server terminal for errors
3. **Performance:** Use Firestore indexes for large-scale deployments
4. **Analytics:** Consider adding Custom Events for session tracking
5. **Monitoring:** Set up Firestore monitoring in Firebase Console

---

**Status:** ✅ Ready for Integration

All backend infrastructure is in place. Connect video, recording, and real-time communication features as needed!
