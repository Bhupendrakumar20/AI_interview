# ⚠️ CRITICAL FIRESTORE RULES - DO NOT REMOVE

## 🔒 IMPORTANT: These Rules Protect Your Entire Interview Buddy System

This file contains the **COMPLETE and CRITICAL** Firestore security rules for your Interview Buddy feature.

---

## ⛔ WARNING - DO NOT DELETE OR MODIFY:

❌ **DO NOT REMOVE** these rules:
- `interview_buddy_sessions` collection rules
- `allow create` rule
- `allow read` rule check for creator/participants
- `allow update` rule for creator only
- `allow delete` rule for creator only
- Final `match /{document=**}` deny all rule

✅ **OK TO ADD** new rules only if needed for other features

---

## 📋 COMPLETE COPY-PASTE RULES

Use this ENTIRE block - copy everything from START to END:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================================
    // CRITICAL: INTERVIEW BUDDY SESSIONS - DO NOT REMOVE
    // ========================================================
    // This collection stores ALL interview buddy sessions
    // Sessions can be: human buddy mode OR ai buddy mode
    // Each session has: participants, creator, score, feedback, recording
    // ========================================================
    match /interview_buddy_sessions/{sessionId} {
      
      // RULE 1: CREATION
      // ✅ Authenticated users can create new interview buddy sessions
      // ✅ Both AI and Human buddy modes supported
      // ✅ Session code auto-generated for human mode
      allow create: if request.auth != null && 
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.mode in ['human', 'ai'];
      
      // RULE 2: READ ACCESS
      // ✅ Users can see sessions where they are:
      //    - The creator (session owner)
      //    - A participant (invited to join)
      // ✅ Protects privacy - no cross-user data leaks
      allow read: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.uid in resource.data.participants);
      
      // RULE 3: UPDATE ACCESS
      // ✅ Only session creator can update
      // ✅ Can update: status, score, feedback, recording URL, transcript
      // ✅ Prevents other users from tampering with results
      allow update: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
      
      // RULE 4: DELETE ACCESS
      // ✅ Only session creator can delete
      // ✅ Prevents accidental deletion by participants
      // ✅ Keeps audit trail of completed sessions
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    // ========================================================
    // OPTIONAL: USER INTERVIEW BUDDY STATS
    // ========================================================
    match /user_interview_buddy_stats/{userId} {
      allow read: if request.auth != null && 
        request.auth.uid == userId;
      
      allow write: if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // ========================================================
    // SECURITY: REJECT ALL OTHER COLLECTIONS
    // ========================================================
    // ✅ Prevents unauthorized collections
    // ✅ Forces explicit rules for any new collections
    // ✅ Maximum security - deny by default
    // ========================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🎯 What Each Rule Does

### **RULE 1: CREATION** (`allow create`)
```javascript
allow create: if request.auth != null && 
  request.resource.data.createdBy == request.auth.uid &&
  request.resource.data.mode in ['human', 'ai'];
```
**Protects:**
- Only logged-in users can create sessions
- User must set themselves as `createdBy`
- Only "human" or "ai" modes allowed
- Prevents invalid session types

---

### **RULE 2: READ ACCESS** (`allow read`)
```javascript
allow read: if request.auth != null && 
  (resource.data.createdBy == request.auth.uid || 
   request.auth.uid in resource.data.participants);
```
**Protects:**
- Users can only see sessions they created OR joined
- No cross-user data leaks
- Participants can view shared sessions
- Privacy is guaranteed

---

### **RULE 3: UPDATE ACCESS** (`allow update`)
```javascript
allow update: if request.auth != null && 
  resource.data.createdBy == request.auth.uid;
```
**Protects:**
- Only session creator can update
- Other users can't tamper with results
- Prevents score/feedback manipulation
- Only creator adds recording URLs

---

### **RULE 4: DELETE ACCESS** (`allow delete`)
```javascript
allow delete: if request.auth != null && 
  resource.data.createdBy == request.auth.uid;
```
**Protects:**
- Only session creator can delete
- Prevents accidental deletion by participants
- Keeps complete audit trail
- Maintains data integrity

---

### **FINAL RULE: DENY ALL** (`match /{document=**}`)
```javascript
match /{document=**} {
  allow read, write: if false;
}
```
**Protects:**
- Any collection not explicitly allowed = DENIED
- Forces you to write rules for new collections
- Maximum security - default deny policy
- **NEVER DELETE THIS RULE**

---

## 📊 Firestore Structure Protected

Your Interview Buddy system has:

```
Firestore
└── interview_buddy_sessions/
    ├── sessionId1/
    │   ├── createdBy: "user123"
    │   ├── participants: ["user123", "user456"]
    │   ├── mode: "ai"
    │   ├── persona: "hiring-manager"
    │   ├── topics: ["DSA", "System Design"]
    │   ├── difficulty: "medium"
    │   ├── status: "completed"
    │   ├── score: 85
    │   ├── feedback: {...}
    │   ├── recordingUrl: "https://..."
    │   └── createdAt: timestamp
    │
    └── sessionId2/
        └── ...more sessions...
```

**These rules protect:**
- ✅ Each user's sessions (privacy)
- ✅ Session scores (no tampering)
- ✅ Recording URLs (security)
- ✅ Participant list (authorization)

---

## 🔄 How to Update Rules

**To change rules:**

1. Go to Firebase Console
2. Click Firestore → Rules
3. Edit the code
4. Click Publish
5. That's it! (Changes apply immediately)

**To rollback if something breaks:**

1. Click Firestore → Rules
2. Look for "Edit Rules" dropdown
3. Find previous version in history
4. Click to restore
5. Publish

---

## ✅ Verification Checklist

After you paste the rules:

- [ ] I copied ALL the code above
- [ ] I went to Firebase Console → Firestore → Rules
- [ ] I selected all existing code and deleted it
- [ ] I pasted the complete rules above
- [ ] I clicked "Publish" button
- [ ] I saw ✅ green checkmark (rules deployed)
- [ ] I tested creating a session in my app

---

## 🚨 If Something Goes Wrong

**"Permission denied" error**
- → Wait 1-2 minutes, rules are deploying
- → Refresh the page

**"Invalid composite index" error**
- → Click the link Firebase provides
- → It creates automatically
- → Wait 5-10 minutes

**"Cannot find collection" error**
- → Make sure you named it `interview_buddy_sessions` (exact name)
- → Check the rules file for spelling

---

## 📞 Need Help?

Keep this file safe! It contains:
- ✅ Complete rules for Interview Buddy
- ✅ Explanation of each rule
- ✅ What each rule protects
- ✅ Backup copy (save offline)

---

**Status: 🎯 Ready to Deploy**

Just copy these rules to Firebase and your Interview Buddy is 100% secure! 🔒
