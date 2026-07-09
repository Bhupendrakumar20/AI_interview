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
    if (sourceCode.includes("require('fs')") || sourceCode.includes('fs.readFileSync')) {
      return sourceCode;
    }
    
    let funcName = null;
    let match = sourceCode.match(/(?:var|const|let)\s+([a-zA-Z0-9_]+)\s*=\s*function/);
    if (match) funcName = match[1];
    
    if (!funcName) {
      match = sourceCode.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
      if (match) funcName = match[1];
    }
    
    if (!funcName) {
      match = sourceCode.match(/(?:var|const|let)\s+([a-zA-Z0-9_]+)\s*=\s*\([^\)]*\)\s*=>/);
      if (funcName) funcName = match[1];
    }
    
    if (funcName) {
      console.log("[Auto-Driver Injection] Detected JavaScript function: " + funcName);
      
      const driverParts = [
        "// ── Predefined Data Structures ──",
        "class ListNode {",
        "  constructor(val, next) {",
        "    this.val = (val === undefined ? 0 : val);",
        "    this.next = (next === undefined ? null : next);",
        "  }",
        "}",
        "",
        "class TreeNode {",
        "  constructor(val, left, right) {",
        "    this.val = (val === undefined ? 0 : val);",
        "    this.left = (left === undefined ? null : left);",
        "    this.right = (right === undefined ? null : right);",
        "  }",
        "}",
        "",
        "function arrayToLinkedList(arr) {",
        "  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;",
        "  let dummy = new ListNode(0);",
        "  let curr = dummy;",
        "  for (let val of arr) {",
        "    curr.next = new ListNode(val);",
        "    curr = curr.next;",
        "  }",
        "  return dummy.next;",
        "}",
        "",
        "function linkedListToArray(head) {",
        "  let arr = [];",
        "  let curr = head;",
        "  while (curr !== null) {",
        "    arr.push(curr.val);",
        "    curr = curr.next;",
        "  }",
        "  return arr;",
        "}",
        "",
        "function arrayToTree(arr) {",
        "  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;",
        "  let root = new TreeNode(arr[0]);",
        "  let queue = [root];",
        "  let i = 1;",
        "  while (queue.length > 0 && i < arr.length) {",
        "    let curr = queue.shift();",
        "    if (curr === null) continue;",
        "    ",
        "    if (i < arr.length) {",
        "      let val = arr[i++];",
        "      if (val !== null && val !== undefined) {",
        "        curr.left = new TreeNode(val);",
        "        queue.push(curr.left);",
        "      }",
        "    }",
        "    ",
        "    if (i < arr.length) {",
        "      let val = arr[i++];",
        "      if (val !== null && val !== undefined) {",
        "        curr.right = new TreeNode(val);",
        "        queue.push(curr.right);",
        "      }",
        "    }",
        "  }",
        "  return root;",
        "}",
        "",
        "function treeToArray(root) {",
        "  if (!root) return [];",
        "  let result = [];",
        "  let queue = [root];",
        "  while (queue.length > 0) {",
        "    let curr = queue.shift();",
        "    if (curr) {",
        "      result.push(curr.val);",
        "      queue.push(curr.left);",
        "      queue.push(curr.right);",
        "    } else {",
        "      result.push(null);",
        "    }",
        "  }",
        "  while (result.length > 0 && result[result.length - 1] === null) {",
        "    result.pop();",
        "  }",
        "  return result;",
        "}",
        "",
        sourceCode,
        "",
        "// ── Auto-Generated Driver Code ──",
        "const fs = require('fs');",
        "try {",
        "  const lines = fs.readFileSync(0, 'utf-8').replace(/\\r/g, '').trim().split('\\n');",
        "  if (lines.length > 0 && lines[0] !== '') {",
        "    const parsedArgs = lines.map(line => {",
        "      try {",
        "        return JSON.parse(line);",
        "      } catch (e) {",
        "        return line;",
        "      }",
        "    });",
        "",
        "    if (typeof " + funcName + " === 'function') {",
        "      const fnStr = " + funcName + ".toString().replace(/((\\/\\/.*$)|(\\/\\* [\\s\\S]*?\\*\\/))/mg, '');",
        "      const paramMatch = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\\s,]+)/g);",
        "      const params = paramMatch || [];",
        "",
        "      const convertedArgs = parsedArgs.map((arg, idx) => {",
        "        if (Array.isArray(arg)) {",
        "          const paramName = (params[idx] || '').toLowerCase();",
        "          if (paramName === 'head' || paramName === 'list' || paramName.startsWith('list') || paramName.startsWith('l') || paramName === 'node') {",
        "            return arrayToLinkedList(arg);",
        "          }",
        "          if (paramName === 'root' || paramName.includes('tree')) {",
        "            return arrayToTree(arg);",
        "          }",
        "        }",
        "        return arg;",
        "      });",
        "",
        "      let result = " + funcName + "(...convertedArgs);",
        "",
        "      if (result !== null && typeof result === 'object') {",
        "        if ('next' in result) {",
        "          result = linkedListToArray(result);",
        "        } else if ('left' in result || 'right' in result) {",
        "          result = treeToArray(result);",
        "        }",
        "      }",
        "",
        "      console.log(JSON.stringify(result));",
        "    }",
        "  }",
        "} catch (e) {}"
      ];
      
      return driverParts.join("\n");
    }
  } else if (lang === 'python' || lang === 'python3' || lang === 'py') {
    if (sourceCode.includes('sys.stdin') || sourceCode.includes('input(')) {
      return sourceCode;
    }
    
    let classMethod = null;
    let methodMatch = sourceCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(\s*self\s*,/);
    if (methodMatch) {
      classMethod = methodMatch[1];
    }
    
    const predefClasses = [
      "import sys, json",
      "",
      "class ListNode:",
      "    def __init__(self, val=0, next=None):",
      "        self.val = val",
      "        self.next = next",
      "",
      "class TreeNode:",
      "    def __init__(self, val=0, left=None, right=None):",
      "        self.val = val",
      "        self.left = left",
      "        self.right = right",
      "",
      "def arrayToLinkedList(arr):",
      "    if not arr: return None",
      "    dummy = ListNode(0)",
      "    curr = dummy",
      "    for val in arr:",
      "        curr.next = ListNode(val)",
      "        curr = curr.next",
      "    return dummy.next",
      "",
      "def linkedListToArray(head):",
      "    arr = []",
      "    curr = head",
      "    while curr:",
      "        arr.append(curr.val)",
      "        curr = curr.next",
      "    return arr",
      "",
      "def arrayToTree(arr):",
      "    if not arr: return None",
      "    root = TreeNode(arr[0])",
      "    queue = [root]",
      "    i = 1",
      "    while queue and i < len(arr):",
      "        curr = queue.pop(0)",
      "        if not curr: continue",
      "        if i < len(arr):",
      "            val = arr[i]",
      "            i += 1",
      "            if val is not None:",
      "                curr.left = TreeNode(val)",
      "                queue.append(curr.left)",
      "        if i < len(arr):",
      "            val = arr[i]",
      "            i += 1",
      "            if val is not None:",
      "                curr.right = TreeNode(val)",
      "                queue.append(curr.right)",
      "    return root",
      "",
      "def treeToArray(root):",
      "    if not root: return []",
      "    result = []",
      "    queue = [root]",
      "    while queue:",
      "        curr = queue.pop(0)",
      "        if curr:",
      "            result.append(curr.val)",
      "            queue.append(curr.left)",
      "            queue.append(curr.right)",
      "        else:",
      "            result.append(None)",
      "    while result and result[-1] is None:",
      "        result.pop()",
      "    return result"
    ].join("\n");

    if (classMethod) {
      console.log("[Auto-Driver Injection] Detected Python class method: " + classMethod);
      
      const driverCode = [
        predefClasses,
        sourceCode,
        "# ── Auto-Generated Driver Code ──",
        "try:",
        "    lines = sys.stdin.read().replace('\\r', '').strip().split('\\n')",
        "    if lines and lines[0]:",
        "        parsed = []",
        "        for line in lines:",
        "            try:",
        "                parsed.append(json.loads(line))",
        "            except:",
        "                parsed.append(line)",
        "        ",
        "        import inspect",
        "        sol = Solution()",
        "        method = getattr(sol, \"" + classMethod + "\")",
        "        sig = inspect.signature(method)",
        "        params = list(sig.parameters.keys())",
        "        ",
        "        converted = []",
        "        for idx, arg in enumerate(parsed):",
        "            if isinstance(arg, list):",
        "                param_name = params[idx].lower() if idx < len(params) else \"\"",
        "                if param_name in [\"head\", \"list\", \"node\"] or param_name.startswith(\"list\") or param_name.startswith(\"l\"): ",
        "                    converted.append(arrayToLinkedList(arg))",
        "                elif param_name == \"root\" or \"tree\" in param_name:",
        "                    converted.append(arrayToTree(arg))",
        "                else:",
        "                    converted.append(arg)",
        "            else:",
        "                converted.append(arg)",
        "        ",
        "        res = method(*converted)",
        "        ",
        "        if res is not None:",
        "            if hasattr(res, 'next'):",
        "                res = linkedListToArray(res)",
        "            elif hasattr(res, 'left') or hasattr(res, 'right'):",
        "                res = treeToArray(res)",
        "        ",
        "        print(json.dumps(res))",
        "except Exception as e:",
        "    pass"
      ].join("\n");
      
      return driverCode;
    } else {
      let funcName = null;
      let funcMatch = sourceCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
      if (funcMatch) {
        funcName = funcMatch[1];
      }
      
      if (funcName) {
        console.log("[Auto-Driver Injection] Detected Python function: " + funcName);
        
        const driverCode = [
          predefClasses,
          sourceCode,
          "# ── Auto-Generated Driver Code ──",
          "try:",
          "    lines = sys.stdin.read().replace('\\r', '').strip().split('\\n')",
          "    if lines and lines[0]:",
          "        parsed = []",
          "        for line in lines:",
          "            try:",
          "                parsed.append(json.loads(line))",
          "            except:",
          "                parsed.append(line)",
          "        ",
          "        import inspect",
          "        func = globals().get(\"" + funcName + "\")",
          "        sig = inspect.signature(func)",
          "        params = list(sig.parameters.keys())",
          "        ",
          "        converted = []",
          "        for idx, arg in enumerate(parsed):",
          "            if isinstance(arg, list):",
          "                param_name = params[idx].lower() if idx < len(params) else \"\"",
          "                if param_name in [\"head\", \"list\", \"node\"] or param_name.startswith(\"list\") or param_name.startswith(\"l\"): ",
          "                    converted.append(arrayToLinkedList(arg))",
          "                elif param_name == \"root\" or \"tree\" in param_name:",
          "                    converted.append(arrayToTree(arg))",
          "                else:",
          "                    converted.append(arg)",
          "            else:",
          "                converted.append(arg)",
          "        ",
          "        res = func(*converted)",
          "        ",
          "        if res is not None:",
          "            if hasattr(res, 'next'):",
          "                res = linkedListToArray(res)",
          "            elif hasattr(res, 'left') or hasattr(res, 'right'):",
          "                res = treeToArray(res)",
          "        ",
          "        print(json.dumps(res))",
          "except Exception as e:",
          "    pass"
        ].join("\n");
        
        return driverCode;
      }
    }
  } else if (lang === 'cpp' || lang === 'c++') {
    if (sourceCode.includes('int main(')) {
      return sourceCode;
    }
    
    const solIndex = sourceCode.indexOf("class Solution");
    if (solIndex === -1) return sourceCode;
    
    const classBody = sourceCode.slice(solIndex);
    const methodMatch = classBody.match(/(?:public|private|protected)?\s+([a-zA-Z0-9_<>\*&:]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (!methodMatch) return sourceCode;
    
    const returnType = methodMatch[1].trim();
    const methodName = methodMatch[2].trim();
    const paramsStr = methodMatch[3].trim();
    
    const params = paramsStr.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      const name = parts[parts.length - 1].replace(/[*&]/g, '');
      const type = parts.slice(0, parts.length - 1).join(' ') + (p.includes('*') ? '*' : '') + (p.includes('&') ? '&' : '');
      return { type: type.trim(), name: name.trim() };
    }).filter(p => p.name && p.type);
    
    console.log(`[Auto-Driver Injection] C++ Method: ${returnType} ${methodName}(${params.map(p=>p.type+' '+p.name).join(', ')})`);
    
    const parserLines = [];
    const callArgs = [];
    params.forEach((param, idx) => {
      const lineVar = `line_${idx}`;
      parserLines.push(`    std::string ${lineVar};`);
      parserLines.push(`    if (!std::getline(std::cin, ${lineVar})) return 0;`);
      
      const type = param.type.replace(/&/g, '').trim();
      const valVar = `val_${idx}`;
      
      if (type === 'int') {
        parserLines.push(`    int ${valVar} = std::stoi(${lineVar});`);
        callArgs.push(valVar);
      } else if (type === 'double' || type === 'float') {
        parserLines.push(`    double ${valVar} = std::stod(${lineVar});`);
        callArgs.push(valVar);
      } else if (type === 'std::string' || type === 'string') {
        parserLines.push(`    std::string ${valVar} = ${lineVar};`);
        parserLines.push(`    if (${valVar}.front() == '"' && ${valVar}.back() == '"') ${valVar} = ${valVar}.substr(1, ${valVar}.size() - 2);`);
        callArgs.push(valVar);
      } else if (type === 'TreeNode*') {
        parserLines.push(`    TreeNode* ${valVar} = arrayToTree(${lineVar});`);
        callArgs.push(valVar);
      } else if (type === 'ListNode*') {
        parserLines.push(`    ListNode* ${valVar} = arrayToLinkedList(${lineVar});`);
        callArgs.push(valVar);
      } else if (type.includes('vector<int>') || type.includes('std::vector<int>')) {
        parserLines.push(`    std::vector<int> ${valVar};`);
        parserLines.push(`    {`);
        parserLines.push(`      std::string s = ${lineVar};`);
        parserLines.push(`      s.erase(std::remove(s.begin(), s.end(), '['), s.end());`);
        parserLines.push(`      s.erase(std::remove(s.begin(), s.end(), ']'), s.end());`);
        parserLines.push(`      std::stringstream ss(s);`);
        parserLines.push(`      std::string item;`);
        parserLines.push(`      while (std::getline(ss, item, ',')) {`);
        parserLines.push(`        if (!item.empty()) ${valVar}.push_back(std::stoi(item));`);
        parserLines.push(`      }`);
        parserLines.push(`    }`);
        callArgs.push(valVar);
      } else {
        parserLines.push(`    std::string ${valVar} = ${lineVar};`);
        callArgs.push(valVar);
      }
    });
    
    let outputCode = '';
    const cleanRetType = returnType.replace(/&/g, '').trim();
    if (cleanRetType === 'void') {
      outputCode = `    sol.${methodName}(${callArgs.join(', ')});`;
    } else if (cleanRetType === 'TreeNode*') {
      outputCode = `    TreeNode* res = sol.${methodName}(${callArgs.join(', ')});\n    printTree(res);`;
    } else if (cleanRetType === 'ListNode*') {
      outputCode = `    ListNode* res = sol.${methodName}(${callArgs.join(', ')});\n    printLinkedList(res);`;
    } else if (cleanRetType.includes('vector<int>') || cleanRetType.includes('std::vector<int>')) {
      outputCode = `    std::vector<int> res = sol.${methodName}(${callArgs.join(', ')});\n    std::cout << "[";\n    for (size_t i = 0; i < res.size(); ++i) {\n        if (i > 0) std::cout << ",";\n        std::cout << res[i];\n    }\n    std::cout << "]" << std::endl;`;
    } else if (cleanRetType === 'bool') {
      outputCode = `    bool res = sol.${methodName}(${callArgs.join(', ')});\n    std::cout << (res ? "true" : "false") << std::endl;`;
    } else {
      outputCode = `    auto res = sol.${methodName}(${callArgs.join(', ')});\n    std::cout << res << std::endl;`;
    }
    
    const driver = [
      `// ── Predefined Data Structures ──`,
      `#ifndef STRUCT_TREENODE`,
      `#define STRUCT_TREENODE`,
      `struct TreeNode {`,
      `    int val;`,
      `    TreeNode *left;`,
      `    TreeNode *right;`,
      `    TreeNode() : val(0), left(nullptr), right(nullptr) {}`,
      `    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}`,
      `    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}`,
      `};`,
      `#endif`,
      ``,
      `#ifndef STRUCT_LISTNODE`,
      `#define STRUCT_LISTNODE`,
      `struct ListNode {`,
      `    int val;`,
      `    ListNode *next;`,
      `    ListNode() : val(0), next(nullptr) {}`,
      `    ListNode(int x) : val(x), next(nullptr) {}`,
      `    ListNode(int x, ListNode *next) : val(x), next(next) {}`,
      `};`,
      `#endif`,
      ``,
      `#include <iostream>`,
      `#include <vector>`,
      `#include <string>`,
      `#include <sstream>`,
      `#include <queue>`,
      `#include <algorithm>`,
      ``,
      `inline TreeNode* arrayToTree(const std::string& str) {`,
      `    std::string s = str;`,
      `    s.erase(std::remove(s.begin(), s.end(), '['), s.end());`,
      `    s.erase(std::remove(s.begin(), s.end(), ']'), s.end());`,
      `    s.erase(std::remove(s.begin(), s.end(), ' '), s.end());`,
      `    s.erase(std::remove(s.begin(), s.end(), '\\r'), s.end());`,
      `    s.erase(std::remove(s.begin(), s.end(), '\\n'), s.end());`,
      `    if (s.empty()) return nullptr;`,
      `    std::vector<std::string> nodes;`,
      `    std::stringstream ss(s);`,
      `    std::string item;`,
      `    while (std::getline(ss, item, ',')) {`,
      `        nodes.push_back(item);`,
      `    }`,
      `    if (nodes.empty() || nodes[0] == "null") return nullptr;`,
      `    TreeNode* root = new TreeNode(std::stoi(nodes[0]));`,
      `    std::queue<TreeNode*> q;`,
      `    q.push(root);`,
      `    size_t i = 1;`,
      `    while (!q.empty() && i < nodes.size()) {`,
      `        TreeNode* curr = q.front();`,
      `        q.pop();`,
      `        if (i < nodes.size()) {`,
      `            if (nodes[i] != "null" && !nodes[i].empty()) {`,
      `                curr->left = new TreeNode(std::stoi(nodes[i]));`,
      `                q.push(curr->left);`,
      `            }`,
      `            i++;`,
      `        }`,
      `        if (i < nodes.size()) {`,
      `            if (nodes[i] != "null" && !nodes[i].empty()) {`,
      `                curr->right = new TreeNode(std::stoi(nodes[i]));`,
      `                q.push(curr->right);`,
      `            }`,
      `            i++;`,
      `        }`,
      `    }`,
      `    return root;`,
      `}`,
      ``,
      `inline void printTree(TreeNode* root) {`,
      `    if (!root) {`,
      `        std::cout << "[]" << std::endl;`,
      `        return;`,
      `    }`,
      `    std::vector<std::string> res;`,
      `    std::queue<TreeNode*> q;`,
      `    q.push(root);`,
      `    while (!q.empty()) {`,
      `        TreeNode* curr = q.front();`,
      `        q.pop();`,
      `        if (curr) {`,
      `            res.push_back(std::to_string(curr->val));`,
      `            q.push(curr->left);`,
      `            q.push(curr->right);`,
      `        } else {`,
      `            res.push_back("null");`,
      `        }`,
      `    }`,
      `    while (!res.empty() && res.back() == "null") {`,
      `        res.pop_back();`,
      `    }`,
      `    std::cout << "[";`,
      `    for (size_t i = 0; i < res.size(); ++i) {`,
      `        if (i > 0) std::cout << ",";`,
      `        std::cout << res[i];`,
      `    }`,
      `    std::cout << "]" << std::endl;`,
      `}`,
      ``,
      `inline ListNode* arrayToLinkedList(const std::string& str) {`,
      `    std::string s = str;`,
      `    s.erase(std::remove(s.begin(), s.end(), '['), s.end());`,
      `    s.erase(std::remove(s.begin(), s.end(), ']'), s.end());`,
      `    s.erase(std::remove(s.begin(), s.end(), ' '), s.end());`,
      `    if (s.empty()) return nullptr;`,
      `    std::vector<int> vals;`,
      `    std::stringstream ss(s);`,
      `    std::string item;`,
      `    while (std::getline(ss, item, ',')) {`,
      `        if (item != "null" && !item.empty()) {`,
      `            vals.push_back(std::stoi(item));`,
      `        }`,
      `    }`,
      `    if (vals.empty()) return nullptr;`,
      `    ListNode* dummy = new ListNode(0);`,
      `    ListNode* curr = dummy;`,
      `    for (int val : vals) {`,
      `        curr->next = new ListNode(val);`,
      `        curr = curr->next;`,
      `    }`,
      `    return dummy->next;`,
      `}`,
      ``,
      `inline void printLinkedList(ListNode* head) {`,
      `    std::cout << "[";`,
      `    ListNode* curr = head;`,
      `    bool first = true;`,
      `    while (curr != nullptr) {`,
      `        if (!first) std::cout << ",";`,
      `        std::cout << curr->val;`,
      `        first = false;`,
      `        curr = curr->next;`,
      `    }`,
      `    std::cout << "]" << std::endl;`,
      `}`,
      ``,
      sourceCode,
      ``,
      `int main() {`,
      ...parserLines,
      `    Solution sol;`,
      ...outputCode.split('\n'),
      `    return 0;`,
      `}`
    ].join('\n');
    
    return driver;
  } else if (lang === 'java') {
    if (sourceCode.includes('public static void main(')) {
      return sourceCode;
    }
    
    const solIndex = sourceCode.indexOf("class Solution");
    if (solIndex === -1) return sourceCode;
    
    const classBody = sourceCode.slice(solIndex);
    const methodMatch = classBody.match(/(?:public|private|protected)?\s+([a-zA-Z0-9_<>\*&:[\]]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (!methodMatch) return sourceCode;
    
    const returnType = methodMatch[1].trim();
    const methodName = methodMatch[2].trim();
    const paramsStr = methodMatch[3].trim();
    
    const params = paramsStr.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      const name = parts[parts.length - 1];
      const type = parts.slice(0, parts.length - 1).join(' ');
      return { type: type.trim(), name: name.trim() };
    }).filter(p => p.name && p.type);
    
    console.log(`[Auto-Driver Injection] Java Method: ${returnType} ${methodName}(${params.map(p=>p.type+' '+p.name).join(', ')})`);
    
    const parserLines = [];
    const callArgs = [];
    
    params.forEach((param, idx) => {
      const lineVar = `line_${idx}`;
      parserLines.push(`        String ${lineVar} = br.readLine();`);
      parserLines.push(`        if (${lineVar} == null) return;`);
      
      const type = param.type;
      const valVar = `val_${idx}`;
      
      if (type === 'int') {
        parserLines.push(`        int ${valVar} = Integer.parseInt(${lineVar}.trim());`);
        callArgs.push(valVar);
      } else if (type === 'double') {
        parserLines.push(`        double ${valVar} = Double.parseDouble(${lineVar}.trim());`);
        callArgs.push(valVar);
      } else if (type === 'String') {
        parserLines.push(`        String ${valVar} = ${lineVar}.trim();`);
        parserLines.push(`        if (${valVar}.startsWith("\\"") && ${valVar}.endsWith("\\"")) ${valVar} = ${valVar}.substring(1, ${valVar}.length() - 1);`);
        callArgs.push(valVar);
      } else if (type === 'TreeNode') {
        parserLines.push(`        TreeNode ${valVar} = arrayToTree(${lineVar}.trim());`);
        callArgs.push(valVar);
      } else if (type === 'ListNode') {
        parserLines.push(`        ListNode ${valVar} = arrayToLinkedList(${lineVar}.trim());`);
        callArgs.push(valVar);
      } else if (type.includes('[]') || type.includes('List<') || type.includes('ArrayList<')) {
        parserLines.push(`        int[] ${valVar} = parseJsonArray(${lineVar}.trim());`);
        callArgs.push(valVar);
      } else {
        parserLines.push(`        String ${valVar} = ${lineVar}.trim();`);
        callArgs.push(valVar);
      }
    });
    
    let outputCode = '';
    const cleanRetType = returnType.trim();
    if (cleanRetType === 'void') {
      outputCode = `        sol.${methodName}(${callArgs.join(', ')});`;
    } else if (cleanRetType === 'TreeNode') {
      outputCode = `        TreeNode res = sol.${methodName}(${callArgs.join(', ')});\n        System.out.println(treeToArrayString(res));`;
    } else if (cleanRetType === 'ListNode') {
      outputCode = `        ListNode res = sol.${methodName}(${callArgs.join(', ')});\n        System.out.println(linkedListToArrayString(res));`;
    } else if (cleanRetType.includes('[]')) {
      outputCode = `        int[] res = sol.${methodName}(${callArgs.join(', ')});\n        System.out.println(Arrays.toString(res).replace(" ", ""));`;
    } else if (cleanRetType.includes('List<')) {
      outputCode = `        List<Integer> res = sol.${methodName}(${callArgs.join(', ')});\n        System.out.println(res.toString().replace(" ", ""));`;
    } else {
      outputCode = `        System.out.println(sol.${methodName}(${callArgs.join(', ')}));`;
    }
    
    const driver = [
      `import java.io.*;`,
      `import java.util.*;`,
      ``,
      `class TreeNode {`,
      `    int val;`,
      `    TreeNode left;`,
      `    TreeNode right;`,
      `    TreeNode() {}`,
      `    TreeNode(int val) { this.val = val; }`,
      `    TreeNode(int val, TreeNode left, TreeNode right) {`,
      `        this.val = val;`,
      `        this.left = left;`,
      `        this.right = right;`,
      `    }`,
      `}`,
      ``,
      `class ListNode {`,
      `    int val;`,
      `    ListNode next;`,
      `    ListNode() {}`,
      `    ListNode(int val) { this.val = val; }`,
      `    ListNode(int val, ListNode next) { this.val = val; this.next = next; }`,
      `}`,
      ``,
      sourceCode,
      ``,
      `public class Main {`,
      `    public static void main(String[] args) throws IOException {`,
      `        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));`,
      `        Solution sol = new Solution();`,
      `        try {`,
      ...parserLines,
      ...outputCode.split('\n'),
      `        } catch (Exception e) {`,
      `            e.printStackTrace();`,
      `        }`,
      `    }`,
      ``,
      `    private static TreeNode arrayToTree(String str) {`,
      `        str = str.replace("[", "").replace("]", "").replace(" ", "").trim();`,
      `        if (str.isEmpty()) return null;`,
      `        String[] nodes = str.split(",");`,
      `        if (nodes.length == 0 || nodes[0].equals("null")) return null;`,
      `        TreeNode root = new TreeNode(Integer.parseInt(nodes[0]));`,
      `        Queue<TreeNode> q = new LinkedList<>();`,
      `        q.add(root);`,
      `        int i = 1;`,
      `        while (!q.isEmpty() && i < nodes.length) {`,
      `            TreeNode curr = q.poll();`,
      `            if (i < nodes.length) {`,
      `                if (!nodes[i].equals("null") && !nodes[i].isEmpty()) {`,
      `                    curr.left = new TreeNode(Integer.parseInt(nodes[i]));`,
      `                    q.add(curr.left);`,
      `                }`,
      `                i++;`,
      `            }`,
      `            if (i < nodes.length) {`,
      `                if (!nodes[i].equals("null") && !nodes[i].isEmpty()) {`,
      `                    curr.right = new TreeNode(Integer.parseInt(nodes[i]));`,
      `                    q.add(curr.right);`,
      `                }`,
      `                i++;`,
      `            }`,
      `        }`,
      `        return root;`,
      `    }`,
      ``,
      `    private static String treeToArrayString(TreeNode root) {`,
      `        if (root == null) return "[]";`,
      `        List<String> res = new ArrayList<>();`,
      `        Queue<TreeNode> q = new LinkedList<>();`,
      `        q.add(root);`,
      `        while (!q.isEmpty()) {`,
      `            TreeNode curr = q.poll();`,
      `            if (curr != null) {`,
      `                res.add(String.valueOf(curr.val));`,
      `                q.add(curr.left);`,
      `                q.add(curr.right);`,
      `            } else {`,
      `                res.add("null");`,
      `            }`,
      `        }`,
      `        while (!res.isEmpty() && res.get(res.size() - 1).equals("null")) {`,
      `            res.remove(res.size() - 1);`,
      `        }`,
      `        return res.toString().replace(" ", "");`,
      `    }`,
      ``,
      `    private static ListNode arrayToLinkedList(String str) {`,
      `        str = str.replace("[", "").replace("]", "").replace(" ", "").trim();`,
      `        if (str.isEmpty()) return null;`,
      `        String[] nodes = str.split(",");`,
      `        ListNode dummy = new ListNode(0);`,
      `        ListNode curr = dummy;`,
      `        for (String node : nodes) {`,
      `            if (!node.equals("null") && !node.isEmpty()) {`,
      `                curr.next = new ListNode(Integer.parseInt(node));`,
      `                curr = curr.next;`,
      `            }`,
      `        }`,
      `        return dummy.next;`,
      `    }`,
      ``,
      `    private static String linkedListToArrayString(ListNode head) {`,
      `        List<Integer> res = new ArrayList<>();`,
      `        ListNode curr = head;`,
      `        while (curr != null) {`,
      `            res.add(curr.val);`,
      `            curr = curr.next;`,
      `        }`,
      `        return res.toString().replace(" ", "");`,
      `    }`,
      ``,
      `    private static int[] parseJsonArray(String str) {`,
      `        str = str.replace("[", "").replace("]", "").replace(" ", "").trim();`,
      `        if (str.isEmpty()) return new int[0];`,
      `        String[] items = str.split(",");`,
      `        int[] res = new int[items.length];`,
      `        for (int i = 0; i < items.length; i++) {`,
      `            res[i] = Integer.parseInt(items[i]);`,
      `        }`,
      `        return res;`,
      `    }`,
      `}`
    ].join('\n');
    
    return driver;
  }
  
  return sourceCode;
}
