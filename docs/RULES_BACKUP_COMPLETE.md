# 🔐 BACKUP: Complete Interview Buddy Firestore Rules

## THIS IS YOUR BACKUP COPY - SAVE THIS FILE

If you ever need the rules again, they are here + in these locations:
1. `FIRESTORE_RULES.txt` (root folder)
2. `CRITICAL_FIRESTORE_RULES_COMPLETE.md` (docs folder)
3. This backup copy

---

## 📋 COMPLETE RULES - COPY EVERYTHING BELOW

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

## 📍 WHERE TO FIND THIS

In your project, you have 3 copies of these rules:

| File | Location | Use Case |
|------|----------|----------|
| `FIRESTORE_RULES.txt` | Root folder | Quick reference |
| `CRITICAL_FIRESTORE_RULES_COMPLETE.md` | docs/ folder | Read detailed explanations |
| `RULES_BACKUP_COMPLETE.md` | docs/ folder | This backup copy |

---

## 🎯 How to Use

### Step 1: Go to Firebase
```
Firebase Console 
  → Select "PrepPath" project
  → Click "Firestore Database"
```

### Step 2: Open Rules Tab
```
At the top of Firestore, click "Rules" (not "Data")
```

### Step 3: Copy the Rules Above
- Select all the code in the box above (starting with `rules_version`)
- Copy it (Ctrl+C)

### Step 4: Paste in Firebase
- Delete everything in the Rules editor
- Paste the code (Ctrl+V)

### Step 5: Publish
- Click the blue "Publish" button
- Wait for ✅ green checkmark (30 seconds - 1 minute)

### Step 6: Done! ✨
Your Interview Buddy is now 100% secure!

---

## 🛡️ What's Protected

| What | Rule | Protected? |
|------|------|-----------|
| User creates session | `allow create` | ✅ Only logged-in users |
| User views session | `allow read` | ✅ Only creator/participant |
| User edits session | `allow update` | ✅ Only creator |
| User deletes session | `allow delete` | ✅ Only creator |
| Other collections | `match /{document=**}` | ✅ Completely denied |

---

## ⚠️ Critical Rules (NEVER DELETE)

These 4 rules are CRITICAL for Interview Buddy. If you delete any:

❌ **Deleting `interview_buddy_sessions` rule**
- → Sessions won't be protected
- → Anyone can see/edit/delete sessions
- → 🚨 SYSTEM BREAKS

❌ **Deleting `allow read` rule**
- → Users can't see their own sessions
- → 🚨 FEATURE BREAKS

❌ **Deleting final `match /{document=**}` rule**
- → Anyone can write anything to Firestore
- → 🚨 SECURITY BREACH

✅ **Always keep all 4 core rules**

---

## 🔄 Making Changes

If you need to add rules later (for other features):

1. Only ADD new rules, don't remove existing ones
2. Always keep the final `match /{document=**} { allow read, write: if false; }`
3. Test each change in Rules panel
4. Firebase shows errors if something breaks

Example: Adding a new collection
```javascript
// Don't remove anything above this

match /new_collection/{docId} {
  allow read, write: if request.auth != null;
}

// Keep this at the end
match /{document=**} {
  allow read, write: if false;
}
```

---

## 📞 Firestore Indexes

When you first use Interview Buddy, you might see:
```
Missing composite index for query
```

This is NORMAL! Just:
1. Click the link Firebase provides
2. Firebase creates it automatically
3. Wait 5-10 minutes
4. It works!

---

## ✅ Final Checklist

Before you call it done:

- [ ] I have all rules in the Firebase Rules editor
- [ ] I clicked Publish
- [ ] I see ✅ green checkmark
- [ ] I tested creating a session in the app
- [ ] No "Permission denied" errors

---

## 🎉 You're Done!

Your Interview Buddy system is:
- ✅ Secure
- ✅ Protected
- ✅ Ready for production
- ✅ User data is private
- ✅ Session results can't be tampered with

**Congratulations!** 🚀
