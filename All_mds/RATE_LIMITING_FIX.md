# 429 TooManyRequests Fix - Rate Limiting & Exponential Backoff

## Problem Diagnosed

Your Google Cloud metrics showed **429 TooManyRequests errors on Apr 28**, meaning:
- ❌ Hitting **free tier rate limit: 15 requests/minute**
- ❌ All concurrent feedback requests exceeding quota
- ❌ System falling back to hardcoded feedback (score 72%)

---

## Solution Implemented

### 1. **Rate Limiter** (`lib/rate-limiter.js`)
- ✅ Spaces out API calls to **1 every 4 seconds** (15 per minute max)
- ✅ Queues requests for **sequential processing** (not concurrent)
- ✅ Implements **exponential backoff**: 1s → 2s → 4s for retries
- ✅ Detects 429 errors and automatically retries with delays
- ✅ Distinguishes between quota errors (stop) vs rate limit errors (retry)

### 2. **Token Optimization**
- ✅ Reduced feedback prompt from ~800 tokens to ~200 tokens (75% reduction)
- ✅ Kept all critical evaluation criteria
- ✅ Fewer tokens = fewer API calls = less likely to hit quota

### 3. **Integrated Rate Limiting**
- ✅ Updated `generateObjectWithFallback()` to use rate limiter
- ✅ Updated `generateTextWithFallback()` to use rate limiter
- ✅ All API calls now wrapped with rate limiting + retry logic

---

## How It Works

### Before (❌ Problem)
```
Request 1: Interview feedback (immediately)
Request 2: Interview feedback (immediately) → 429 ERROR!
Request 3: Interview feedback (immediately) → 429 ERROR!
...falls back to hardcoded score 72%
```

### After (✅ Solution)
```
Request 1: Interview feedback (time: 0s)   → Success ✅
Request 2: Interview feedback (time: 4s)   → Wait 4s, then send → Success ✅
Request 3: Interview feedback (time: 8s)   → Wait 4s, then send → Success ✅
...actual Gemini scores now returned!
```

### Retry Logic with Exponential Backoff
```
Attempt 1: Send request
  ↓ Gets 429 error
Attempt 2: Wait 1 second, retry
  ↓ Gets 429 error  
Attempt 3: Wait 2 seconds, retry
  ↓ Gets 429 error
Attempt 4: Wait 4 seconds, retry
  ↓ Success ✅ (or throw error after max retries)
```

---

## Testing the Fix

### 1. **Verify Rate Limiting is Working**

Monitor browser console (F12) during interview:

✅ **Expected output (Rate Limited):**
```
🤖 Trying model: gemini-2.0-flash with structured outputs...
⏳ [RateLimiter] Waiting 4000ms to respect rate limit...
🚀 [RateLimiter] Executing generateObject(gemini-2.0-flash, structured=true) (attempt 1/4)
✅ [RateLimiter] Success on attempt 1
✅ Success with model: gemini-2.0-flash
✅ [createFeedback] Gemini API call successful
  - Total Score: 85
  - Category Scores: 5 items
```

⚠️ **If 429 Happens (Exponential Backoff):**
```
⚠️ [RateLimiter] Rate limited (429). Retrying in 1000ms... (attempt 1/3)
⏳ [RateLimiter] Waiting 4000ms to respect rate limit...
🚀 [RateLimiter] Executing ... (attempt 2/4)
✅ [RateLimiter] Success on attempt 2
```

### 2. **Check Recent Sessions Scores**

Go to `/interview/buddy` and check Recent Sessions:

✅ **Rate Limiting Working:**
- Scores vary: 65%, 78%, 85%, 72%, 80% (NOT all 72%)
- New scores appear after 4-5 seconds (rate limit pause)
- No 429 errors in console

❌ **Still Having Issues:**
- All scores showing 72% = using fallback
- Console shows: "API quota exceeded after 3 retries"
- Need to upgrade Google AI plan

### 3. **Use Diagnostic Endpoint**

Still navigate to:
```
http://localhost:3000/api/debug/feedback-test
```

Expected response:
```json
{
  "success": true,
  "isFallback": false,
  "geminiCalled": true,
  "totalScore": 85,
  "recommendation": "✅ Gemini API is working correctly"
}
```

---

## What Changed in Code

### New File: `lib/rate-limiter.js`
- `RateLimiter` class: Manages queue, spacing, backoff
- `getRateLimiter()`: Global instance
- `withRateLimit(fn, name)`: Execute function with rate limiting

### Updated: `lib/actions/general.action.js`
- `generateObjectWithFallback()`: Now uses `withRateLimit()`
- `generateTextWithFallback()`: Now uses `withRateLimit()`
- Feedback prompt: Reduced from ~800 tokens to ~200 tokens
- Error handling: Specific messages for 429 vs quota errors

---

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| API Requests/Minute | Unlimited (hits limit) | Limited to 15 (safe) |
| 429 Errors | High spike | Zero (or handled with backoff) |
| Feedback Score | All 72% (fallback) | Varied (real Gemini) |
| Request Processing | Concurrent (crashes) | Sequential (safe) |
| Token Usage | ~800 per request | ~200 per request |
| Retries | Failed immediately | Exponential backoff |

---

## Next Steps

1. ✅ Build should compile successfully (new file + updates)
2. ✅ Start dev server: `npm run dev`
3. ✅ Complete an interview
4. ✅ Check console for rate limiter logs
5. ✅ Verify feedback score is NOT 72%
6. ✅ Test `/api/debug/feedback-test` endpoint
7. ✅ Monitor Recent Sessions for varied scores

---

## If Still Getting 429 Errors

### Option 1: Upgrade Google AI Plan
- Free tier: 15 requests/minute
- Paid tier: Much higher limits
- [Upgrade here](https://ai.google.dev/pricing)

### Option 2: Reduce API Calls
- Cache feedback more aggressively
- Batch multiple questions into single request
- Use smaller prompts (already done - 75% reduction)

### Option 3: Implement Smart Caching
- Check if similar transcript already cached
- Reuse feedback for identical interviews
- Only call API for new unique transcripts

---

## System Architecture (Updated)

```
Interview Complete
    ↓
createFeedback() called
    ↓
Check cache (getCachedData)
    ├─ If cached: Return cached feedback
    └─ If not cached: Call API
        ↓
    withRateLimit() wrapper
        ↓
    [Queue management]
    [Rate limiting: wait if needed]
    [Exponential backoff on error]
        ↓
    generateObject() with Gemini API
        ↓
    Get real feedback with actual score
        ↓
    Cache result
    ↓
    Save to Firebase
    ↓
    Return to client
```

---

## Monitoring

Watch these metrics in Google Cloud:
1. **Total API Requests** - Should stay below 15/minute peak
2. **Total API Errors** - Should show zero or minimal 429 errors
3. **Success Rate** - Should trend toward 100%
4. **Output Tokens** - Should now show data (was blank before)

---

## Summary

**What you're getting:**
- ✅ Real Gemini feedback instead of hardcoded 72%
- ✅ Automatic rate limiting (1 request every 4 seconds)
- ✅ Automatic exponential backoff on errors
- ✅ Sequential request processing (safer)
- ✅ 75% token reduction (costs less)
- ✅ Proper error detection and messaging
