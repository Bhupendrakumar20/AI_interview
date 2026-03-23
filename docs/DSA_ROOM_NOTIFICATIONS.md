# DSA Room Notification System Setup Guide

## Email Notifications for Join Requests

The DSA room now supports email notifications for:
- ✉️ User A receives email when User B requests to join their room
- ✉️ User B receives email when approved or rejected
- 🔔 Notification badge in TopBar showing pending approvals

## Environment Variables Required

Add the following to your `.env.local` file:

```env
# Email Service Configuration
EMAIL_SERVICE=gmail                    # or your email service provider
EMAIL_USER=your-email@gmail.com        # Your email address
EMAIL_PASSWORD=your-app-password       # Gmail App Password (not regular password)

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your domain in production
```

## Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate App Password**:
   - Go to Google Account → Security
   - Find "App passwords" section
   - Select "Mail" and "Windows Computer" (or your device)
   - Copy the generated 16-character password
3. **Use the generated password** in `EMAIL_PASSWORD` environment variable

## Features Implemented

### 1. **Email Notifications**
- When User B requests to join: User A gets email + toast notification
- When User B approved: User B gets email + socket notification
- When User B rejected: User B gets email + socket notification

### 2. **Notification Badge (TopBar)**
- Shows count of pending join requests
- Clickable to navigate to DSA room
- Updates in real-time via socket.io
- Persists via localStorage

### 3. **Leaderboard Display**
- Shows approved members with points
- Shows "⏳ Pending" section for users waiting for approval
- Includes request timestamp
- Orange indicator for pending status

### 4. **User Experience**
- "Waiting for Approval" screen shows helpful info
- Real-time status indicator (orange pulsing dot)
- Clear next steps ("Owner receives notification", "You'll get email", etc.)
- "Cancel Request" button available

## Testing

### Email Not Configured?
If `EMAIL_USER` or `EMAIL_PASSWORD` are not set:
- Emails will be skipped (logged to console)
- Socket notifications will still work
- All UI features remain functional

### Toggle Email On/Off
To test without sending real emails:
1. Leave `EMAIL_USER` and `EMAIL_PASSWORD` empty
2. Check console for email logs
3. All socket notifications will still trigger

## API Endpoint

**POST** `/api/dsa-room/send-notification`

Request body:
```json
{
  "type": "join_request" | "join_approved" | "join_rejected",
  "requesterName": "User B Name",
  "requesterEmail": "userb@example.com",
  "roomOwnerName": "User A Name",
  "roomOwnerEmail": "usera@example.com",
  "roomCode": "ABCDE"
}
```

## Database Schema Updates

The notification system uses existing storage:
- `rooms` collection: `pendingRequests` array tracks join requests
- Socket events: `member_request`, `join_approved`, `join_rejected`, `room_notification`
- localStorage: `dsaPendingCount` for TopBar badge

No database migrations required!

## Troubleshooting

**Emails not sending?**
- Check `.env.local` has `EMAIL_USER` and `EMAIL_PASSWORD`
- Gmail: Use App Password (not account password)
- Check console logs for email errors

**Notification badge not showing?**
- Reload page to sync localStorage with socket state
- Check browser console for socket.io errors
- Ensure user is room owner

**Pending approvals not showing in leaderboard?**
- Make sure socket connection is active
- Check that `members_list` event is being received
- Verify `pendingApprovals` state is being set
