# Complete Piston Code Executor Setup Guide

## ✅ WHAT'S NOW IMPLEMENTED

### 1. **API Route** ✅
**File**: `app/api/code-executor/execute/route.js`
- POST endpoint for code execution
- Supports single runs and multiple test cases
- Error handling & validation
- GET endpoint to list supported languages

### 2. **Code Formatter** ✅
**File**: `lib/code-formatter.js`
- Auto-format code (JavaScript, Python, Java, C++)
- Real-time syntax error detection
- Code statistics (lines, characters, comments)
- Line highlighting for errors

### 3. **Enhanced Code Editor Component** ✅
**File**: `components/CodeEditorPanel.jsx`
- Multiple language support (JS, Python, Java, C++)
- Real-time formatting
- Syntax checking
- Test runner with pass/fail indicators
- Code statistics dashboard
- Output/Error display
- Execution timing

### 4. **Piston Service** ✅
**File**: `lib/piston-service.js`
- executeCode() - Run single code
- runTestCase() - Run with expected output checking
- runAllTestCases() - Batch test execution
- Language detection & mapping

---

## 🚀 HOW TO USE

### **Option A: Use in DSA Room**

```jsx
// In your DSA room component
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function DSARoom() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [testCases, setTestCases] = useState([
    { stdin: '5', expectedOutput: '120' },
    { stdin: '3', expectedOutput: '6' },
  ]);

  return (
    <CodeEditorPanel
      language={selectedLanguage}
      onLanguageChange={setSelectedLanguage}
      testCases={testCases}
      onExecute={(result) => {
        console.log('Code executed:', result);
        // Handle results (send to server, update score, etc)
      }}
    />
  );
}
```

### **Option B: Direct API Usage**

```javascript
// Execute code via API
const executeCode = async () => {
  const response = await fetch('/api/code-executor/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceCode: 'console.log("Hello");',
      language: 'javascript',
    }),
  });

  const data = await response.json();
  console.log(data);
  // { success: true, output: "Hello", error: "", exitCode: 0 }
};
```

### **Option C: Use Services Directly**

```javascript
import { 
  executeCode, 
  runTestCase, 
  runAllTestCases 
} from '@/lib/piston-service';

// Single execution
const result = await executeCode({
  sourceCode: 'print("hello")',
  language: 'python',
  stdin: 'world',
});

// Single test
const test = await runTestCase({
  sourceCode: 'def factorial(n): return 1 if n <= 1 else n * factorial(n-1)',
  language: 'python',
  input: '5',
  expectedOutput: '120',
});

// Multiple tests
const tests = await runAllTestCases({
  sourceCode: 'function sum(a, b) { return a + b; }',
  language: 'javascript',
  testCases: [
    { input: '1 2', expected: '3' },
    { input: '5 7', expected: '12' },
  ],
});
```

---

## 📚 SUPPORTED LANGUAGES

| Language | ID | File Extension | Notes |
|----------|----|----|-------|
| JavaScript | javascript | .js | Full ES6+ support |
| Python | python | .py | Python 3.x |
| Java | java | .java | Requires main method |
| C++ | cpp | .cpp | STL included |
| C | c | .c | POSIX compatible |
| Ruby | ruby | .rb | Latest stable |
| Go | go | .go | 1.x+ |
| Rust | rust | .rs | 2021 edition |

---

## 🔧 FEATURES & CUSTOMIZATION

### **Code Formatting**
```javascript
import { formatCode } from '@/lib/code-formatter';

const formatted = formatCode(
  'let x=1+2;',
  'javascript'
);
// Result: "let x = 1 + 2;"
```

### **Syntax Error Detection**
```javascript
import { detectSyntaxErrors } from '@/lib/code-formatter';

const errors = detectSyntaxErrors(
  'function test() { console.log("hi")',
  'javascript'
);
// [{ line: 1, message: "Unmatched braces", severity: "warning" }]
```

### **Code Statistics**
```javascript
import { getCodeStats } from '@/lib/code-formatter';

const stats = getCodeStats(code);
// {
//   totalLines: 10,
//   nonEmptyLines: 8,
//   commentLines: 2,
//   codeLines: 6,
//   characters: 247,
//   words: 45
// }
```

---

## 📊 COMPONENT PROPS

```jsx
<CodeEditorPanel
  // Code language
  language="javascript"
  
  // Callback when language is changed
  onLanguageChange={(newLang) => console.log(newLang)}
  
  // Callback when code is executed
  onExecute={(result) => {
    console.log(result);
    // {
    //   code: string,
    //   output: string,
    //   language: string
    // }
  }}
  
  // Initial code to show
  initialCode="console.log('hello');"
  
  // Test cases to run
  testCases={[
    { stdin: 'input1', expectedOutput: 'output1' },
    { stdin: 'input2', expectedOutput: 'output2' },
  ]}
  
  // Disable execution (bool)
  disabled={false}
/>
```

---

## 🎯 API ENDPOINT REFERENCE

### **POST /api/code-executor/execute**

**Request:**
```json
{
  "sourceCode": "console.log('hello');",
  "language": "javascript",
  "stdin": "optional input",
  "testCases": [
    {
      "stdin": "5",
      "expectedOutput": "120"
    }
  ]
}
```

**Response (Single Execution):**
```json
{
  "success": true,
  "output": "hello",
  "error": "",
  "exitCode": 0,
  "language": "javascript"
}
```

**Response (Test Cases):**
```json
{
  "success": true,
  "totalTests": 2,
  "passed": 1,
  "failed": 1,
  "allPassed": false,
  "results": [
    {
      "passed": true,
      "output": "120",
      "expectedOutput": "120",
      "testInput": "5"
    }
  ]
}
```

### **GET /api/code-executor/execute**

Returns supported languages:
```json
{
  "supportedLanguages": ["javascript", "python", "java", "cpp", ...],
  "pistonLanguages": ["javascript", "python", "java", "cpp", ...]
}
```

---

## ⚙️ CONFIGURATION

### **No configuration needed!**
- Piston API URL already set: `https://emkc.org/api/v2/piston`
- No API keys required
- Works immediately

### **Optional: Self-host Piston**
If needed, change in `lib/piston-service.js`:
```javascript
const PISTON_API_URL = process.env.PISTON_API_URL || 'http://localhost:2358';
```

---

## 📝 INTEGRATION EXAMPLES

### **Example 1: DSA Problem Solver**
```jsx
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function DSAProblem({ problem }) {
  const [solved, setSolved] = useState(false);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h2>{problem.title}</h2>
        <p>{problem.description}</p>
      </div>
      
      <CodeEditorPanel
        language={problem.preferredLanguage}
        testCases={problem.testCases}
        onExecute={(result) => {
          if (result.allPassed) {
            setSolved(true);
          }
        }}
      />
    </div>
  );
}
```

### **Example 2: Interview Mode**
```jsx
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function InterviewMode() {
  const [submissions, setSubmissions] = useState([]);

  const handleExecute = (result) => {
    setSubmissions([...submissions, {
      timestamp: new Date(),
      code: result.code,
      output: result.output,
      language: result.language,
    }]);
  };

  return (
    <div>
      <CodeEditorPanel
        onExecute={handleExecute}
        initialCode={defaultCode}
      />
      
      <div>
        <h3>Submissions ({submissions.length})</h3>
        {submissions.map((sub, i) => (
          <div key={i}>
            <p>{sub.timestamp.toLocaleTimeString()}</p>
            <p>Output: {sub.output}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### **Example 3: Live Coding Session**
```jsx
import { useState } from 'react';
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function LiveCoding({ roomId }) {
  const [language, setLanguage] = useState('javascript');

  // Sync code via WebSocket
  useEffect(() => {
    socket.on('code-update', (code) => {
      // Update editor with code from other users
    });

    socket.on('execution-result', (result) => {
      // Show results from server execution
    });
  }, []);

  return (
    <CodeEditorPanel
      language={language}
      onLanguageChange={(lang) => {
        setLanguage(lang);
        socket.emit('language-change', lang);
      }}
      onExecute={(result) => {
        socket.emit('code-executed', result);
      }}
    />
  );
}
```

---

## 🐛 TROUBLESHOOTING

### **"Code execution failed"**
- Check Piston API is online: `https://emkc.org/api/v2/piston/runtimes`
- Check network connectivity

### **"Syntax errors not detected"**
- Some languages have limited syntax checking
- Check `lib/code-formatter.js` for your language

### **"Code runs but output is empty"**
- Ensure you're printing output
- Check if stdin is being used correctly
- Some languages may need explicit output commands

### **"Memory limit exceeded"**
- Code has infinite loop or uses too much memory
- Piston has default timeout of 5s

---

## 📊 PERFORMANCE NOTES

| Aspect | Details |
|--------|---------|
| Execution Time | Typically 100-500ms per run |
| Max Code Size | ~10KB (Piston limit) |
| Max Output | ~100KB |
| Timeout | 5 seconds per execution |
| Languages | 40+ supported |
| Rate Limit | None (free tier) |

---

## ✨ WHAT YOU GET

- ✅ Professional code editor feel
- ✅ Real-time code formatting
- ✅ Syntax error detection
- ✅ Multi-language support
- ✅ Test case runner
- ✅ Execution timing
- ✅ Code statistics
- ✅ Beautiful UI with dark theme
- ✅ Responsive design
- ✅ Copy/Clear buttons
- ✅ Output streaming
- ✅ Error handling

---

## 🚀 NEXT STEPS

1. **Import CodeEditorPanel** into your components
2. **Test with sample code** to verify it works
3. **Integrate into DSA Room** for live coding
4. **Add to Interview Mode** for problem solving
5. **Customize styling** to match your brand

---

## 📞 QUICK REFERENCE

```javascript
// API endpoint
POST /api/code-executor/execute

// Main component
<CodeEditorPanel />

// Services
executeCode()
runTestCase()
runAllTestCases()

// Utilities
formatCode()
detectSyntaxErrors()
getCodeStats()
```

That's it! Your code executor is ready to use! 🎉
