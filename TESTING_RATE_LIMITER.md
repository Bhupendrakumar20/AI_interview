# Quick Start: Test Model-Aware Rate Limiter

## 1. Start Development Server

```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 16.1.0
  - Local:        http://localhost:3000
  - Environments: .env.local
```

---

## 2. Check Model Configuration

Open browser or use curl:

```bash
curl http://localhost:3000/api/debug/model-info
```

**What to verify:**
- ✅ Model shows "Gemini 1.5 Flash"
- ✅ Global RPM shows "15"
- ✅ Max users shows "25"
- ✅ Per-user shows "0.60" requests/minute

---

## 3. Test Single User Feedback

Open browser console and run:

```javascript
// Test creating feedback
fetch('/api/interview-buddy/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user-1',
    mode: 'ai-buddy',
    interviewTopic: 'JavaScript Fundamentals'
  })
})
.then(r => r.json())
.then(d => console.log('Session created:', d));
```

**What to expect:**
- ✅ Session created in ~2 seconds
- ✅ `sessionId` returned
- ✅ Status shows "not-started"

---

## 4. Run Feedback Generation

After recording an answer:

```javascript
// Generate feedback (replace with real sessionId)
fetch('/api/interview-buddy/sessions/SESSION_ID/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user-1',
    transcript: 'Here is my answer about JavaScript fundamentals...'
  })
})
.then(r => r.json())
.then(d => console.log('Feedback:', d));
```

**What to expect:**
- ✅ First request waits ~6-9 seconds
- ✅ Console shows rate limiter logs: `[RateLimiter]`
- ✅ Feedback score varies (NOT 72)
- ✅ Feedback categories present

---

## 5. Test Multi-User Scenario

Open 3 browser tabs (simulate 3 users):

**Tab 1:**
```javascript
userId = 'user-1';
// Start interview
```

**Tab 2:**
```javascript
userId = 'user-2';
// Start interview at same time
```

**Tab 3:**
```javascript
userId = 'user-3';
// Start interview at same time
```

All click "Generate Feedback" at same time.

**What to expect:**
- ✅ All 3 complete successfully
- ✅ User 1: Completes at ~6-9s
- ✅ User 2: Completes at ~10-13s (waits for user 1)
- ✅ User 3: Completes at ~14-17s (waits for users 1 & 2)
- ✅ Console shows sequential processing

---

## 6. Monitor Active Users

While feedback generating, open in another tab:

```
http://localhost:3000/api/debug/model-info
```

**What to expect:**
- ✅ `activeUsers: 3` (or however many are running)
- ✅ Each user listed with `queueLength: X`
- ✅ `isProcessing: true` for active user

---

## 7. Check Console Logs

Server console should show:

```
[RateLimiter] ✓ Request executed (waited 4001ms)
[RateLimiter] 📊 User user-1: queueLength=0, nextRequestIn=4000ms
[PerUserRateLimiter] 👤 Managing 25 concurrent users
[PerUserRateLimiter] Per user: 0.60 requests/minute
```

---

## 8. Verify No 429 Errors

Check server logs for errors:

```
❌ SHOULD NOT SEE:
429 TooManyRequests
Rate limit exceeded

✅ SHOULD SEE:
✓ Request executed
📊 User tracking
```

---

## 9. Test Fallback Detection

If feedback score is **72%**, system using fallback:

```javascript
// Check if using fallback
const feedback = response.feedback;
if (feedback.totalScore === 72) {
  console.log('⚠️ Using fallback (API failed)');
  // Check:
  // 1. Gemini API key valid? (/api/debug/check-gemini-key)
  // 2. Rate limiter working? (Check console logs)
  // 3. API quota exceeded? (Check Google Cloud console)
}
```

---

## 10. Load Test (25 Users)

For production testing:

### Option A: Use Apache Bench
```bash
# Install Apache Bench
# Windows: choco install apache-bench
# Mac: brew install httpd

# Test 25 concurrent requests
ab -c 25 -n 100 http://localhost:3000/api/debug/feedback-test
```

### Option B: Use Node.js Script
Create `load-test.js`:

```javascript
const http = require('http');

async function makeRequest(userId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      userId: `user-${userId}`,
      transcript: 'Test feedback ' + userId
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/debug/feedback-test',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve({ userId, status: res.statusCode, time: Date.now() });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('🚀 Starting 25-user load test...');
  const start = Date.now();
  
  const promises = [];
  for (let i = 1; i <= 25; i++) {
    promises.push(makeRequest(i));
  }
  
  const results = await Promise.all(promises);
  const duration = Date.now() - start;
  
  console.log(`\n✅ All 25 requests completed in ${duration}ms`);
  
  // Check for failures
  const failures = results.filter(r => r.status !== 200);
  if (failures.length > 0) {
    console.log(`❌ ${failures.length} failed requests`);
    failures.forEach(f => console.log(`  User ${f.userId}: ${f.status}`));
  } else {
    console.log(`✅ All requests successful`);
  }
}

runTest().catch(console.error);
```

Run:
```bash
node load-test.js
```

**Expected results:**
- ✅ All 25 requests succeed
- ✅ Total time: ~100-120 seconds (4s per request × 25)
- ✅ No 429 errors
- ✅ No timeout errors

---

## 11. Verify Deployment

After deploying to Vercel:

```bash
# Check production endpoint
curl https://your-domain.vercel.app/api/debug/model-info

# Should return same config as local
```

---

## Troubleshooting

### Issue: Still getting 72% score

**Check:**
1. Gemini API key: `/api/debug/check-gemini-key`
2. Google Cloud quota: Check console.cloud.google.com
3. Rate limiter: Check console logs for errors
4. Fallback data: `lib/fallback-data.js` should not be needed

### Issue: Requests taking too long

**Expected:**
- Single user: 6-9 seconds
- 25 users: Each waits their turn in queue

**Not expected:**
- Over 30 seconds: Check for errors in logs
- Hanging: Server might have crashed

### Issue: Users blocking each other

**Check:**
1. All requests using `withRateLimit(fn, name, userId)`
2. UserId being passed correctly
3. Not hardcoded userId to same value

---

## Success Criteria Checklist

- [ ] Server starts without errors
- [ ] `/api/debug/model-info` shows correct config
- [ ] Single user feedback completes in 6-9 seconds
- [ ] Feedback score varies (not always 72%)
- [ ] 3 concurrent users complete all requests
- [ ] Console shows rate limiter logs
- [ ] No 429 errors in logs
- [ ] `/api/debug/feedback-test` returns success
- [ ] Active users count updates in real-time
- [ ] Load test with 25 users completes

**All green? Your rate limiter is working! 🎉**

---

## Next Steps

1. **Deploy to production**: `git push && vercel deploy`
2. **Monitor in production**: Check `/api/debug/model-info` during peak usage
3. **Set up alerts**: Monitor for 429 errors or slow requests
4. **Scale if needed**: Consider upgrading Gemini model if quota insufficient

