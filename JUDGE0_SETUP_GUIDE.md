# Judge0 Implementation & Code Execution Setup Guide

## ✅ WHAT'S ALREADY IMPLEMENTED

### 1. **Judge0 Service** ✓
- Location: `lib/judge0-service.js`
- Functions available:
  - `submitToJudge0()` - Submit code for execution
  - `pollJudge0Result()` - Poll results with retry logic
  - `runTestCase()` - Run single test with pass/fail checking

### 2. **Monaco Editor** ✓
- Location: `components/DSALiveRoom.jsx`
- Supports: JavaScript, Python, Java, C++
- Real-time code sharing via WebSocket
- Syntax highlighting included
- Language switching available

### 3. **Piston Code Execution** ✓ (Currently Active)
- Used in: `server/dsa-socket-server-prod.js`, `components/DSARoomManager.jsx`
- **No API key required** (free/unlimited)
- Languages: JavaScript, Python, C++, Java, Ruby, Go, etc.

---

## ⚠️ WHAT'S MISSING

### 1. **Judge0 API Credentials** ❌
Your `.env.local` is **MISSING**:
```env
JUDGE0_API_KEY=your_key_here
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
```

### 2. **API Route for Code Execution** ❌
No dedicated `/api/dsa-room/execute` route exists

### 3. **Unified Execution Service** ❌
No adapter to switch between Piston/Judge0 easily

---

## 🚀 QUICK START OPTIONS

### **OPTION A: Keep Piston (No Changes Needed)**
✅ Already working  
✅ No API key required  
✅ Free & unlimited  
⚠️ Less reliable than Judge0  

**Status**: Fully functional right now

---

### **OPTION B: Add Judge0 (Recommended)**

#### Step 1: Get Judge0 API Key (Choose One)

**A) RapidAPI (Free Tier)**
1. Go to: https://rapidapi.com/judge0-official/api/judge0-ce
2. Click "Subscribe" → Select Free Plan
3. Copy API Key from Dashboard
4. Cost: FREE with rate limits

**B) Self-Host with Docker** (Unlimited)
```bash
# Run locally
docker run -p 2358:2358 judge0/judge0:latest

# Then use
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=not_needed_for_local
```

#### Step 2: Add to `.env.local`
```env
# ===== Judge0 Configuration =====
JUDGE0_API_KEY="your_rapidapi_key_here"
JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"

# OR for self-hosted:
# JUDGE0_API_URL="http://localhost:2358"
# JUDGE0_API_KEY="not_needed"
```

#### Step 3: Create API Route
**Need to create**: `app/api/dsa-room/execute/route.js`

```javascript
// /app/api/dsa-room/execute/route.js
import { runTestCase } from '@/lib/judge0-service';

export async function POST(req) {
  try {
    const { sourceCode, languageId, testCases } = await req.json();

    const results = await Promise.all(
      testCases.map(tc => 
        runTestCase({
          sourceCode,
          languageId,
          input: tc.stdin || tc.input,
          expectedOutput: tc.expectedOutput || tc.output,
        })
      )
    );

    return Response.json({
      success: true,
      results,
      totalPassed: results.filter(r => r.passed).length,
      totalFailed: results.filter(r => !r.passed).length,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 📋 Language Support

### Judge0 Language IDs (for API):
| Language | ID | 
|----------|----| 
| JavaScript | 63 |
| Python | 71 |
| Java | 62 |
| C++ | 54 |
| C | 50 |
| Ruby | 72 |
| Go | 60 |
| Rust | 73 |

### Code Editor (Monaco) Languages:
✅ JavaScript  
✅ Python  
✅ Java  
✅ C++  

---

## 🔧 INTEGRATION CHECKLIST

### To Fully Integrate Judge0:

- [ ] **Step 1**: Decide: RapidAPI vs Docker self-host
- [ ] **Step 2**: Get API key (if RapidAPI)
- [ ] **Step 3**: Add credentials to `.env.local`
- [ ] **Step 4**: Create `/api/dsa-room/execute` route
- [ ] **Step 5**: Update socket server to use Judge0 instead of Piston
- [ ] **Step 6**: Test with sample DSA problem

### Current Code Editor Features:
- [ ] ✅ Syntax highlighting (Monaco)
- [ ] ✅ Language selection
- [ ] ✅ Real-time sync (WebSocket)
- [ ] ✅ Starter code templates
- [ ] Need: Better error display
- [ ] Need: Code formatting
- [ ] Need: Autocomplete (Monaco has built-in)

---

## 🎯 EXECUTION FLOW

```
User writes code in Monaco Editor
         ↓
Selects language + clicks "Run"
         ↓
Code sent to backend
         ↓
Backend calls Judge0 API
         ↓
Judge0 compiles & executes code
         ↓
Results returned with:
  - Output
  - Execution time
  - Memory used
  - Status (Pass/Fail/Error)
         ↓
Display results in UI
```

---

## ⚡ WHAT I CAN DO FOR YOU

Tell me which option you want:

1. **Keep Piston** - Nothing to do, already working
2. **Add Judge0 + Create API route** - I'll set it up completely
3. **Both Piston & Judge0** - Add toggle to switch between them
4. **Improve Code Editor** - Add formatting, better errors, etc.

---

## 📝 CURRENT STATUS

| Feature | Status | Notes |
|---------|--------|-------|
| Judge0 Service | ✅ Ready | `lib/judge0-service.js` works |
| Judge0 API Key | ❌ Missing | Need RapidAPI or Docker |
| Monaco Editor | ✅ Working | In DSALiveRoom |
| Code Execution API | ❌ Missing | Need to create route |
| WebSocket Sync | ✅ Working | Real-time code sharing |
| Language Support | ✅ Good | 4 languages |
| Piston (Current) | ✅ Working | Can remove if using Judge0 |

