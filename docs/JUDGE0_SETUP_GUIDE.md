# Judge0 Integration Guide for DSA Room

## What is Judge0?

Judge0 is a **code execution API** that allows you to:
- Execute code in 100+ programming languages
- Run code against test cases
- Get execution results (output, errors, execution time, memory usage)
- Perfect for competitive programming and code validation

## Setup Steps

### 1. Get Judge0 API Key

#### Option A: Free Trial (Limited)
- Go to https://rapidapi.com/judge0-official/api/judge0-ce
- Sign up for RapidAPI
- Subscribe to Judge0 Community Edition (Free tier available)
- Copy your API key from the dashboard

#### Option B: Self-Hosted (Recommended for Production)
- Clone Judge0 repository: `https://github.com/judge0/judge0`
- Set up Docker container locally or on server
- Use local URL instead: `http://localhost:2358`

### 2. Configure Environment Variables

Add these to `.env.local`:

```bash
# Judge0 API Configuration
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here

# Or for self-hosted:
# JUDGE0_API_URL=http://localhost:2358
# JUDGE0_API_KEY=not_needed_for_localhost
```

### 3. Verify Installation

The judge0-service.js already has a test function:

```javascript
import { testJudge0Connectivity } from '@/lib/judge0-service';

// Test connection
const isConnected = await testJudge0Connectivity();
console.log('Judge0 Connected:', isConnected);
```

---

## How to Use Judge0 in DSA Room

### A. Basic Code Execution

```javascript
import { runTestCase } from '@/lib/judge0-service';

const result = await runTestCase({
  sourceCode: 'console.log("Hello, World!");',
  languageId: 63,  // JavaScript
  input: '',
  expectedOutput: 'Hello, World!',
  timeLimit: 5,
  memoryLimit: 256
});

console.log(result);
// {
//   passed: true,
//   output: "Hello, World!",
//   executionTime: 0.123,
//   memory: 12,
//   error: null
// }
```

### B. Run Multiple Test Cases

```javascript
import { runAllTestCases } from '@/lib/judge0-service';

const testCases = [
  { input: '5', expected: '120' },      // 5!
  { input: '3', expected: '6' },        // 3!
  { input: '0', expected: '1' },        // 0!
];

const result = await runAllTestCases({
  sourceCode: `
    function factorial(n) {
      return n <= 1 ? 1 : n * factorial(n - 1);
    }
    console.log(factorial(parseInt(readline())));
  `,
  languageId: 63,  // JavaScript
  testCases: testCases,
  timeLimit: 5
});

console.log(result);
// {
//   totalTests: 3,
//   passed: 3,
//   failed: 0,
//   allPassed: true,
//   results: [...]
// }
```

### C. Batch Submit (Optimized)

```javascript
import { batchSubmitTestCases } from '@/lib/judge0-service';

const result = await batchSubmitTestCases({
  sourceCode: userCode,
  languageId: 63,
  testCases: question.testCases,
  timeLimit: 5
});
```

---

## Language IDs

Supported languages in Judge0:

```javascript
const LANGUAGE_MAP = {
  python: 71,
  javascript: 63,
  cpp: 54,
  java: 62,
  go: 60,
  rust: 73,
  csharp: 51,
  typescript: 74,
  // ... and many more
};
```

Use `getLanguageId()` helper:

```javascript
import { getLanguageId } from '@/lib/judge0-service';

const languageId = getLanguageId('python');  // Returns 71
```

---

## Integration with DSA Room

### Current Setup

The judge0-service is already integrated in:
- ✅ `lib/judge0-service.js` - Core service with all functions
- ✅ `lib/utils/dsa-room-utils.js` - Language mappings
- ⚠️ `components/DSARoomLive.jsx` - Currently using simulation
- ⚠️ `server/dsa-socket-server-prod.js` - Has Judge0 references but incomplete

### Next Steps to Full Integration

1. **Update DSARoomLive.jsx** to call Judge0 service
2. **Update Socket Handlers** to properly route submissions
3. **Add Test Case Management** for questions
4. **Create Submission Dashboard** to show results

---

## Socket Events for Code Submission

### Client → Server

```javascript
socket.emit('code_submit', {
  userId: 'user123',
  roomId: 'ROOM001',
  questionId: 'q1',
  code: 'console.log("solution")',
  language: 'javascript',
  submittedAt: Date.now(),
  timeFromStart: 15000  // milliseconds
});
```

### Server → Client

```javascript
socket.on('submission_result', {
  userId: 'user123',
  questionId: 'q1',
  status: 'passed',  // or 'failed', 'timeout', 'error'
  points: 100,
  testResults: {
    totalTests: 5,
    passed: 5,
    failed: 0,
    results: [...]
  },
  executionTime: 0.345,
  memory: 45
});
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Judge0 API error: 401` | Invalid API key | Check JUDGE0_API_KEY in .env.local |
| `Judge0 API error: 429` | Rate limit exceeded | Use batch endpoints or self-hosted |
| `Judge0 timeout` | Execution took too long | Increase timeLimit or check code |
| `Compilation Error` | Code syntax error | Return compilation error to user |
| `Runtime Error` | Code crashed | Return runtime error message |

### Graceful Fallback

If Judge0 is unavailable:

```javascript
import { testJudge0Connectivity } from '@/lib/judge0-service';

const isAvailable = await testJudge0Connectivity();
if (!isAvailable) {
  // Use local JavaScript evaluation
  // or queue for retry
  console.warn('Judge0 offline, using fallback');
}
```

---

## Performance Tips

1. **Use Batch Submissions** for multiple test cases
2. **Cache Language IDs** to avoid repeated lookups
3. **Queue Long-Running** submissions asynchronously
4. **Poll Smartly** - Use exponential backoff for results
5. **Group Similar Languages** for better caching

---

## Testing Locally

### 1. Setup Self-Hosted Judge0 (Docker)

```bash
docker run -d \
  -p 2358:8080 \
  -e SERVER_ENV=development \
  judge0/judge0:latest
```

### 2. Update .env.local

```bash
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=
```

### 3. Test

```javascript
import { testJudge0Connectivity } from '@/lib/judge0-service';
const result = await testJudge0Connectivity();
console.log('Judge0 Running:', result);  // true
```

---

## RapidAPI vs Self-Hosted

| Feature | RapidAPI | Self-Hosted |
|---------|----------|-------------|
| Setup Time | 5 minutes | 30+ minutes |
| Cost | Free tier available | Server costs |
| Rate Limits | Tier-dependent | Unlimited |
| Support | RapidAPI support | Community |
| Best For | Development/Testing | Production |

---

## Monitoring & Debugging

### Enable Logging

```javascript
// In judge0-service.js or socket handler
console.log('[Judge0] Submitting:', { sourceCode, languageId, stdin });
console.log('[Judge0] Result:', result);
console.log('[Judge0] Execution time:', result.executionTime);
```

### Add Metrics

```javascript
// Track successful submissions
const metrics = {
  totalSubmissions: 0,
  successfulSubmissions: 0,
  failedSubmissions: 0,
  avgExecutionTime: 0
};
```

### Check Dashboard

Visit RapidAPI dashboard to see:
- API usage
- Rate limits
- Response times
- Error logs

---

## Next: Implementing Full Integration

See [DSA_ROOM_IMPLEMENTATION.md](./DSA_ROOM_IMPLEMENTATION.md) for complete code examples.
