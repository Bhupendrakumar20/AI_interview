# 🚀 QUICK REFERENCE - Code Editor & Theme Integration

## 📌 Where Everything Is

### **Components**
```
✅ CodeEditorPanel.jsx        → Full-featured code editor
✅ ThemeToggle.jsx            → Theme switcher button  
✅ DSALiveRoom.jsx            → Integrated code editor
✅ AiBuddyInterviewSession.jsx → Text/Code mode switch
✅ TopBar.jsx                 → Theme toggle in header
```

### **Libraries**
```
✅ lib/theme-context.js  → Theme provider & hooks
✅ lib/piston-service.js → Code execution API
✅ lib/code-formatter.js → Formatting & syntax check
```

---

## 🎨 Adding Theme to Any Component

```jsx
import { useTheme } from '@/lib/theme-context';

export default function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

---

## 💻 Adding Code Editor to Any Component

```jsx
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function MyFeature() {
  const [language, setLanguage] = useState('javascript');
  
  return (
    <CodeEditorPanel
      language={language}
      onLanguageChange={setLanguage}
      initialCode="// Your code here"
      testCases={[{ stdin: '', expectedOutput: 'result' }]}
      onExecute={(result) => {
        console.log('Executed:', result.output);
      }}
    />
  );
}
```

---

## 🎭 Using Both Theme & CodeEditor

```jsx
import { useTheme } from '@/lib/theme-context';
import CodeEditorPanel from '@/components/CodeEditorPanel';

export default function FullFeature() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div className={isDark ? 'bg-slate-950' : 'bg-white'}>
      <CodeEditorPanel language="python" />
    </div>
  );
}
```

---

## 🌓 Theme Toggle Positions

### **Current**
- ✅ TopBar (Header) - Main location

### **Can Add To**
- DashboardNav
- SideBar
- Settings page
- Any navigation component

**Usage:**
```jsx
import ThemeToggle from '@/components/ThemeToggle';

<nav>
  <ThemeToggle />
  {/* Other nav items */}
</nav>
```

---

## 📊 Integrated Locations

| Page | Component | Feature |
|------|-----------|---------|
| DSA Room | CodeEditorPanel | Code execution |
| Interview | Text/Code toggle | Both modes |
| Header | ThemeToggle | Theme switch |
| All Pages | Theme context | Dark/Light |

---

## 🎯 Common Tasks

### **Switch Component to Dark/Light**
```jsx
const bgColor = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
const textColor = theme === 'dark' ? 'text-white' : 'text-black';
```

### **Run Code from Component**
```jsx
const result = await fetch('/api/code-executor/execute', {
  method: 'POST',
  body: JSON.stringify({
    sourceCode: code,
    language: 'javascript',
    stdin: ''
  })
});
const { output } = await result.json();
```

### **Get Supported Languages**
```jsx
const langs = await fetch('/api/code-executor/execute').then(r => r.json());
console.log(langs); // ['javascript', 'python', 'java', 'cpp', ...]
```

---

## 🔧 Customization Points

### **Colors** 
File: `components/CodeEditorPanel.jsx`
Lines: 15-25 (color definitions)

### **Languages**
File: `components/CodeEditorPanel.jsx`
Lines: 35-40 (language list)

### **Default Theme**
File: `lib/theme-context.js`
Line: 8 (default theme: 'dark')

### **Theme Styles**
File: `components/CodeEditorPanel.jsx`
Lines: 45-60+ (conditional classes)

---

## 💾 LocalStorage

**Theme Preference:**
```
Key: 'theme'
Values: 'dark' or 'light'
Saved: Yes (automatically)
```

### **Access in Console:**
```javascript
localStorage.getItem('theme')      // Current theme
localStorage.setItem('theme', 'light') // Set theme
```

---

## ⚡ Performance Tips

1. **Use useTheme hook** for real-time updates
2. **Memoize styled components** if rendering many
3. **CodeEditorPanel** handles its own performance
4. **Theme switching** is instant (no rerender needed)

---

## 🐛 Troubleshooting

### **Theme not switching?**
- Check browser console for errors
- Verify ThemeProvider in app/layout.jsx
- Clear localStorage: `localStorage.clear()`

### **Code editor not showing?**
- Check CodeEditorPanel import
- Verify language prop is set
- Check browser console for errors

### **Syntax errors not showing?**
- Language might be set incorrectly
- Check console for API errors
- Verify Piston API is accessible

---

## 📚 API Reference

### **useTheme Hook**
```javascript
const { theme, toggleTheme } = useTheme();
// theme: 'dark' | 'light'
// toggleTheme: Function
```

### **Code Execution**
```javascript
POST /api/code-executor/execute
{
  sourceCode: string,
  language: string,
  stdin?: string,
  testCases?: Array
}
```

### **Supported Languages**
- javascript, python, java, cpp, c, go, rust, ruby, php, swift

---

## ✨ Current Features

- ✅ Real-time code execution
- ✅ Syntax error detection
- ✅ Auto-formatting
- ✅ Test case runner
- ✅ Code statistics
- ✅ Dark/Light theme
- ✅ Responsive design
- ✅ Multiple languages

---

## 🎯 Integration Points Summary

**DSA Room:**
- Code editor for competitive coding
- Real-time execution
- Leaderboard integration

**Interview Mode:**
- Text or code answers
- Toggle between modes
- Test execution

**Global:**
- Theme switcher in header
- Persists across sessions
- Applies to all components

---

**Ready to use and extend!** 🚀

