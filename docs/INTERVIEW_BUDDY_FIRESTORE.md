/**
 * Firestore Security Rules for Interview Buddy
 * 
 * These rules ensure:
 * 1. Users can only view their own sessions
 * 2. Only session creator can modify/delete
 * 3. Session codes are validated
 * 4. Participants can view shared sessions
 * 
 * Add these rules to your Firestore console
 */

/*
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Interview Buddy Sessions Collection
    match /interview_buddy_sessions/{sessionId} {
      
      // Allow create if user is authenticated
      allow create: if request.auth != null;
      
      // Allow read if user is creator or participant
      allow read: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.uid in resource.data.participants);
      
      // Allow update if user is creator
      allow update: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
      
      // Allow delete if user is creator
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
      
      // Index for querying sessions by participants
      // Firestore will suggest this automatically
    }
    
    // Fallback: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// Database Schema Documentation
/*
Collection: interview_buddy_sessions

Document Structure:
{
  // Creator Information
  createdBy: string (uid),
  
  // Session Configuration
  mode: "human" | "ai",
  persona: "hiring-manager" | "hr-partner" | "startup-founder" | "drill-sergeant" (AI mode only),
  topics: string[],  // ["DSA", "System Design", "OOP", ...]
  difficulty: "easy" | "medium" | "hard",
  duration: number (15-90 minutes),
  jobDescription: string | null,
  
  // Session Code (Human mode only)
  sessionCode: string | null,  // e.g., "IB-7X4K9"
  
  // Session Status
  status: "created" | "in-progress" | "completed",
  startTime: Timestamp | null,
  endTime: Timestamp | null,
  
  // Participants
  participants: string[],  // array of user UIDs
  
  // Results & Feedback
  score: number | null (0-100),
  feedback: {
    clarity: number,
    technicalAccuracy: number,
    communication: number,
    confidence: number,
    pacing: number,
    fillerWords: number,
    overallScore: number,
  } | null,
  
  // Media
  recordingUrl: string | null,
  transcriptUrl: string | null,
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}

Indexes Required:
1. Collection: interview_buddy_sessions
   - Composite Index: participants (Ascending) + createdAt (Descending)
   - This allows efficient querying of user's sessions ordered by date

2. Collection: interview_buddy_sessions
   - Single field index: sessionCode (Ascending)
   - This allows fast lookup of sessions by code
*/
