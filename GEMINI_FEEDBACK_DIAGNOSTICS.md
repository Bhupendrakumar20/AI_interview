# Gemini Feedback Generation - Diagnostic Guide

## Problem Identified

The feedback shown in Recent Sessions may be using **fallback data** instead of actual Gemini AI responses. The feedback categories shown in your screenshot don't match the expected schema.

### What We Expect vs What You're Seeing

**Expected Gemini Feedback Schema:**
- Communication Skills
- Technical Knowledge  
- Problem Solving
- Cultural Fit
- Confidence and Clarity

**What's Shown in Screenshot:**
- Technical Correctness
- Clarity
- Communication
- Confidence
- Pacing

⚠️ **This mismatch suggests Fallback Data is being used!**

---

## How to Test if Gemini is Working

### Option 1: Use Diagnostic Endpoint (RECOMMENDED)

**Step 1:** Navigate to this URL in your browser:
```
http://localhost:3000/api/debug/feedback-test
```

Or if deployed:
```
https://your-deployed-url.vercel.app/api/debug/feedback-test
```

**Step 2:** Look at the JSON response:

✅ **If Gemini is Working:**
```json
{
  "success": true,
  "isFallback": false,
  "geminiCalled": true,
  "totalScore": <some number between 0-100>,
  "categoryScores": [
    {
      "name": "Communication Skills",
      "score": ...,
      "comment": "..."
    },
    ...
  ],
  "recommendation": "✅ Gemini API is working correctly"
}
```

❌ **If Using Fallback:**
```json
{
  "success": true,
  "isFallback": true,
  "geminiCalled": false,
  "totalScore": 72,
  "categoryScores": {...},
  "recommendation": "⚠️ Using FALLBACK data. Check API key and Gemini quotas"
}
```

**Key Indicator:** If `totalScore` is always **72**, it's using fallback data (hardcoded default).

---

### Option 2: Check Browser Console

**Step 1:** Go to `/interview` route and complete an interview

**Step 2:** Open Developer Tools (F12)

**Step 3:** Go to **Console** tab and look for logs:

✅ **Gemini Working:**
```
✅ [createFeedback] Gemini API call successful
  - Total Score: 85
  - Category Scores: 5 items
  - Category First Name: Communication Skills
```

❌ **Using Fallback:**
```
❌ [createFeedback] API call failed: <error message>
⚠️ [createFeedback] Using fallback feedback due to API error
✅ [createFeedback] Feedback cached (but from fallback!)
```

---

### Option 3: Check Server Logs

If running locally with `npm run dev`:

✅ **Gemini Working:**
```
🤖 [createFeedback] Calling Gemini API...
  - Model: gemini-2.0-flash
  - Structured outputs: enabled
✅ [createFeedback] Gemini API call successful
  - Total Score: 85
  - Category Scores: 5 items
  - Category First Name: Communication Skills
```

❌ **Using Fallback:**
```
🤖 [createFeedback] Calling Gemini API...
❌ [createFeedback] API call failed: 401 Unauthorized
⚠️ [createFeedback] Using fallback feedback due to API error
```

---

## Fixing the Issue

If you find that Gemini is NOT working, follow these steps:

### 1. Verify API Key is Set

Check that `GOOGLE_GENERATIVE_AI_API_KEY` is in `.env.local`:

```bash
cat .env.local | grep GOOGLE_GENERATIVE_AI_API_KEY
```

Should output:
```
GOOGLE_GENERATIVE_AI_API_KEY=sk_...your_key...
```

If not set or blank, [get a free API key](https://aistudio.google.com/app/apikey):
1. Go to https://aistudio.google.com/
2. Click "Get API key"
3. Create a new API key
4. Copy the key
5. Add to `.env.local`: `GOOGLE_GENERATIVE_AI_API_KEY=sk_...`

### 2. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### 3. Check API Key Validity

Navigate to:
```
http://localhost:3000/api/debug/check-gemini-key
```

✅ **Working:**
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

❌ **Not Working:**
```json
{
  "success": false,
  "error": "...",
  "suggestion": "..."
}
```

### 4. Check API Quotas

Gemini has rate limits on free tier:
- 15 requests per minute
- 1 million tokens per month

If quota exceeded:
- Wait a minute before trying again
- Or [upgrade your plan](https://aistudio.google.com/app/billingcenter)

### 5. Check Firestore Rules

Feedback is saved to Firebase `feedback` collection. Make sure Firestore security rules allow writes:

```
match /feedback/{document=**} {
  allow write: if request.auth != null;
  allow read: if resource.data.userId == request.auth.uid;
}
```

---

## Understanding the Feedback Structure

### Fallback Data (Current - Score 72%)
```json
{
  "totalScore": 72,
  "categoryScores": {
    "communicationSkills": 72,
    "technicalKnowledge": 68,
    "problemSolving": 75,
    "culturalFit": 70,
    "confidenceClarity": 73
  },
  "strengths": [...],
  "areasForImprovement": [...]
}
```

### Gemini Data (Expected - Correct Schema)
```json
{
  "totalScore": 85,
  "categoryScores": [
    {
      "name": "Communication Skills",
      "score": 85,
      "comment": "Clear and concise explanations"
    },
    {
      "name": "Technical Knowledge",
      "score": 90,
      "comment": "Strong understanding of DSA"
    },
    ...
  ],
  "strengths": [...],
  "areasForImprovement": [...]
}
```

---

## Action Items

1. ✅ Go to `/api/debug/feedback-test`
2. ✅ Check if `"isFallback": true` or `false`
3. ✅ If fallback, check `/api/debug/check-gemini-key`
4. ✅ If API key issue, add key to `.env.local`
5. ✅ Restart dev server
6. ✅ Try test again
7. ✅ Complete a new interview and check feedback

---

## Still Having Issues?

Check these logs in browser F12 console:

```javascript
// Run this in browser console
console.log("Checking for feedback logs...");
// Look for any lines starting with:
// - "🤖 [createFeedback]"
// - "✅ [createFeedback]"  
// - "❌ [createFeedback]"
// - "⚠️ [createFeedback]"
```

Copy those logs and they will help diagnose the issue.
