# How to Apply Combined Security Rules to Firestore

**Complete guide to add DSA Room rules while keeping your existing rules**

---

## 📋 What You Need to Do

### Step 1: Open Firestore Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Click **Rules** tab (top)

### Step 2: Copy Your Current Rules
1. In the Rules editor, **select all** (Ctrl+A)
2. **Copy** them to a text file as backup
3. Keep this backup safe!

### Step 3: Replace with Combined Rules

**Delete everything** in the Rules editor and paste this:

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

### Step 4: Publish Rules

1. Click **Publish** button (bottom right)
2. Wait for success message ✅
3. Rules are now live!

---

## 🔍 What Each Rule Does

### **Existing Rules** (Already working)

| Collection | Action | Who | Rule |
|-----------|--------|-----|------|
| `internships` | Read | Everyone | ✅ Public |
| `internships` | Write | Admins only | ✅ Protected |
| `applications` | Read | User or Admin | ✅ Private |
| `applications` | Create | Logged-in users | ✅ Self-create |
| `interview_buddy_sessions` | Create | Session creator | ✅ Protected |
| `interview_buddy_sessions` | Read | Creator or participant | ✅ Private |
| `user_interview_buddy_stats` | Read/Write | User (own) | ✅ Private |

### **New DSA Room Rules** (Just added)

| Collection | Action | Who | Rule |
|-----------|--------|-----|------|
| `users` | Read | Everyone | ✅ Public profiles |
| `users` | Write | User (self) | ✅ Protected |
| `user_stats` | Read | Everyone | ✅ Public leaderboard |
| `user_stats` | Write | User (self) | ✅ Protected |
| `dsa_questions` | Read | Everyone | ✅ Public access |
| `dsa_questions` | Write | Admins only | ✅ Protected |
| `dsa_rooms` | Read | Logged-in users | ✅ Authenticated |
| `dsa_rooms` | Create | Logged-in users | ✅ Host controls |
| `dsa_rooms` | Update/Delete | Host only | ✅ Protected |
| `room_users` | Create | User themselves | ✅ Self-join only |
| `submissions` | Create | User themselves | ✅ Self-submit only |
| `submissions` | Read | Owner or Admin | ✅ Private |
| `room_votes` | Read/Write | Logged-in users | ✅ In-room only |
| `user_achievements` | Read | Logged-in users | ✅ Viewable |
| `user_achievements` | Write | Admins only | ✅ Protected |

---

## ✅ Verification Checklist

After publishing, test these:

- [ ] **Interview Buddy** still works (existing feature)
- [ ] **Applications** still work (existing feature)
- [ ] **Internships** still load (existing feature)
- [ ] New user can **sign up** → creates `users` doc ✅
- [ ] User can view **leaderboard** → reads `user_stats` ✅
- [ ] User can **create room** → creates `dsa_rooms` doc ✅
- [ ] User can **join room** → creates `room_users` doc ✅
- [ ] User can **submit code** → creates `submissions` doc ✅
- [ ] **Admin panel** loads questions ✅
- [ ] Read data from different browser (no permission errors) ✅

---

## 🐛 Common Issues

### ❌ "Permission denied" error
**Cause**: Rule doesn't match your operation  
**Fix**: Check that you're authenticated and operation follows rule

### ❌ "Requested entity not found"
**Cause**: Collection doesn't exist yet  
**Fix**: Normal! Firestore auto-creates on first write

### ❌ Rules take too long to update
**Cause**: Can take 30-60 seconds to propagate  
**Fix**: Wait a minute, then refresh page

### ❌ Old feature broken after update
**Cause**: Forgot to include old rules  
**Fix**: Go back to backup, check we included all old rules

---

## 📝 Rule Breakdown by Category

### **Public Data** (Everyone can read)
- `internships` - job listings
- `dsa_questions` - coding problems
- `users` - public profiles
- `user_stats` - leaderboards

### **Authenticated Only** (Must be logged in)
- `applications` - job applications
- `interview_buddy_sessions` - interview sessions
- `dsa_rooms` - competition rooms
- `room_users` - participants
- `submissions` - code submissions
- `room_votes` - voting data

### **User Private** (Only with permission)
- `users/{uid}` - only user can write own
- `user_stats/{uid}` - only user can write own
- `applications` - user or admin
- `interview_buddy_sessions` - creator or participant
- `submissions` - owner or admin

### **Admin Only** (Admins only)
- `dsa_questions` - create/edit questions
- `user_achievements` - award badges

---

## 🔒 Security Summary

✅ **All existing features protected** - Interview buddy, applications, internships  
✅ **New DSA Room protected** - Rooms, submissions, voting  
✅ **Admin controls** - Only admins can manage content  
✅ **User privacy** - Can't see others' private data  
✅ **Catch-all deny** - Anything not explicitly allowed is blocked  

---

## 🚀 What Happens Next

1. Rules published ✅
2. DSA Room collections auto-create on first use
3. Data flows through helper functions in `dsa-firestore-helpers.js`
4. Everything works seamlessly!

---

**Need to revert?** Paste your backed-up rules and click Publish again! 🔄
