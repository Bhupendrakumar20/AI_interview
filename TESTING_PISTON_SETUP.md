# Testing & Verification Checklist

## ✅ PRE-FLIGHT CHECKS

### 1. **Verify Piston API Connectivity**
```bash
# Test Piston endpoint
curl https://emkc.org/api/v2/piston/runtimes

# Expected: Returns list of available runtimes
```

### 2. **Check Node Modules**
```bash
npm list piston-service
npm list code-formatter
```

### 3. **File Structure Verification**
- [ ] `app/api/code-executor/execute/route.js` exists
- [ ] `lib/piston-service.js` exists  
- [ ] `lib/code-formatter.js` exists
- [ ] `components/CodeEditorPanel.jsx` exists

---

## 🧪 QUICK TESTS

### **Test 1: API Direct Call**

```javascript
// Open browser console and run:
fetch('/api/code-executor/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCode: 'console.log("Hello, Piston!");',
    language: 'javascript',
  }),
})
.then(r => r.json())
.then(data => console.log(data));

// Expected output:
// { success: true, output: "Hello, Piston!\n", error: "", exitCode: 0 }
```

### **Test 2: Python Execution**

```javascript
fetch('/api/code-executor/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCode: 'print("Python works!")',
    language: 'python',
  }),
})
.then(r => r.json())
.then(data => console.log(data));
```

### **Test 3: Test Case Runner**

```javascript
fetch('/api/code-executor/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCode: `
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
console.log(factorial(5));
    `,
    language: 'javascript',
    testCases: [
      { stdin: '', expectedOutput: '120' },
    ],
  }),
})
.then(r => r.json())
.then(data => console.log(data));
```

### **Test 4: Error Handling**

```javascript
fetch('/api/code-executor/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCode: 'console.log(undefined_var);',
    language: 'javascript',
  }),
})
.then(r => r.json())
.then(data => console.log(data));

// Expected: Returns error in response
```

---

## 🎨 Component Testing

### **Test 5: Load Component**

Create test file: `test-code-editor.jsx`

```jsx
'use client';
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function TestEditor() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <CodeEditorPanel
        language="javascript"
        initialCode="console.log('Test');"
        testCases={[
          { stdin: '', expectedOutput: 'Test' },
        ]}
        onExecute={(result) => {
          console.log('Execution result:', result);
        }}
      />
    </div>
  );
}
```

Then load at: `http://localhost:3000/test-code-editor`

---

## 📋 FUNCTIONALITY CHECKLIST

### **Code Formatting**
```javascript
import { formatCode } from '@/lib/code-formatter';

// Test
const code = 'let x=1+2';
const formatted = formatCode(code, 'javascript');
console.log(formatted); // Should have spaces around operators
```

### **Syntax Error Detection**
```javascript
import { detectSyntaxErrors } from '@/lib/code-formatter';

const errors = detectSyntaxErrors(
  'function test() { console.log("hi")',
  'javascript'
);
console.log(errors); // Should detect unmatched brace
```

### **Code Statistics**
```javascript
import { getCodeStats } from '@/lib/code-formatter';

const stats = getCodeStats('function test() {\n  return 42;\n}');
console.log(stats);
// {
//   totalLines: 3,
//   nonEmptyLines: 3,
//   codeLines: 3,
//   ...
// }
```

---

## 🔍 COMMON ISSUES & FIXES

### **Issue: "Cannot find module 'piston-service'"**
**Solution:** 
- Check file path: `lib/piston-service.js` should exist
- Verify import: `import { ... } from '@/lib/piston-service'`

### **Issue: API returns 404**
**Solution:**
- Check route file exists: `app/api/code-executor/execute/route.js`
- Restart Next.js dev server
- Clear `.next` folder and rebuild

### **Issue: Code runs but no output**
**Solution:**
- Ensure code has `console.log()` or `print()` statements
- Check stdin is properly formatted
- Verify language is correct

### **Issue: "Execution timeout"**
**Solution:**
- Code might have infinite loop
- Reduce code complexity
- Check Piston API status

### **Issue: Component not rendering**
**Solution:**
- Ensure it's a client component (`'use client'`)
- Check all imports are correct
- Verify dependencies installed: `npm install lucide-react`

---

## 🚀 PERFORMANCE BENCHMARKS

Run these to check performance:

```javascript
// Benchmark: JavaScript execution
console.time('JS execution');
await fetch('/api/code-executor/execute', {
  method: 'POST',
  body: JSON.stringify({
    sourceCode: 'console.log("test");',
    language: 'javascript',
  }),
});
console.timeEnd('JS execution');

// Expected: 100-300ms

// Benchmark: Multiple test cases
console.time('Multiple tests');
await fetch('/api/code-executor/execute', {
  method: 'POST',
  body: JSON.stringify({
    sourceCode: 'x => x * 2',
    language: 'javascript',
    testCases: Array(5).fill().map((_, i) => ({
      stdin: String(i),
      expectedOutput: String(i * 2),
    })),
  }),
});
console.timeEnd('Multiple tests');

// Expected: 200-500ms
```

---

## 📊 SUPPORTED LANGUAGES TEST

```javascript
// Get all supported languages
fetch('/api/code-executor/execute')
  .then(r => r.json())
  .then(data => {
    console.log('Supported:', data.supportedLanguages);
    // Should list: javascript, python, java, cpp, c, go, rust, ruby, etc.
  });
```

---

## ✨ FEATURE VERIFICATION

### **Feature: Live Syntax Checking**
- [ ] Open CodeEditorPanel
- [ ] Type incomplete code: `function test() {`
- [ ] Should show "Unmatched braces" warning

### **Feature: Code Formatting**
- [ ] Paste ugly code: `let x=1+2;let y=3*4;`
- [ ] Click "Format" button
- [ ] Should space out operators

### **Feature: Code Statistics**
- [ ] Any code in editor
- [ ] Click "Stats" tab
- [ ] Should show lines, characters, comments

### **Feature: Test Runner**
- [ ] Provide test cases
- [ ] Click "Run Code"
- [ ] Should show pass/fail for each test

### **Feature: Execution Timing**
- [ ] Execute any code
- [ ] Should show execution time in ms

---

## 📝 INTEGRATION TEST

Test in actual feature:

```jsx
// In your DSA Room or Interview component:
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function QuestionPage() {
  const testCases = [
    { stdin: '5', expectedOutput: 'Fibonacci(5) = 5' },
    { stdin: '3', expectedOutput: 'Fibonacci(3) = 2' },
  ];

  return (
    <CodeEditorPanel
      language="javascript"
      testCases={testCases}
      onExecute={(result) => {
        console.log('User code:', result.code);
        console.log('Output:', result.output);
        // Save to database, update score, etc.
      }}
    />
  );
}
```

---

## 🎯 EXPECTED BEHAVIOR

| Action | Expected Result |
|--------|-----------------|
| Load component | Shows dark editor with toolbar |
| Type code | Syntax highlighting works |
| Click Format | Code gets spaced/formatted |
| Click Check Syntax | Shows any syntax issues |
| Click Run | Shows output/errors below |
| Change language | Dropdown updates language |
| Provide test cases | Shows pass/fail results |
| Click Stats | Shows code statistics |

---

## ✅ SIGN-OFF CHECKLIST

- [ ] API endpoint responds correctly
- [ ] All 4 languages execute (JS, Python, Java, C++)
- [ ] Code formatting works
- [ ] Syntax errors detected
- [ ] Component renders without errors
- [ ] Test cases run and show results
- [ ] Execution timing displayed
- [ ] Error messages clear
- [ ] Performance acceptable (<1s for simple code)
- [ ] All UI buttons functional

**If all checked**, you're ready to integrate into DSA Room! 🚀

