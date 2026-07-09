/**
 * Code Executor API
 *
 * POST /api/code-executor/execute
 *   Body: { sourceCode, language, stdin?, testCases?, stopOnFirstFailure? }
 *
 * GET  /api/code-executor/execute
 *   Returns: { status, runtimes, pistonUrl, supportedLanguages }
 */

import {
  executeCode,
  runAllTestCases,
  testPistonConnectivity,
  getPistonRuntimes,
  getPistonLanguage,
  PISTON_LANGUAGE_MAP,
} from '@/lib/piston-service';

// ──────────────────────────────────────────────
// GET — health + runtime info
// ──────────────────────────────────────────────
export async function GET() {
  const connectivity = await testPistonConnectivity();
  const runtimes = connectivity.ok ? (connectivity.runtimes ?? []) : [];

  return Response.json({
    status: connectivity.ok ? 'OPERATIONAL' : 'OFFLINE',
    pistonUrl: connectivity.url,
    error: connectivity.error ?? null,
    runtimeCount: runtimes.length,
    runtimes: runtimes.map((r) => ({ language: r.language, version: r.version })),
    supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
    note: connectivity.ok
      ? '✅ Piston Docker container is running'
      : '❌ Piston is offline — run: docker compose up -d',
  });
}

import { db } from "@/firebase/admin";
import { recordDSASubmission } from "@/lib/security/dsa-score-validation";

// ──────────────────────────────────────────────
// POST — execute code
// ──────────────────────────────────────────────
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    sourceCode,
    language,
    questionId,
    roomId,
    userId,
    testCases: clientTestCases = [],
  } = body;

  // ── Validation ──────────────────────────────
  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return Response.json({ error: 'sourceCode is required and must be a non-empty string' }, { status: 400 });
  }
  if (!language || typeof language !== 'string') {
    return Response.json(
      {
        error: 'language is required',
        supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
      },
      { status: 400 }
    );
  }

  const pistonLang = getPistonLanguage(language);
  if (!PISTON_LANGUAGE_MAP[language.toLowerCase()]) {
    return Response.json(
      {
        error: `Language '${language}' is not supported`,
        supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
        resolvedAs: pistonLang,
      },
      { status: 400 }
    );
  }

  try {
    const modifiedSourceCode = injectAutoDriver(sourceCode, language);
    let testCases = [];

    // Phase 1 & 2: Database Registry Lookup
    if (questionId) {
      let resolvedId = questionId;
      if (!questionId.startsWith('lc_')) {
        // If it's a slug, look it up in dsa_questions to get the real ID (e.g. lc_206)
        const questionDoc = await db.collection("dsa_questions")
          .where("titleSlug", "==", questionId)
          .limit(1)
          .get();
        if (!questionDoc.empty) {
          resolvedId = questionDoc.docs[0].id;
        } else {
          // Try checking by document ID directly in case the doc ID itself is the slug
          const docDirect = await db.collection("dsa_questions").doc(questionId).get();
          if (docDirect.exists) {
            resolvedId = docDirect.id;
          }
        }
      }

      const snapshot = await db
        .collection("dsa_test_cases")
        .where("questionId", "==", resolvedId)
        .get();

      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          const data = doc.data();
          testCases.push({
            stdin: data.stdin || '',
            expectedOutput: data.expectedOutput || '',
            isHidden: data.isHidden || false,
          });
        });
      }
    }

    // Fallback if no questionId or database cases found
    if (testCases.length === 0) {
      testCases = clientTestCases;
    }

    // Phase 3: Evaluation Loop with Phase 4 Safeguards
    const results = [];
    let allPassed = true;
    let passedCount = 0;
    const MAX_STDOUT_BYTES = 512 * 1024; // 512 KB limit

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const startMs = Date.now();

      // Piston Call
      const result = await executeCode({
        sourceCode: modifiedSourceCode,
        language,
        stdin: tc.stdin || '',
      });

      const executionTime = Date.now() - startMs;
      let output = (result.output || '').slice(0, MAX_STDOUT_BYTES);
      const isTruncated = (result.output || '').length > MAX_STDOUT_BYTES;
      
      let errorMsg = result.error || "";
      if (isTruncated) {
        errorMsg += "\n[System: Output truncated due to size limit]";
      }

      const hasRuntimeError = result.exitCode !== 0;
      const actual = output.trim();
      const expected = (tc.expectedOutput || '').trim();
      const normalize = (str) => str.replace(/\s+/g, '');
      const passed = !hasRuntimeError && (actual === expected || normalize(actual) === normalize(expected));

      const tcResult = {
        passed,
        executionTime,
        exitCode: result.exitCode,
      };

      if (passed) {
        passedCount++;
        if (!tc.isHidden) {
          tcResult.testInput = tc.stdin;
          tcResult.output = output;
          tcResult.expectedOutput = tc.expectedOutput;
        } else {
          tcResult.testInput = "[Hidden Test Case]";
          tcResult.output = "[Hidden Output]";
          tcResult.expectedOutput = "[Hidden Expected]";
        }
      } else {
        allPassed = false;
        if (!tc.isHidden) {
          tcResult.testInput = tc.stdin;
          tcResult.output = output;
          tcResult.expectedOutput = tc.expectedOutput;
          tcResult.error = errorMsg || "Wrong Answer";
        } else {
          tcResult.testInput = "[Hidden Test Case]";
          tcResult.output = "[Redacted]";
          tcResult.expectedOutput = "[Redacted]";
          tcResult.error = hasRuntimeError ? "Runtime Error on hidden testcase" : "Wrong Answer on hidden testcase";
        }
      }

      results.push(tcResult);

      // Short-circuit on first failure
      if (!passed) {
        break;
      }
    }

    // Phase 5: Leaderboard Handshake / Recording Submissions
    if (roomId && userId && questionId) {
      try {
        const roomRef = db.collection("dsa_rooms").doc(roomId);
        let roomDoc = await roomRef.get();
        if (!roomDoc.exists) {
          await roomRef.set({
            roomCode: roomId,
            status: "playing",
            startTime: new Date(),
            createdAt: new Date(),
          });
          roomDoc = await roomRef.get();
        }
        const roomData = roomDoc.data();
        let timeFromStart = roomData && roomData.startTime 
          ? Math.max(0, Date.now() - (roomData.startTime.toDate ? roomData.startTime.toDate().getTime() : roomData.startTime))
          : 0;
        if (timeFromStart > 3599999) {
          timeFromStart = 3599999;
        }

        await recordDSASubmission(
          roomId,
          userId,
          questionId,
          sourceCode,
          language,
          timeFromStart,
          allPassed ? "accepted" : "rejected"
        );

        if (allPassed) {
          const statsRef = db.collection("dsa_stats").doc(userId);
          await db.runTransaction(async (transaction) => {
            const statsDoc = await transaction.get(statsRef);
            const scoreToAdd = 100; // Correct Answer base score
            if (statsDoc.exists) {
              const stats = statsDoc.data();
              transaction.update(statsRef, {
                totalScore: (stats.totalScore || 0) + scoreToAdd,
                totalSessions: (stats.totalSessions || 0) + 1,
                lastUpdated: new Date(),
              });
            } else {
              transaction.set(statsRef, {
                userId,
                totalScore: scoreToAdd,
                totalSessions: 1,
                createdAt: new Date(),
              });
            }
          });
        }
      } catch (err) {
        console.error("Failed to record DSA submission:", err.message);
      }
    }

    return Response.json({
      success: true,
      mode: 'test_cases',
      language: pistonLang,
      totalTests: testCases.length,
      ranTests: results.length,
      passed: passedCount,
      failed: testCases.length - passedCount,
      allPassed,
      results,
    });

  } catch (err) {
    console.error('[/api/code-executor/execute] Unhandled error:', err);
    return Response.json(
      {
        error: err.message || 'Code execution failed',
        details:
          process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Automatically inject standard input parsing and execution driver
 * for standard LeetCode-style function signatures (Choice 1 & 2 integration)
 */
function injectAutoDriver(sourceCode, language) {
  const lang = language.toLowerCase();
  
  if (lang === 'javascript' || lang === 'js') {
    // If user already wrote driver, don't inject
    if (sourceCode.includes("require('fs')") || sourceCode.includes('fs.readFileSync')) {
      return sourceCode;
    }
    
    // Find JS function name
    let funcName = null;
    let match = sourceCode.match(/(?:var|const|let)\s+([a-zA-Z0-9_]+)\s*=\s*function/);
    if (match) funcName = match[1];
    
    if (!funcName) {
      match = sourceCode.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
      if (match) funcName = match[1];
    }
    
    if (!funcName) {
      match = sourceCode.match(/(?:var|const|let)\s+([a-zA-Z0-9_]+)\s*=\s*\([^\)]*\)\s*=>/);
      if (match) funcName = match[1];
    }
    
    if (funcName) {
      console.log(`[Auto-Driver Injection] Detected JavaScript function: "${funcName}"`);
      return sourceCode + `\n\n// ── Auto-Generated Driver Code ──\nconst fs = require('fs');\ntry {\n  const lines = fs.readFileSync(0, 'utf-8').replace(/\\r/g, '').trim().split('\\n');\n  if (lines.length > 0 && lines[0] !== '') {\n    const parsedArgs = lines.map(line => {\n      try {\n        return JSON.parse(line);\n      } catch (e) {\n        return line;\n      }\n    });\n    if (typeof ${funcName} === 'function') {\n      console.log(JSON.stringify(${funcName}(...parsedArgs)));\n    }\n  }\n} catch (e) {}\n`;
    }
  } else if (lang === 'python' || lang === 'python3' || lang === 'py') {
    // If they already read stdin, don't inject
    if (sourceCode.includes('sys.stdin') || sourceCode.includes('input(')) {
      return sourceCode;
    }
    
    // Find Python Class Method or normal function
    let classMethod = null;
    let methodMatch = sourceCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(\s*self\s*,/);
    if (methodMatch) {
      classMethod = methodMatch[1];
    }
    
    if (classMethod) {
      console.log(`[Auto-Driver Injection] Detected Python class method: "${classMethod}"`);
      return sourceCode + `\n\n# ── Auto-Generated Driver Code ──\nimport sys, json\ntry:\n    lines = sys.stdin.read().replace('\\r', '').strip().split('\\n')\n    if lines and lines[0]:\n        parsed = []\n        for line in lines:\n            try:\n                parsed.append(json.loads(line))\n            except:\n                parsed.append(line)\n        sol = Solution()\n        print(json.dumps(getattr(sol, "${classMethod}")(*parsed)))\nexcept Exception as e:\n    pass\n`;
    } else {
      let funcName = null;
      let funcMatch = sourceCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
      if (funcMatch) {
        funcName = funcMatch[1];
      }
      
      if (funcName) {
        console.log(`[Auto-Driver Injection] Detected Python function: "${funcName}"`);
        return sourceCode + `\n\n# ── Auto-Generated Driver Code ──\nimport sys, json\ntry:\n    lines = sys.stdin.read().replace('\\r', '').strip().split('\\n')\n    if lines and lines[0]:\n        parsed = []\n        for line in lines:\n            try:\n                parsed.append(json.loads(line))\n            except:\n                parsed.append(line)\n        print(json.dumps(${funcName}(*parsed)))\nexcept Exception as e:\n    pass\n`;
      }
    }
  }
  
  return sourceCode;
}
