# Troubleshooting Guide: Speech Recognition & Feedback

## Issue 1: Speech Recognition Not Working

### Symptoms
- Microphone button doesn't activate
- "Listening..." message doesn't appear
- Voice input is not transcribed
- Console shows "Speech recognition is not supported"

### Quick Checks

**1. Browser Compatibility**
- Speech Recognition API only works in: Chrome, Edge, Opera, Safari (Safari 14.1+)
- NOT supported in Firefox
- Solution: Use Chrome or Edge

**2. HTTPS Required**
- Speech Recognition API requires HTTPS
- Local development on http://localhost is allowed
- Production MUST use HTTPS
- Solution: Deploy to HTTPS or test locally

**3. Microphone Permissions**
- Browser must have microphone permission granted
- Check browser settings > Privacy > Microphone
- Click the lock icon next to URL bar and enable microphone
- Solution: Grant microphone access in browser

**4. Microphone Hardware**
- Check if microphone is connected and working
- Test in other apps first
- Volume should not be muted
- Solution: Test microphone in Windows Settings

### Advanced Debugging

Check browser console for detailed errors:

```
🎤 [Speech Recognition] Initializing...
✅ [Speech Recognition] Started
📝 [Speech Recognition] Got X results
```

If you see errors like:
- `no-speech`: No sound detected - speak louder or closer to mic
- `audio-capture`: Microphone not found - check hardware
- `not-allowed`: Permission denied - allow in browser settings
- `network`: Connection issue - check internet

### Enable Debug Logging
Add this to browser console to test:
```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  console.log("❌ Speech Recognition not supported");
} else {
  console.log("✅ Speech Recognition supported");
  const recognition = new SpeechRecognition();
  recognition.start();
}
```

---

## Issue 2: Feedback Not Generated After Interview

### Symptoms
- Interview finishes but feedback page shows loading
- No error message but feedback doesn't load
- Interview results are not saved
- Redirects back to home instead of showing feedback

### Quick Checks

**1. Verify Gemini API Key**

Go to: `http://localhost:3000/api/debug/check-gemini-key` (or your production URL)

Should see response like:
```json
{
  "success": true,
  "checks": {
    "apiKeyExists": true,
    "apiKeyConfigured": true,
    "apiKeyValid": true,
    "geminiResponse": "Gemini API is working"
  }
}
```

If failing, check environment variables.

**2. Check Environment Variables**

In your `.env.local` file:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
```

Make sure:
- API key is not empty
- No extra spaces or quotes
- Key is valid from Google AI Studio
- Not shared publicly in GitHub

**3. Check API Quota**

Go to Google AI Studio (https://aistudio.google.com/)
- Check "API Usage" in settings
- Verify you haven't exceeded quota
- Free tier has limits - upgrade if needed

**4. Check Firebase Connection**

Feedback is saved to Firestore. Check:
- Firebase is initialized in your app
- Firestore collection "feedback" exists
- Security rules allow writes
- User authentication is working

### Enable Debug Logging

Browser console will show:
```
🏁 [Interview] Finishing interview...
📊 Total questions: 3
✅ Answered: 3

📝 [Interview] Calling createFeedback with:
  - interviewId: xxx
  - userId: xxx
  - transcript items: 6

🤖 [createFeedback] Calling Gemini API...

✅ [createFeedback] Gemini API call successful
  - Total Score: 75
  - Category Scores: 5 items

💾 [createFeedback] Saving to Firebase...
✅ [createFeedback] Successfully saved feedback
```

---

## Issue 3: Gemini API Key Not Working

### Verify API Key

**Step 1: Get API Key**
1. Go to https://aistudio.google.com/
2. Click "Get API key"
3. Create new API key for your project
4. Copy the key

**Step 2: Set Environment Variable**
1. Create `.env.local` file in root directory
2. Add: `GOOGLE_GENERATIVE_AI_API_KEY=your_key_here`
3. Save and restart dev server
4. Test with `/api/debug/check-gemini-key`

**Step 3: Check for Common Issues**

❌ **Problem**: API key is empty
- Solution: Verify key is actually in `.env.local`

❌ **Problem**: API key is invalid or expired
- Solution: Generate new key from Google AI Studio

❌ **Problem**: API quota exceeded
- Solution: Upgrade plan or wait for monthly reset

❌ **Problem**: API key leaked in GitHub
- Solution: Regenerate key immediately

**Step 4: Production Deployment**

For Vercel/production:
1. Go to project settings
2. Environment Variables
3. Add `GOOGLE_GENERATIVE_AI_API_KEY`
4. Redeploy

---

## Complete Debugging Checklist

### Speech Recognition
- [ ] Using Chrome/Edge/Opera/Safari (NOT Firefox)
- [ ] On HTTPS or localhost (not other HTTP)
- [ ] Granted microphone permission
- [ ] Microphone is connected and working
- [ ] Browser console shows "✅ [Speech Recognition] Started"
- [ ] Can see transcript updating in textarea

### Feedback Generation
- [ ] API key is set in `.env.local`
- [ ] `http://localhost:3000/api/debug/check-gemini-key` returns success
- [ ] Firebase is initialized
- [ ] User is authenticated
- [ ] Firestore rules allow "feedback" collection writes
- [ ] Browser console shows "✅ [createFeedback] Successfully saved feedback"
- [ ] Can see results/feedback page after interview

### General
- [ ] No errors in browser console (F12)
- [ ] No errors in server terminal
- [ ] Internet connection is stable
- [ ] Page is fully loaded (no spinner)
- [ ] Database credentials are correct

---

## How to Test Each Component

### Test Speech Recognition
```javascript
// In browser console
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = new SpeechRecognition();
rec.onstart = () => console.log("Started");
rec.onresult = (e) => console.log(e.results[0][0].transcript);
rec.start();
```

### Test Gemini API
```bash
# In terminal
curl http://localhost:3000/api/debug/check-gemini-key
```

### Test Feedback Generation
Go to `/interview` route and complete a mock interview, watch console for logs.

---

## Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Speech recognition is not supported" | Browser doesn't support Web Speech API | Use Chrome/Edge/Safari |
| "no-speech" | Microphone not capturing audio | Speak louder or closer to mic |
| "not-allowed" | Permission denied | Allow microphone in browser settings |
| "GOOGLE_GENERATIVE_AI_API_KEY is not configured" | Missing API key | Add to `.env.local` |
| "API quota exceeded" | Used up free tier limit | Upgrade Google AI plan |
| "Failed to save feedback" | Firebase write failed | Check Firestore security rules |
| "Feedback generation failed" | Gemini API error | Check API key validity |

---

## Still Having Issues?

### Collect Debug Info

1. Open browser console (F12)
2. Go to `/interview` and start interview
3. Look for messages starting with:
   - 🎤 (Speech Recognition)
   - 🏁 (Interview)
   - 🤖 (Gemini API)
   - ✅ (Success) or ❌ (Error)

4. Take screenshot of console output
5. Note the exact error message

### Check Logs

**Browser Logs**:
- F12 > Console tab
- Look for red errors or warning messages

**Server Logs**:
- Terminal running `npm run dev`
- Look for errors related to Gemini or Firebase

### Contact Support

Include:
- Screenshot of browser console
- Server terminal output
- API key status (is it set?)
- Network errors (if any)
- Browser type and version
