# ⚡ Quick Setup - Just Copy & Paste

## 🚀 30-Second Setup

### **1. Go Here:**
```
Firebase Console 
  → Firestore Database 
    → Rules tab
```

### **2. Copy This:**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Interview Buddy Sessions
    match /interview_buddy_sessions/{sessionId} {
      allow create: if request.auth != null;
      
      allow read: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.uid in resource.data.participants);
      
      allow update: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
      
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### **3. Paste it:**
- **Delete everything** in the Rules editor
- **Paste the code above**

### **4. Publish:**
- Click blue **Publish** button
- Wait for ✅ green checkmark (30 seconds)

### **5. Done!** 🎉

---

## 🤖 Indexes (Auto-Created)

When you first use the app, if you get an error like:
```
Missing composite index for query
```

Just click the link in the error → Firebase creates it automatically.

Or manually create these 2 indexes:

**Index 1:**
- Collection: `interview_buddy_sessions`
- Field 1: `participants` ↑ (Ascending)
- Field 2: `createdAt` ↓ (Descending)

**Index 2:**
- Collection: `interview_buddy_sessions`
- Field: `sessionCode` ↑ (Ascending)

---

That's literally it! Your app is now **protected**. ✅
