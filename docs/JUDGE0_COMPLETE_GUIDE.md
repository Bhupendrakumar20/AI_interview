# Judge0 Integration - Complete Implementation Guide

## 🚀 Quick Start

### 1. Get Judge0 API Key (5 minutes)

**Free Option - RapidAPI:**
```
1. Go to: https://rapidapi.com/judge0-official/api/judge0-ce
2. Click "Subscribe"
3. Select free tier
4. Copy your API key
```

**Self-Hosted Option:**
```bash
# Run Judge0 locally with Docker
docker run -d -p 2358:8080 judge0/judge0:latest
# No API key needed for localhost
```

### 2. Update Environment Variables

**File:** `.env.local`

```bash
# Judge0 API Configuration
JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
JUDGE0_API_KEY="your_rapidapi_key_here"

# Or for self-hosted:
# JUDGE0_API_URL="http://localhost:2358"
# JUDGE0_API_KEY=""
```

### 3. Start DSA Room

Navigate to `/interview/buddy` → Select **DSA Room** mode → Submit code

---

## 📋 How It Works (Architecture)

### Flow Diagram

```
User writes code
     ↓
Clicks "Submit"
     ↓
[DSARoomLive.jsx] emits 'code_submit' event
     ↓
[dsa-socket-server-prod.js] receives submission
     ↓
Validates code + language
     ↓
Calls Judge0 API (via submitToJudge0)
     ↓
Executes code against test cases
     ↓
Returns pass/fail + points
     ↓
Broadcasts to room leaderboard
     ↓
User sees results + test case outputs
```

### Data Flow

**Client → Server:**
```javascript
socket.emit('code_submit', {
  sourceCode: "console.log('Hello');",
  language: "javascript"
})
```

**Server → Judge0:**
```javascript
axios.post('https://judge0-ce.p.rapidapi.com/submissions', {
  source_code: "console.log('Hello');",
  language_id: 63,  // JavaScript
  stdin: "test input"
})
```

**Judge0 → Server:**
```javascript
{
  status: { id: 3, description: "Accepted" },
  stdout: "Hello",
  stderr: "",
  time: 0.123,
  memory: 12
}
```

**Server → Client:**
```javascript
callback({
  success: true,
  passed: true,
  points: 150,
  isFirstBlood: true,
  testResults: [
    {
      testCase: 1,
      status: "Accepted",
      stdout: "Hello",
      stderr: ""
    }
  ]
})
```

---

## 💻 Code Examples

### Example 1: Simple Python Problem

**Problem:** Calculate factorial

**Test Cases:**
```
Input: 5  →  Output: 120
Input: 3  →  Output: 6
Input: 0  →  Output: 1
```

**User's Code:**
```python
n = int(input())
result = 1
for i in range(1, n + 1):
    result *= i
print(result)
```

**Judge0 Execution:**
```
Test 1: input=5   → output=120 ✅ PASS
Test 2: input=3   → output=6   ✅ PASS
Test 3: input=0   → output=1   ✅ PASS
All tests passed: 100 points + first blood bonus = 150 points!
```

### Example 2: JavaScript Array Problem

**Problem:** Find Two Sum

**Code:**
```javascript
const nums = [2, 7, 11, 15];
const target = 9;

for (let i = 0; i < nums.length; i++) {
  for (let j = i + 1; j < nums.length; j++) {
    if (nums[i] + nums[j] === target) {
      console.log(`${i} ${j}`);
      process.exit(0);
    }
  }
}
```

**Output:** `0 1` ✅

### Example 3: C++ Compilation Error

**Code:**
```cpp
#include <iostream>
int main() {
    std::cout << "Hello"; // Missing semicolon on next line
    return 0
    // ^^ Missing semicolon
}
```

**Judge0 Response:**
```
status: "Compilation Error"
stderr: ".../main.cpp:3: error: expected ';' before 'return'"
```

**User sees:** ❌ Compilation Error - Fix the syntax!

---

## 🔧 Configuration Options

### Language Support

```javascript
const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  rust: 73,
  csharp: 51,
  typescript: 74,
  // ... 100+ more languages
};
```

### Execution Limits

The server applies:
- **Time Limit:** 10 seconds per submission
- **Memory Limit:** 256 MB per language
- **Max Code Size:** No official limit, but practical ~1MB
- **Batch Limit:** Sequential test case execution (no batch API)

### Points Calculation

```javascript
const POINTS = {
  SOLVE_BASE: 100,              // Base points for solving
  FIRST_BLOOD_BONUS: 50,        // Bonus if first to solve
  SPEED_BONUS_PER_MINUTE: 2,    // +2 points per minute remaining
};

// Example:
// Base: 100
// First blood: +50
// Time remaining: 20 minutes: +40
// Total: 190 points
```

---

## 🐛 Debugging & Troubleshooting

### Check Judge0 Connection

**In Browser Console:**
```javascript
// Open DevTools → Console
socket.emit('code_submit', {
  sourceCode: 'console.log("test");',
  language: 'javascript'
}, (response) => {
  console.log('Response:', response);
});
```

### Enable Server Logging

**In dsa-socket-server-prod.js:**
```javascript
console.log("[Judge0] URL:", JUDGE0_BASE_URL);
console.log("[Judge0] Has API Key:", !!JUDGE0_API_KEY);
console.log("[Judge0] Submitting:", { sourceCode, languageId, stdin });
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "401 Unauthorized" | Invalid API key | Check JUDGE0_API_KEY in .env.local |
| "Execution Error" | No API key set | Add API key to environment |
| "Timeout" | Code takes too long | Check for infinite loops |
| "Compilation Error" | Syntax error | Show error message to user |
| "Wrong Answer" | Output doesn't match | Show actual vs expected output |

### View Server Output

```bash
# If running locally:
node server/dsa-socket-server-prod.js

# Look for logs:
# [Judge0] Submitting: {...}
# [Judge0] Submission successful: Accepted
# [Judge0] Error: ...details...
```

---

## 📊 Performance Metrics

### Typical Response Times

```
Simple code:        200-500ms
Medium complexity:  1-3 seconds
Complex recursion:  5-10 seconds
```

### Rate Limits (RapidAPI)

- **Free Tier:** 100 requests/month
- **Pro Tier:** 50 requests/day
- **Ultimate Tier:** Unlimited

For production with multiple users, use **self-hosted Judge0** (unlimited).

---

## ✅ Testing Checklist

- [ ] JUDGE0_API_KEY added to .env.local
- [ ] Judge0 connectivity tested
- [ ] Submit simple code and verify results
- [ ] Test with wrong answer (should fail gracefully)
- [ ] Test with compilation error
- [ ] Test timeout scenario
- [ ] Verify leaderboard updates after correct submission
- [ ] Confirm first blood bonus applied correctly

---

## 🚀 Production Deployment

### For Vercel/Production:

1. **Add Secret in Vercel Dashboard:**
   - `JUDGE0_API_KEY=your_key`
   - `JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com`

2. **Or use self-hosted Judge0:**
   - Deploy Judge0 Docker container
   - Update `JUDGE0_API_URL` to point to your server

3. **Monitor Usage:**
   - Track API calls in RapidAPI dashboard
   - Set up alerts for rate limits
   - Cache results if possible

### Environment Variables for Production:

```bash
# Vercel Settings → Environment Variables
JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
JUDGE0_API_KEY="your-production-key"
```

---

## 📚 Resources

- Judge0 Docs: https://api.judge0.com/
- RapidAPI Judge0: https://rapidapi.com/judge0-official/api/judge0-ce
- Self-hosted: https://github.com/judge0/judge0
- Language IDs: https://ce.judge0.com/api/languages

---

## 🎯 Next Steps

1. ✅ Get API key from RapidAPI
2. ✅ Add to .env.local
3. ✅ Navigate to `/interview/buddy`
4. ✅ Select DSA Room mode
5. ✅ Write and submit code
6. ✅ See results in real-time

That's it! Judge0 is fully integrated.
