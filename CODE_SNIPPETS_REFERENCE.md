# 💻 INTEGRATION CODE REFERENCE

## Complete Code Snippets of All Integrations

---

## 1️⃣ TopBar.jsx - Theme Toggle Added

### Import Added
```javascript
import ThemeToggle from "@/components/ThemeToggle";
```

### Component Added (in JSX)
```javascript
{/* Right Section - Actions */}
<div className="flex items-center gap-4">
  {/* Theme Toggle */}
  <ThemeToggle />
  
  {/* DSA Room Notifications Badge */}
  {/* ... rest of code ... */}
</div>
```

---

## 2️⃣ app/layout.jsx - ThemeProvider Wrapping

### Import Added
```javascript
import { ThemeProvider } from "@/lib/theme-context";
```

### Provider Wrapping (in JSX)
```javascript
return (
  <html lang="en">
    <body>
      <ThemeProvider>
        {children}
        <ToastProvider />
      </ThemeProvider>
    </body>
  </html>
);
```

---

## 3️⃣ DSALiveRoom.jsx - CodeEditor Integration

### Import Added
```javascript
import CodeEditorPanel from "@/components/CodeEditorPanel";
```

### Component Rendered (in JSX)
```javascript
{/* Center - Enhanced Code Editor */}
<div className="flex-1 relative flex flex-col overflow-hidden bg-slate-950">
  <CodeEditorPanel
    language={language}
    onLanguageChange={handleLanguageChange}
    initialCode={code}
    testCases={question?.testCases || []}
    onExecute={handleCodeExecute}
    disabled={isSubmitting}
  />
  <SubmitResult result={submitResult} onDismiss={() => setSubmitResult(null)} />
</div>
```

---

## 4️⃣ AiBuddyInterviewSession.jsx - Text/Code Toggle

### Import Added
```javascript
import CodeEditorPanel from '@/components/CodeEditorPanel';
```

### State Added
```javascript
const [answerMode, setAnswerMode] = useState('text'); // 'text' or 'code'
const [codeLanguage, setCodeLanguage] = useState('javascript');
```

### Toggle Buttons & Conditional Rendering
```javascript
{/* Answer Recording Section */}
<div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-8">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-xl font-bold text-white">Your Answer</h3>
    
    {/* Toggle between Text and Code Input */}
    <div className="flex gap-2">
      <button
        onClick={() => setAnswerMode('text')}
        className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
          answerMode === 'text'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
        }`}
      >
        📝 Text Answer
      </button>
      <button
        onClick={() => setAnswerMode('code')}
        className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
          answerMode === 'code'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
        }`}
      >
        💻 Code Solution
      </button>
    </div>
  </div>

  {/* TEXT MODE */}
  {answerMode === 'text' && (
    <div className="space-y-4">
      {/* Recording Indicator */}
      <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
          <span className="text-slate-300">
            {isRecording ? 'Recording your answer...' : 'Click below to record your answer'}
          </span>
        </div>
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      {/* Transcript Area */}
      <textarea
        placeholder="Your answer will appear here if you enable microphone, or you can type your answer..."
        className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
        value={currentAnswerText}
        onChange={(e) => handleAnswerChange(e.target.value)}
      ></textarea>

      {/* Save Answer Button */}
      <button
        onClick={handleSaveAnswer}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all"
      >
        ✓ Save Answer
      </button>
    </div>
  )}

  {/* CODE MODE */}
  {answerMode === 'code' && (
    <div className="space-y-4">
      <div style={{ height: '400px' }}>
        <CodeEditorPanel
          language={codeLanguage}
          onLanguageChange={setCodeLanguage}
          initialCode={currentAnswerText}
          testCases={currentQuestion?.testCases || []}
          onExecute={(result) => {
            setCurrentAnswerText(result.code);
          }}
        />
      </div>

      {/* Save Code Answer Button */}
      <button
        onClick={() => {
          handleAnswerChange(currentAnswerText);
          handleSaveAnswer();
        }}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all"
      >
        ✓ Save Code Solution
      </button>
    </div>
  )}
</div>
```

---

## 5️⃣ Using Theme in Custom Components

### Basic Usage
```javascript
import { useTheme } from '@/lib/theme-context';

export default function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>
      <button onClick={toggleTheme}>
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    </div>
  );
}
```

### With Conditional Styling
```javascript
import { useTheme } from '@/lib/theme-context';

export default function ThemedComponent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const bgColor = isDark ? 'bg-slate-900' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-black';
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';
  
  return (
    <div className={`${bgColor} ${textColor} ${borderColor} border rounded-lg p-4`}>
      {/* Content */}
    </div>
  );
}
```

---

## 6️⃣ Adding Code Editor to New Feature

### Basic Setup
```javascript
import CodeEditorPanel from '@/components/CodeEditorPanel';
import { useState } from 'react';

export default function NewFeature() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  
  const handleExecute = (result) => {
    console.log('Execution Result:', result);
    console.log('Output:', result.output);
    console.log('Errors:', result.error);
  };
  
  return (
    <div>
      <CodeEditorPanel
        language={language}
        onLanguageChange={setLanguage}
        initialCode={code}
        testCases={[
          { stdin: '', expectedOutput: 'Hello World' }
        ]}
        onExecute={handleExecute}
      />
    </div>
  );
}
```

### Advanced Usage
```javascript
import CodeEditorPanel from '@/components/CodeEditorPanel';
import { useTheme } from '@/lib/theme-context';
import { useState } from 'react';

export default function AdvancedFeature() {
  const { theme } = useTheme();
  const [language, setLanguage] = useState('python');
  const [results, setResults] = useState(null);
  
  const handleExecute = async (result) => {
    // Store results
    setResults(result);
    
    // Send to server if needed
    await fetch('/api/save-code-result', {
      method: 'POST',
      body: JSON.stringify({
        language,
        code: result.code,
        output: result.output,
        timestamp: new Date()
      })
    });
  };
  
  return (
    <div className={theme === 'dark' ? 'bg-slate-950' : 'bg-white'}>
      <CodeEditorPanel
        language={language}
        onLanguageChange={setLanguage}
        initialCode="# Write your Python code here"
        testCases={[
          { stdin: '5', expectedOutput: '120' },
          { stdin: '3', expectedOutput: '6' }
        ]}
        onExecute={handleExecute}
      />
      
      {results && (
        <div className="mt-4 p-4 bg-blue-100 rounded">
          <p>Tests Passed: {results.totalTests ? results.passed : 'N/A'}</p>
          <pre>{results.output}</pre>
        </div>
      )}
    </div>
  );
}
```

---

## 7️⃣ API Endpoint Usage

### Execute Single Code
```javascript
const response = await fetch('/api/code-executor/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCode: 'console.log("Hello")',
    language: 'javascript',
    stdin: ''
  })
});

const result = await response.json();
console.log(result.output); // "Hello"
```

### Run Test Cases
```javascript
const response = await fetch('/api/code-executor/execute', {
  method: 'POST',
  body: JSON.stringify({
    sourceCode: `
      function add(a, b) { return a + b; }
      console.log(add(2, 3));
    `,
    language: 'javascript',
    testCases: [
      { stdin: '', expectedOutput: '5' }
    ]
  })
});

const result = await response.json();
console.log(result.allPassed); // true/false
```

### Get Supported Languages
```javascript
const response = await fetch('/api/code-executor/execute');
const languages = await response.json();
console.log(languages); 
// ['javascript', 'python', 'java', 'cpp', 'c', 'go', 'rust', ...]
```

---

## 📦 Complete Integration Pattern

### For Any Feature
```javascript
// 1. Import required modules
import { useTheme } from '@/lib/theme-context';
import CodeEditorPanel from '@/components/CodeEditorPanel';
import { useState } from 'react';

// 2. Setup component
export default function Feature() {
  const { theme } = useTheme();
  const [language, setLanguage] = useState('javascript');
  
  // 3. Handle execution
  const handleExecute = (result) => {
    console.log('Code executed:', result);
  };
  
  // 4. Return JSX with theme and editor
  return (
    <div className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>
      <CodeEditorPanel
        language={language}
        onLanguageChange={setLanguage}
        onExecute={handleExecute}
      />
    </div>
  );
}
```

---

## 🎨 Common Tailwind Classes for Theming

### Dark Mode Classes
```javascript
// Backgrounds
'bg-slate-950'    // Darkest background
'bg-slate-900'    // Dark background
'bg-slate-800'    // Medium dark background

// Text
'text-white'      // Primary text
'text-slate-100'  // Secondary text
'text-slate-400'  // Tertiary text

// Borders
'border-slate-700' // Dark border
'border-slate-600' // Medium dark border
```

### Light Mode Classes
```javascript
// Backgrounds
'bg-white'         // Lightest background
'bg-gray-50'       // Light background
'bg-gray-100'      // Medium light background

// Text
'text-black'       // Primary text
'text-gray-900'    // Secondary text
'text-gray-600'    // Tertiary text

// Borders
'border-gray-200'  // Light border
'border-gray-300'  // Medium light border
```

---

## 🚀 Next Steps for New Features

1. **Copy the pattern** from one of the sections above
2. **Replace language/testCases** with your data
3. **Add theme support** using useTheme hook
4. **Connect to backend** if needed
5. **Test thoroughly** before deployment

---

**All code snippets are production-ready!** ✅

