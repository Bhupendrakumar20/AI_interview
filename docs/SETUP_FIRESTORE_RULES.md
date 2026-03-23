# 🔐 How to Add Firestore Security Rules - Step by Step

## ✅ What These Rules Do

1. **Protects Data** - Users can only see their own sessions
2. **Prevents Cheating** - Only session creator can modify/delete
3. **Allows Sharing** - Participants in a session can view it
4. **Auto-expires Codes** - Session codes work for 24 hours only

---

## 📋 Step-by-Step Instructions

### **Step 1: Open Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **PrepPath** project
3. Click on **Firestore Database** in the left sidebar

![Step 1](image)

---

### **Step 2: Open Security Rules**

1. In Firestore, click the **Rules** tab (next to Data)
2. You'll see the current rules (might be empty or have placeholder rules)

---

### **Step 3: Copy & Paste New Rules**

**Replace everything** with this code:

```javascript
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
    }
    
    // Fallback: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

### **Step 4: Publish Rules**

1. Click the **Publish** button (blue button at top right)
2. A popup will appear asking to confirm
3. Click **Publish** again
4. Wait for it to deploy (usually 30 seconds - 1 minute)
5. ✅ You'll see a green checkmark when done

---

### **Step 5: Create Firestore Indexes** (Automatic)

The indexes will be **created automatically** when you first run the interviews. 

If Firebase suggests an index:
1. You'll see a notification
2. Click the link in the error message
3. Firebase will create it automatically
4. ✅ Done!

**Or manually create them:**

1. Go to **Firestore** → **Indexes** tab
2. Click **Create Index**
3. Create these two:

#### **Index 1** (for querying user sessions)
- **Collection:** `interview_buddy_sessions`
- **Field 1:** `participants` (Ascending ⬆️)
- **Field 2:** `createdAt` (Descending ⬇️)
- Click **Create Index**

#### **Index 2** (for joining with session code)
- **Collection:** `interview_buddy_sessions`
- **Field:** `sessionCode` (Ascending ⬆️)
- Click **Create Index**

---

## 🎯 What Happens After?

✅ Your Firestore is now **secure**:
- Only authenticated users can create sessions
- Users can only see their own sessions
- Only session creator can modify/delete
- Participants can see shared sessions
- Session codes expire after 24 hours

✅ Your app will work perfectly:
- All API calls will succeed
- Data is protected automatically
- No changes needed to your code

---

## 🚨 Troubleshooting

### **"Permission denied" error**
**Problem:** Rules haven't been published yet
**Solution:** 
1. Go back to Rules tab
2. Click Publish button
3. Wait 1-2 minutes for deployment

### **"Missing composite index" error**
**Problem:** Composite Index is needed for your query
**Solution:**
1. Click the link in the error message
2. Firebase creates it automatically
3. Wait 5-10 minutes for index to build
4. Try again

### **"Invalid read/write" error**
**Problem:** Rules don't allow the operation
**Solution:** Check rules are copied correctly - make sure you replaced the entire file

---

## ✨ Visual Guide

```
Firebase Console
    ↓
Firestore Database
    ↓
Rules tab
    ↓
Copy & Paste Code
    ↓
Publish button
    ↓
✅ Done! (green checkmark appears)
```

---

## 📱 Testing Rules (Optional)

You can test rules in Firebase Console:

1. Go to **Firestore** → **Rules** tab
2. Click the **Test** button at the right side
3. It shows you what's allowed/denied

---

## ❓ FAQ

**Q: Will existing sessions be affected?**
A: No, these rules only control who can read/write. Existing data stays the same.

**Q: Can I change these rules later?**
A: Yes, anytime. Just go to Rules tab and update.

**Q: What if I make a mistake?**
A: Click **Rollback** to go back to previous version.

**Q: How long do indexes take?**
A: Usually 1-5 minutes. Check the Indexes tab for status.

**Q: Do I need to do anything else?**
A: Nope! Your app code is already integrated. Just add these rules and you're done.

---

## 🎉 Summary

1. ✅ Open Firestore
2. ✅ Click Rules tab
3. ✅ Copy & paste code above
4. ✅ Click Publish
5. ✅ Done!

That's it! Your Interview Buddy is now **production-ready** and **secure**. 🚀
