# Quick Integration Examples - Copy & Paste Ready

## 🎯 EXAMPLE 1: DSA Room Integration

**File**: `components/DSALiveRoom.jsx` (Add this section)

```jsx
'use client';

import { useState, useEffect } from 'react';
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function DSALiveRoom({ roomCode }) {
  const [question, setQuestion] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [submissions, setSubmissions] = useState([]);
  const [solved, setSolved] = useState(false);

  // Load question on mount
  useEffect(() => {
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    // Fetch from your backend
    const res = await fetch(`/api/dsa-room/${roomCode}/question`);
    const data = await res.json();
    setQuestion(data);
  };

  const handleExecuteCode = async (result) => {
    // Save submission
    const submission = {
      code: result.code,
      language: result.language,
      output: result.output,
      timestamp: new Date(),
      status: 'submitted',
    };

    setSubmissions([...submissions, submission]);

    // Send to backend to check if correct
    const checkRes = await fetch(`/api/dsa-room/${roomCode}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: result.code,
        language: result.language,
        questionId: question.id,
      }),
    });

    const checkData = await checkRes.json();

    if (checkData.correct) {
      setSolved(true);
      // Show celebration, update leaderboard, etc.
    }
  };

  if (!question) return <div>Loading question...</div>;

  return (
    <div className="grid grid-cols-2 gap-6 h-screen p-6 bg-slate-950">
      
      {/* LEFT: Problem Description */}
      <div className="overflow-auto bg-slate-900 rounded-lg p-6 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-4">{question.title}</h1>
        
        <div className="text-slate-300 space-y-4 mb-6">
          <div>
            <h3 className="text-yellow-400 font-semibold">Difficulty</h3>
            <p>{question.difficulty}</p>
          </div>

          <div>
            <h3 className="text-yellow-400 font-semibold">Description</h3>
            <p>{question.description}</p>
          </div>

          <div>
            <h3 className="text-yellow-400 font-semibold">Constraints</h3>
            <ul className="list-disc pl-5">
              {question.constraints?.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          {question.examples && (
            <div>
              <h3 className="text-yellow-400 font-semibold">Examples</h3>
              {question.examples.map((ex, i) => (
                <div key={i} className="bg-slate-800 p-3 rounded mt-2 font-mono text-sm">
                  <p>Input: {ex.input}</p>
                  <p>Output: {ex.output}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {solved && (
          <div className="bg-green-900 border border-green-700 p-4 rounded text-green-300">
            ✓ Problem Solved! Check the leaderboard.
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-700">
          <h3 className="text-slate-400 text-sm mb-3">Previous Submissions ({submissions.length})</h3>
          <div className="space-y-2 max-h-40 overflow-auto">
            {submissions.map((sub, i) => (
              <div key={i} className="text-xs bg-slate-800 p-2 rounded">
                <p className="text-slate-400">{sub.language} • {sub.timestamp.toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Code Editor */}
      <CodeEditorPanel
        language={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        testCases={question.testCases}
        onExecute={handleExecuteCode}
        initialCode={question.starterCode?.[selectedLanguage] || ''}
      />
    </div>
  );
}
```

---

## 🎯 EXAMPLE 2: Interview Mode Integration

**File**: `components/InterviewBuddy.jsx` (Add this)

```jsx
'use client';

import { useState } from 'react';
import CodeEditorPanel from '@/components/CodeEditorPanel';
import { generateFeedback } from '@/lib/ai-feedback'; // Your AI feedback service

export default function InterviewBuddySession({ problem, sessionId }) {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleExecuteCode = async (result) => {
    setCode(result.code);

    // Save code execution
    await fetch(`/api/interview/${sessionId}/submission`, {
      method: 'POST',
      body: JSON.stringify({
        code: result.code,
        language: result.language,
        output: result.output,
      }),
    });

    // Generate AI feedback
    if (problem.expectedApproach) {
      setAnalyzing(true);
      const feedbackData = await generateFeedback({
        problem: problem.description,
        userCode: result.code,
        userOutput: result.output,
        expectedApproach: problem.expectedApproach,
      });
      setFeedback(feedbackData);
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-screen p-4">
      
      {/* LEFT: Problem + AI Feedback */}
      <div className="overflow-auto space-y-4">
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-3">{problem.title}</h2>
          <p className="text-slate-300">{problem.description}</p>
        </div>

        {feedback && (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-3">
            <h3 className="text-white font-bold">📝 AI Feedback</h3>
            
            <div>
              <p className="text-yellow-400 text-sm font-semibold">Approach</p>
              <p className="text-slate-300 text-sm">{feedback.approach}</p>
            </div>

            <div>
              <p className="text-green-400 text-sm font-semibold">Strengths</p>
              <ul className="text-slate-300 text-sm pl-4 list-disc">
                {feedback.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div>
              <p className="text-orange-400 text-sm font-semibold">Improvements</p>
              <ul className="text-slate-300 text-sm pl-4 list-disc">
                {feedback.improvements?.map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            </div>

            <div>
              <p className="text-blue-400 text-sm font-semibold">Score: {feedback.score}/10</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Code Editor */}
      <CodeEditorPanel
        language="javascript"
        testCases={problem.testCases}
        onExecute={handleExecuteCode}
        disabled={analyzing}
      />
    </div>
  );
}
```

---

## 🎯 EXAMPLE 3: Quick Code Tester

**File**: `app/(root)/tools/code-tester/page.jsx` (New page)

```jsx
'use client';

import { useState } from 'react';
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function CodeTesterPage() {
  const [language, setLanguage] = useState('javascript');

  const exampleCodes = {
    javascript: `function helloWorld() {
  return "Hello, World!";
}

console.log(helloWorld());`,

    python: `def hello_world():
    return "Hello, World!"

print(hello_world())`,

    java: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,

    cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        <h1 className="text-3xl font-bold text-white mb-2">Code Tester</h1>
        <p className="text-slate-400 mb-6">
          Test code in multiple languages instantly
        </p>

        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden" 
             style={{ height: 'calc(100vh - 200px)' }}>
          <CodeEditorPanel
            language={language}
            onLanguageChange={setLanguage}
            initialCode={exampleCodes[language]}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 EXAMPLE 4: Batch Test Executor

**File**: `lib/batch-test-executor.js`

```javascript
/**
 * Run multiple test cases against code
 */

export async function runBatchTests(sourceCode, language, testCases) {
  const response = await fetch('/api/code-executor/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceCode,
      language,
      testCases,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return {
    success: data.allPassed,
    totalTests: data.totalTests,
    passed: data.passed,
    failed: data.failed,
    results: data.results,
    passPercentage: Math.round((data.passed / data.totalTests) * 100),
  };
}

/**
 * Run code and return formatted results
 */
export async function executeAndFormat(code, language) {
  const response = await fetch('/api/code-executor/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceCode: code,
      language,
    }),
  });

  const data = await response.json();

  return {
    success: data.success,
    output: data.output,
    error: data.error,
    exitCode: data.exitCode,
  };
}

/**
 * Check if solution is correct
 */
export async function checkSolution(code, language, expectedOutput, testInput = '') {
  const result = await executeAndFormat(code, language);

  return {
    correct: result.output.trim() === expectedOutput.trim(),
    actual: result.output,
    expected: expectedOutput,
    error: result.error,
  };
}
```

**Usage:**
```javascript
import { runBatchTests, checkSolution } from '@/lib/batch-test-executor';

// Check if solution is correct
const isCorrect = await checkSolution(
  'console.log("5");',
  'javascript',
  '5'
);

// Run multiple tests
const results = await runBatchTests(
  'const add = (a, b) => a + b; console.log(add(2, 3));',
  'javascript',
  [
    { stdin: '', expectedOutput: '5' },
  ]
);
```

---

## 🎯 EXAMPLE 5: Admin Dashboard Integration

**File**: `components/admin/CodeExecutionStats.jsx`

```jsx
'use client';

import { useEffect, useState } from 'react';

export default function CodeExecutionStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const res = await fetch('/api/admin/code-execution/stats');
    const data = await res.json();
    setStats(data);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Total Executions"
        value={stats.totalExecutions}
        color="blue"
      />
      <StatCard
        label="Success Rate"
        value={`${stats.successRate}%`}
        color="green"
      />
      <StatCard
        label="Avg Exec Time"
        value={`${stats.avgExecutionTime}ms`}
        color="purple"
      />
      <StatCard
        label="Popular Language"
        value={stats.mostUsedLanguage}
        color="orange"
      />
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-900',
    green: 'bg-green-900',
    purple: 'bg-purple-900',
    orange: 'bg-orange-900',
  };

  return (
    <div className={`${colors[color]} p-6 rounded-lg`}>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
```

---

## 🎯 EXAMPLE 6: API Usage in Server Actions

**File**: `app/actions/code-execution.js`

```javascript
'use server';

import { executeCode, runAllTestCases } from '@/lib/piston-service';

export async function executeUserCode(sourceCode, language, testCases) {
  try {
    const result = await runAllTestCases({
      sourceCode,
      language,
      testCases,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function validateSolution(sourceCode, language, expectedOutput) {
  try {
    const result = await executeCode({
      sourceCode,
      language,
      stdin: '',
    });

    const correct = result.output.trim() === expectedOutput.trim();

    return {
      success: true,
      correct,
      output: result.output,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

**Usage in Client Component:**
```jsx
'use client';

import { executeUserCode } from '@/app/actions/code-execution';

export default function TestComponent() {
  const handleRun = async () => {
    const result = await executeUserCode(
      'console.log("test");',
      'javascript',
      []
    );
    console.log(result);
  };

  return <button onClick={handleRun}>Execute</button>;
}
```

---

## 📋 COPY THESE TO GET STARTED

1. **CodeEditorPanel** → Use in any feature
2. **API Route** → Already created at `/api/code-executor/execute`
3. **Services** → Use `piston-service.js` functions
4. **Examples above** → Copy & customize for your needs

---

## ✨ That's It!

You now have a complete, production-ready code execution system! 🚀

Just integrate these examples into your DSA Room, Interview Mode, or wherever you need code execution.

