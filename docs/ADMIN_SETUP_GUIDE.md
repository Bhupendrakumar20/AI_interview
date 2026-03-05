# Admin Setup & Login Guide

## Overview
This document explains how to create admin users and set up admin access in your AI Interview platform.

---

## Method 1: Using the createAdmin.js Script (Recommended)

### Step 1: Create Admin User via Script

Run the createAdmin.js script from your terminal:

```bash
node scripts/createAdmin.js
```

This script will:
- Create an admin user in Firebase Authentication
- Set custom claims for admin role (super_admin, admin permissions)
- Create admin profile in Firestore
- Set up admin settings and activity logs
- Configure initial permissions

**Default Admin Credentials:**
- **Email:** admin@careerlens.ai
- **Password:** Admin@1234
- **Role:** Super Admin (full access)

### Step 2: Login as Admin

1. Navigate to: `http://localhost:3000/admin/login`
2. Enter the admin credentials:
   - Email: `admin@careerlens.ai`
   - Password: `Admin@1234`
3. Click "Sign In"
4. You'll be redirected to the admin dashboard at `/admin`

---

## Method 2: Using the Admin Panel (Manage Existing Users)

### Convert Regular User to Admin:

1. **Login as existing admin**
2. Go to `/admin/users`
3. Find the user you want to promote
4. Click on their profile
5. Change their role to "admin" or "super_admin"
6. Save changes

This will:
- Update Firebase Auth custom claims
- Update Firestore user document
- Log the action in admin_logs collection

---

## Method 3: Manual Firebase Console Setup

If you prefer using Firebase Console directly:

### Step 1: Create User in Firebase Auth
- Go to Firebase Console
- Navigate to Authentication → Users
- Click "Create user"
- Email: your-admin@example.com
- Password: Your secure password

### Step 2: Set Custom Claims
- Use Firebase Admin SDK or your Node.js environment
- Run this code:

```javascript
const admin = require('firebase-admin');

const userId = 'user-id-here';
await admin.auth().setCustomUserClaims(userId, {
  admin: true,
  super_admin: true,
  role: 'super_admin',
  permissions: ['*']
});

console.log('Admin claims set');
```

### Step 3: Create User Profile in Firestore
- Go to Firestore Database
- Collection: `users`
- Create document with ID: `{userId}`
- Add fields:
```json
{
  "id": "user-id",
  "userId": "user-id",
  "name": "Admin Name",
  "email": "admin@example.com",
  "role": "super_admin",
  "permissions": [
    "create:any",
    "read:any",
    "update:any",
    "delete:any",
    "manage:users",
    "manage:roles",
    "manage:content",
    "manage:settings"
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Admin Features Available

Once logged in as admin, you have access to:

### 1. **User Management** (`/admin/users`)
- View all platform users
- Search and filter users
- Update user roles and permissions
- Disable/enable user accounts
- View user activity and metadata

### 2. **Role Management**
- Assign admin roles to users
- Manage permissions for different roles
- View role assignments

### 3. **Admin Actions** (Available via Admin Actions)
```javascript
// All available admin functions:
- isAdmin(userId)              // Check if user is admin
- getAllUsers(params)          // Fetch all users with pagination
- getUserById(userId)          // Get specific user details
- updateUserRole(userId, roles) // Update user role/permissions
```

---

## Key Functions in admin.action.js

```javascript
// Check if user is admin
const isAdmin = await isAdmin(userId);

// Get all users with pagination
const { users, pagination } = await getAllUsers({ 
  page: 1, 
  limit: 50, 
  search: "email@example.com",
  role: "admin" 
});

// Get specific user details
const userDetails = await getUserById(userId);

// Update user role
const result = await updateUserRole(userId, {
  role: 'admin',
  permissions: ['manage:users', 'manage:content'],
  notes: 'Promoted to admin'
});
```

---

## Authentication Flow

### Admin Login Flow:
1. User enters email/password on `/admin/login`
2. Firebase validates credentials via `signInWithEmailAndPassword()`
3. `getIdToken()` fetches user's ID token
4. Token is sent to `/api/auth/admin-verify` endpoint
5. Server verifies token and checks admin claims
6. If admin claims exist, user is granted access
7. User is redirected to `/admin` dashboard

### Session Management:
- Session cookies are created with 1 week duration
- Secure, httpOnly cookies prevent XSS attacks
- Automatic timeout after 7 days
- Manual logout clears session

---

## Changing Admin Credentials

### Option 1: Via Firebase Console
1. Go to Authentication → Users
2. Find admin user
3. Click "..." menu → Edit password
4. Set new password

### Option 2: Via admin.action.js
```javascript
// You can create a new admin delete/create function
// Then use Firebase Admin SDK to reset password
```

---

## Testing Admin Access

### Test if your admin setup works:

```javascript
import { isAdmin } from '@/lib/actions/admin.action';

// In your component or page
const adminStatus = await isAdmin('admin_user_id');
console.log('Is admin:', adminStatus); // Should be true
```

---

## Troubleshooting

### Issue: "Access denied. Admin privileges required."
**Solution:** 
- Check that user has `admin` or `super_admin` custom claims in Firebase Auth
- Verify user role in Firestore users collection
- Ensure `/api/auth/admin-verify` endpoint is properly created

### Issue: Login page redirects to home instead of admin dashboard
**Solution:**
- Verify admin claims are set correctly
- Check admin-verify API response
- Check browser console for error messages

### Issue: getIdToken() returns null
**Solution:**
- Ensure Firebase client is properly initialized
- Check Firebase credentials in `.env.local`
- Verify user email is verified in Firebase Console

### Issue: Custom claims not applying
**Solution:**
- Custom claims require user to sign out and back in
- Clear browser cookies and try again
- Verify claims were set correctly via Firebase Console

---

## Next Steps

1. **Run the script:** `node scripts/createAdmin.js`
2. **Visit admin panel:** `http://localhost:3000/admin/login`
3. **Login with default credentials**
4. **Start managing users and platform!**

---

## Security Notes

⚠️ **Important:**
- Change default admin password immediately after first login
- Never share admin credentials
- Use strong passwords (minimum 8 characters)
- Enable 2FA if available
- Regularly audit admin_logs collection
- Limit number of super_admin accounts
- Review user permissions quarterly

---

## Created/Updated Files

- ✅ `/app/api/auth/admin-verify/route.js` - Admin verification API endpoint
- ✅ `/scripts/createAdmin.js` - Admin user creation script
- ✅ `/app/admin/login/page.jsx` - Admin login interface

All systems are now ready for admin usage!
