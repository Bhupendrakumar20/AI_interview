# AI Interview Architecture Guide

## Architecture Overview

This refactor implements a **modular, flow-based architecture** that maps to the complete interview workflow shown in the Mermaid diagram.

### Core Principles

1. **Separation of Concerns** - Each module handles one specific phase
2. **Sequential Flow** - Modules execute in order following the flowchart
3. **Data Persistence** - All data is properly serialized and stored in Firestore
4. **Type Safety** - Full TypeScript support throughout

---

## Module Structure

### 📦 `/lib/modules/`

#### 1. **auth/** - Authentication & Session Management
**Handles**: User sign-in/up, JWT session creation, session verification
- `auth.service.ts` - Core auth functions
- Exports: Authentication functions and user validation

**Flow**: User Entry → Firebase Auth → JWT Session → Middleware Validation

**Key Functions**:
- `createJWTSession()` - Create secure session cookie
- `verifySessionToken()` - Validate session via middleware
- `getCurrentAuthenticatedUser()` - Get authenticated user
- `registerNewUser()` - Create new user profile

---

#### 2. **interview/** - Interview Setup & Configuration
**Handles**: Interview setup screen, role/domain/experience selection, question bank loading
- `interview-setup.service.ts` - Setup orchestration

**Flow**: Interview Setup Screen → Select Role/Domain/Experience → Load Question Bank → Save Config

**Key Functions**:
- `fetchQuestionBank()` - Load predefined questions
- `saveInterviewConfiguration()` - Save setup to Firestore
- `getInterviewConfiguration()` - Retrieve saved config
- `updateInterviewConfiguration()` - Modify existing config

---

#### 3. **interview-execution/** - Real-time Interview Execution
**Handles**: AI agent initialization, voice interaction, transcript storage, question progression
- `execution.service.ts` - Interview session management

**Flow**: Initialize Agent → Vapi Voice Setup → System Prompt → Model Binding → Ask Question → Store Answer → Next Question

**Key Functions**:
- `initializeAIInterviewAgent()` - Set up Vapi + Gemini
- `getCurrentInterviewQuestion()` - Get current Q
- `storeTranscriptChunk()` - Store user answer
- `moveToNextQuestion()` - Progress through interview
- `endInterviewSession()` - Complete interview

---

#### 4. **ai-analysis/** - Multi-Phase Answer Analysis
**Handles**: 4-phase AI analysis of answers
- `analysis.service.ts` - Complete analysis pipeline

**Flow**:
- Phase 1: Keyword Matching - Extract and match key concepts
- Phase 2: Embedding Similarity - Semantic understanding
- Phase 3: Contextual Reasoning - Deep analysis
- Phase 4: Score Normalization - Normalize to 0-10

**Key Functions**:
- `phase1KeywordMatching()` - Extract keywords
- `phase2EmbeddingSimilarity()` - Semantic analysis
- `phase3ContextualReasoning()` - Comprehensive evaluation
- `performCompleteAnalysis()` - Run all phases

---

#### 5. **scoring/** - Comprehensive Scoring System
**Handles**: Technical, Communication, Confidence scoring, weighted calculation
- `scoring.service.ts` - Score generation

**Flow**: Analyze Answers → Technical Score → Communication Score → Confidence Score → Weighted Score → Normalize 0-10

**Key Functions**:
- `calculateTechnicalScore()` - Technical knowledge score
- `calculateCommunicationScore()` - Communication effectiveness
- `calculateConfidenceScore()` - Confidence level
- `generateComprehensiveScores()` - Complete scoring

---

#### 6. **feedback/** - Structured Feedback Generation
**Handles**: Feedback generation with strengths, weaknesses, suggestions
- `feedback.service.ts` - Feedback generation

**Flow**: Generate Feedback JSON → Strengths → Weaknesses → Suggestions → Persist to Firestore

**Key Functions**:
- `generateStructuredFeedback()` - Create feedback
- `persistFeedback()` - Save to Firestore
- `fetchInterviewFeedback()` - Retrieve feedback
- `loadFeedbackJSON()` - Load for display

---

#### 7. **dashboard/** - User Dashboard & Profile
**Handles**: User profile, interview history, progress metrics
- `dashboard.service.ts` - Dashboard data management

**Flow**: User Dashboard → Fetch User Interviews → View Profile → View History → Start New Interview

**Key Functions**:
- `fetchUserProfile()` - Get user profile
- `fetchInterviewHistory()` - Get all interviews
- `fetchRecentInterviews()` - Get recent 5
- `calculateProgressMetrics()` - Calculate improvement
- `getDashboardSummary()` - Complete dashboard data

---

#### 8. **interview-orchestrator.service.ts** - Master Orchestrator
**Handles**: Entire interview flow coordination
Features 10-step orchestration:
1. Authenticate User
2. Load Dashboard
3. Interview Setup
4. Initialize AI Agent
5. Execute Interview Loop
6. Analyze Answers
7. Generate Scores
8. Generate Feedback
9. Display Feedback
10. Track Progress

---

## Data Flow Diagram

```
User Entry
    ↓
Authentication (auth module)
    ↓
Dashboard (dashboard module)
    ↓
Interview Setup (interview module)
    ↓
AI Agent Init (interview-execution module)
    ↓
Real-time Interview Execution
    ├→ AI asks question
    ├→ User answers (speech-to-text)
    ├→ Store transcript chunk
    └→ Repeat until done
    ↓
Multi-phase Analysis (ai-analysis module)
    ├→ Phase 1: Keyword Matching
    ├→ Phase 2: Embedding Similarity
    ├→ Phase 3: Contextual Reasoning
    └→ Phase 4: Score Normalization
    ↓
Comprehensive Scoring (scoring module)
    ├→ Technical Score
    ├→ Communication Score
    ├→ Confidence Score
    └→ Weighted Final Score
    ↓
Feedback Generation (feedback module)
    ├→ Strengths
    ├→ Weaknesses
    └→ Suggestions
    ↓
Persist to Firestore
    ↓
Display Feedback Results
    ↓
Progress Tracking & Continuous Loop
```

---

## File Organization

```
lib/
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   └── index.ts
│   ├── interview/
│   │   ├── interview-setup.service.ts
│   │   └── index.ts
│   ├── interview-execution/
│   │   ├── execution.service.ts
│   │   └── index.ts
│   ├── ai-analysis/
│   │   ├── analysis.service.ts
│   │   └── index.ts
│   ├── scoring/
│   │   ├── scoring.service.ts
│   │   └── index.ts
│   ├── feedback/
│   │   ├── feedback.service.ts
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── dashboard.service.ts
│   │   └── index.ts
│   ├── interview-orchestrator.service.ts
│   └── README.md (this file)
```

---

## Type Definitions

All modules export TypeScript interfaces:

### Auth
- `User` - Authenticated user object

### Interview
- `InterviewConfig` - Interview setup configuration
- `InterviewQuestion` - Question structure

### Execution
- `InterviewSession` - Active interview session
- `TranscriptChunk` - User answer with timestamp

### Analysis
- `AnalysisResult` - Complete analysis output
- `KeywordMatchResult`, `EmbeddingSimilarityResult`, `ContextualReasoningResult` - Phase outputs

### Scoring
- `InterviewScores` - Complete score object
- `ScoreBreakdown` - Detailed score breakdown

### Feedback
- `InterviewFeedback` - Structured feedback
- `Strength`, `Weakness`, `Suggestion` - Feedback components

### Dashboard
- `UserProfile` - User profile information
- `InterviewHistory` - Historical interview data
- `ProgressMetrics` - Progress and improvement metrics

---

## Usage Examples

### Complete Interview Flow
```typescript
const result = await executeCompleteInterviewFlow({
  userId: "user123",
  role: "Software Engineer",
  domain: "Data Structures",
  experience: "intermediate",
  difficulty: "advanced",
  transcripts: [
    { question: "Q1", userAnswer: "Answer1" },
    { question: "Q2", userAnswer: "Answer2" }
  ]
});
```

### Step-by-step
```typescript
// 1. Authenticate
const authResult = await orchestrateStep1_AuthenticateUser();

// 2. Load Dashboard
const dashboard = await orchestrateStep2_LoadDashboard(userId);

// 3. Setup Interview
const setup = await orchestrateStep3_InterviewSetup({...});

// 4. Initialize AI
const agent = await orchestrateStep4_InitializeAIAgent(interviewId, questions);

// ... continue through steps 5-10
```

---

## Firestore Collections

### `interviews` collection
```json
{
  "userId": "user123",
  "role": "Software Engineer",
  "domain": "Data Structures",
  "experience": "intermediate",
  "difficulty": "advanced",
  "questions": ["Q1", "Q2", ...],
  "transcripts": [{question, userAnswer, timestamp, ...}],
  "analysisResults": [{...}, {...}, ...],
  "scores": {
    "technical": 8.5,
    "communication": 8.0,
    "confidence": 7.5,
    "weighted": 8.1,
    "normalized": 8.1,
    "breakdown": {...}
  },
  "feedback": {
    "strengths": [...],
    "weaknesses": [...],
    "suggestions": [...],
    "summary": "...",
    "nextSteps": [...]
  },
  "status": "feedback_generated",
  "createdAt": "timestamp",
  "completedAt": "timestamp"
}
```

---

## Next Steps

1. Create page components for each flow step
2. Implement client-side UI using these modules
3. Add real-time WebSocket for interview execution
4. Set up Vapi integration for voice
5. Add progress tracking dashboard
6. Implement email notifications

---

## Key Benefits

✅ **Modular** - Each module is independent and testable
✅ **Scalable** - Easy to extend or modify behavior
✅ **Type-Safe** - Full TypeScript support
✅ **Maintainable** - Clear separation of concerns
✅ **Observable** - Each step can be logged and monitored
✅ **Serializable** - All data properly serialized for Next.js
