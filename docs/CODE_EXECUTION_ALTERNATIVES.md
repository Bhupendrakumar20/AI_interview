# Free Code Execution Libraries & APIs for DSA Room

Compare these alternatives to Judge0 for executing user code:

---

## 🏆 Top Alternatives

### 1. **Piston** ⭐ RECOMMENDED (Best Free Option)

**What it is:** Free, open-source code execution engine. Same quality as Judge0.

**Pros:**
- ✅ Completely FREE (no rate limits)
- ✅ Open-source (can self-host)
- ✅ 40+ languages supported
- ✅ No API key needed
- ✅ Great documentation
- ✅ Fast execution
- ✅ Easy to use REST API

**Cons:**
- ⚠️ Public API has light rate limiting (~100 req/min)
- ⚠️ Less mature than Judge0
- ⚠️ Smaller community

**Public API:** `https://emkc.org/api/v2/piston`

**Quick Example:**
```bash
curl -X POST https://emkc.org/api/v2/piston/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "language": "javascript",
    "version": "*",
    "files": [{"name": "main.js", "content": "console.log('\''Hello'\'')"}],
    "stdin": ""
  }'
```

**Setup Time:** 5 minutes

**Cost:** FREE forever ✨

---

### 2. **TIO (Try It Online)** ⭐ GREAT ALTERNATIVE

**What it is:** Free, open-source online compiler with 600+ languages!

**Pros:**
- ✅ COMPLETELY FREE (no limits)
- ✅ 600+ programming languages
- ✅ Open-source (can self-host)
- ✅ No authentication needed
- ✅ Perfect for diverse language support

**Cons:**
- ⚠️ Slower API response times
- ⚠️ Some languages may not be well-supported
- ⚠️ Different API structure than Judge0

**Public API:** `https://tio.run/api/run`

**Quick Example:**
```bash
curl -X POST https://tio.run/api/run \
  -d 'Vlang=Python3&VstdIN_=5&Fourton=Print(5*3)'
```

**Setup Time:** 10 minutes (complex API)

**Cost:** FREE forever ✨

---

### 3. **JDoodle** 

**What it is:** Online IDE with API support

**Pros:**
- ✅ Free tier: 200 requests/day
- ✅ 70+ languages
- ✅ Simple REST API
- ✅ Good documentation

**Cons:**
- ⚠️ Limited requests (200/day)
- ⚠️ Requires API key signup
- ⚠️ Pro version for unlimited

**Free Tier:** 200 requests/day

**Setup Time:** 10 minutes

**Cost:** FREE (limited), can upgrade

**API Endpoint:**
```
https://api.jdoodle.com/v1/execute
```

---

### 4. **Self-Hosted Node.js Sandbox**

**What it is:** Simple Node.js sandbox for JavaScript only

**Pros:**
- ✅ COMPLETELY FREE
- ✅ Full control
- ✅ No external dependencies
- ✅ Fast execution
- ✅ Runs on your server

**Cons:**
- ⚠️ Only JavaScript (unless expanded)
- ⚠️ Security risk if not sandboxed properly
- ⚠️ Requires setup

**Setup Time:** 30 minutes

**Cost:** FREE (just server costs)

**Quick Code:**
```javascript
// Using vm sandbox
const vm = require('vm');

function executeCode(code, input) {
  const sandbox = {
    console: console,
    input: input
  };
  
  try {
    vm.runInNewContext(code, sandbox, { timeout: 5000 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

### 5. **GlotIO**

**What it is:** Free, simple code execution API

**Pros:**
- ✅ FREE tier available
- ✅ 50+ languages
- ✅ Simple documentation
- ✅ REST API

**Cons:**
- ⚠️ Rate limits on free tier
- ⚠️ Limited support

**Free API:** `https://glot.io/api/run`

---

## 📊 Comparison Table

| Feature | Judge0 | Piston | TIO | JDoodle | Self-Hosted |
|---------|--------|--------|-----|---------|-------------|
| **Free?** | ❌ Limited | ✅ Yes | ✅ Yes | ⚠️ 200/day | ✅ Yes |
| **Languages** | 90+ | 40+ | 600+ | 70+ | 1 (JS) |
| **Setup Time** | 5 min | 5 min | 10 min | 10 min | 30 min |
| **Rate Limit** | Tier | Light | Light | 200/day | Unlimited |
| **Maturity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Support** | Excellent | Good | Community | Good | DIY |
| **Self-Host** | No | ✅ Yes | ✅ Yes | No | N/A |

---

## 🎯 Recommendation by Use Case

### **For Production with Large User Base:**
→ **Self-hosted Piston** (unlimited, fast, free)

### **For Most Users (Best Balance):**
→ **Piston API** (free, reliable, easy)

### **For Maximum Language Support:**
→ **TIO** (600+ languages, free)

### **For Limited Budget Development:**
→ **JDoodle** (200 free requests/day)

### **For JavaScript-Only DSA:**
→ **Self-hosted Node.js** (ultra-fast, zero cost)

---

## 🚀 Quick Migration Guide

### Option 1: Switch to Piston (Easiest)

**Current Judge0 Code:**
```javascript
const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
  method: 'POST',
  headers: {
    'X-RapidAPI-Key': JUDGE0_API_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  },
  body: JSON.stringify({
    source_code: code,
    language_id: languageId,
    stdin: testInput
  })
});
```

**Replace with Piston:**
```javascript
const response = await fetch('https://emkc.org/api/v2/piston/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    language: 'javascript',  // Use language name instead of ID
    version: '*',
    files: [{ name: 'main.js', content: code }],
    stdin: testInput
  })
});
```

**Language Mapping (Piston):**
```javascript
const PISTON_LANGUAGES = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  go: 'go',
  rust: 'rust',
  csharp: 'csharp',
  typescript: 'typescript',
};
```

---

### Option 2: Self-Hosted Piston

**Docker Setup:**
```bash
# 1. Pull Piston image
docker pull ghcr.io/engineer-man/piston:latest

# 2. Run it
docker run -d \
  -p 2000:2000 \
  ghcr.io/engineer-man/piston:latest

# 3. Test it
curl -X POST http://localhost:2000/api/v2/piston/execute \
  -H 'Content-Type: application/json' \
  -d '{...}'
```

**Update .env.local:**
```bash
CODE_EXECUTION_URL="http://localhost:2000"  # Self-hosted
# or
CODE_EXECUTION_URL="https://emkc.org/api/v2/piston"  # Public
CODE_EXECUTION_TYPE="piston"
```

---

## ⚠️ Security Considerations

When using free code execution services:

1. **Always set timeouts** (prevent infinite loops)
   ```javascript
   timeout: 5000  // 5 seconds max
   ```

2. **Limit code size** (prevent DoS)
   ```javascript
   const MAX_CODE_SIZE = 10000;  // 10KB
   if (code.length > MAX_CODE_SIZE) throw error;
   ```

3. **Use sandboxing** (isolate execution)
   - Judge0, Piston, TIO all sandbox code
   - Self-hosted needs explicit sandboxing

4. **Monitor rate limits**
   - Track API calls
   - Implement request throttling

---

## 💰 Cost Comparison (1000 submissions/month)

| Service | Free Cost | Paid Cost |
|---------|-----------|-----------|
| Judge0 | ❌ Expired | $9-50+/mo |
| Piston | ✅ FREE | ✅ FREE |
| TIO | ✅ FREE | ✅ FREE |
| JDoodle | ⚠️ 191/1000 failed | $8-30/mo |
| Self-Hosted | ✅ FREE | Server costs |

**Piston = Best value for free users!**

---

## 📝 Implementation Effort

### Switch to Piston: **15 minutes**
- Update API endpoint
- Change response parsing
- Update language mappings
- Test 2-3 submissions

### Stay with Judge0: **Free tier expired**
- Would need paid subscription

### Switch to TIO: **45 minutes**
- Completely different API format
- Complex request structure
- More language support

---

## 🎓 My Recommendation

**Use Piston (Public API)** because:

1. ✅ **Completely FREE** - No rate limits for typical usage
2. ✅ **Drop-in replacement** - Easy migration from Judge0
3. ✅ **Battle-tested** - Used by many platforms
4. ✅ **Good language support** - 40+ languages covers DSA
5. ✅ **Fast response** - ~500ms typical
6. ✅ **No authentication** - Just use the URL

**If you need self-hosted later:**
- Docker: `docker run ghcr.io/engineer-man/piston`
- Same API, unlimited rate limits

---

## 🔧 Next Steps

**Want to switch to Piston?**

I can:
1. ✅ Create `lib/piston-service.js` (like judge0-service.js)
2. ✅ Update `dsa-socket-server-prod.js` to use Piston
3. ✅ Update `.env.local` configuration
4. ✅ Test with a few code submissions
5. ✅ Push changes

**Just say:** "Switch to Piston" or "Use [service name]"

I'll handle the full migration! 🚀
