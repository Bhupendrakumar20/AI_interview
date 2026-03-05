# 100 Days of Code - Architecture & Implementation

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js/React)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Page: /100-days-of-code                                    │
│  ├── Search Input                                            │
│  ├── Topic Filters                                           │
│  ├── Difficulty Filters                                      │
│  ├── LeetCode Stats Section                                  │
│  └── Day Cards (Expandable)                                  │
│      ├── DayCard Component                                   │
│      │   ├── Day Header (Collapsible)                        │
│      │   └── Questions List (Hidden until expanded)          │
│      │       ├── Question Item                               │
│      │       └── Actions (View Details, External Links)      │
│      └── QuestionDetailsModal                                │
│          ├── Problem Description                             │
│          ├── Language Selector                               │
│          ├── Code Block (Syntax Highlighted)                 │
│          ├── Copy Button                                     │
│          └── External Links                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
              ↓                                    ↓
┌─────────────────────────────┐    ┌──────────────────────┐
│  Constants & Data Layer     │    │   API Layer          │
├─────────────────────────────┤    ├──────────────────────┤
│                             │    │                      │
│ Constants:                  │    │ POST /api/leetcode   │
│ ├── hundredDaysOfCode.js    │    │   ↓                  │
│ │   ├── Day Objects         │    │ GraphQL Query        │
│ │   ├── Questions Array     │    │   ↓                  │
│ │   └── Solution Code       │    │ LeetCode API         │
│ │                           │    │ (External Service)   │
│ └── dsa-helpers.js          │    │                      │
│     ├── Export Functions    │    └──────────────────────┘
│     ├── Filter Functions    │
│     ├── Progress Tracking   │
│     └── Utility Methods     │
│                             │
└─────────────────────────────┘
```

## 📁 Component Tree

```
Page (100-days-of-code)
│
├── Header Section
│   └── Title & Description
│
├── LeetCode Stats Section
│   ├── Input Field
│   ├── Fetch Button
│   └── Stats Grid (4 cards)
│
├── Search & Filter Section
│   ├── Search Input
│   └── Filter Buttons
│       ├── Topic Filters
│       └── Difficulty Filters
│
├── Days Container
│   └── DayCard[] (Repeating)
│       ├── Day Header (Collapsible)
│       │   ├── Day Badge
│       │   ├── Day Title
│       │   ├── Question Count
│       │   └── Toggle Arrow
│       │
│       └── Questions List (Conditional Render)
│           └── QuestionItem[] (Repeating)
│               ├── Question Title
│               ├── Metadata
│               │   ├── Difficulty Badge
│               │   ├── Topic Tag
│               │   └── Complexity
│               └── Action Buttons
│                   ├── View Details (opens modal)
│                   └── External Link
│
├── QuestionDetailsModal (Portal)
│   ├── Header
│   │   ├── Question Title
│   │   ├── Difficulty Badge
│   │   ├── Complexity Info
│   │   └── Close Button
│   │
│   ├── Content
│   │   ├── Description
│   │   ├── External Links
│   │   ├── Language Selector
│   │   ├── Code Block
│   │   ├── Copy Button
│   │   └── Key Insights
│   │
│   └── Footer
│       └── Close Button
│
└── Progress Overview Section
    └── Stats Cards
        ├── Total Days
        ├── Total Questions
        ├── Avg per Day
        └── Estimated Time
```

## 🔄 Data Flow

```
User Input (Search/Filter)
        ↓
Page useState (searchQuery, filters)
        ↓
useMemo (filteredDays)
        ↓
Search Function (if query)
        ↓
Filter by Topic (if selected)
        ↓
Filter by Difficulty (if selected)
        ↓
Update Rendered Days
        ↓
Show/Hide Days & Questions
        ↓
User Sees Filtered Results
```

## 🔌 API Integration Flow

```
User Enters LeetCode Username
        ↓
Click "Fetch Stats"
        ↓
fetchLeetcodeStats() Function
        ↓
POST to /api/leetcode
        ↓
├── Query GraphQL (userContestRankingInfo)
├── Variables (username)
└── operationName
        ↓
API Route (app/api/leetcode/route.js)
        ↓
Fetch LeetCode API
        ↓
Response (JSON)
        ↓
setLeetcodeStats()
        ↓
Display Stats in UI
```

## 📊 State Management

### Page Level State
```javascript
// Search & Filter State
const [searchQuery, setSearchQuery] = useState("");
const [selectedFilter, setSelectedFilter] = useState("all");
const [selectedDifficulty, setSelectedDifficulty] = useState("all");

// UI State
const [expandedDays, setExpandedDays] = useState({});

// LeetCode State
const [leetcodeUsername, setLeetcodeUsername] = useState("");
const [leetcodeStats, setLeetcodeStats] = useState(null);
const [loadingLeetcode, setLoadingLeetcode] = useState(false);
```

### DayCard State
```javascript
// Selected question for modal
const [selectedQuestion, setSelectedQuestion] = useState(null);
```

### Modal State
```javascript
// Language selection
const [selectedLanguage, setSelectedLanguage] = useState("JavaScript");
const [copiedLanguage, setCopiedLanguage] = useState(null);
```

## 🎨 Styling Architecture

### Color System
```
Primary: Blue (bg-blue-500, bg-blue-600)
Success: Green (bg-green-600, text-green-600)
Warning: Yellow (bg-yellow-600, text-yellow-600)
Error: Red (bg-red-600, text-red-600)

Background: 
  - Light: slate-50, slate-100
  - Dark: slate-800, slate-900, slate-950

Text:
  - Primary: slate-900 (light), white (dark)
  - Secondary: slate-500, slate-600
  - Tertiary: slate-400
```

### Component Styling Patterns
```javascript
// Cards
className="bg-white dark:bg-slate-800 rounded-lg shadow-lg"

// Hover States
className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"

// Gradients
className="bg-linear-to-br from-blue-50 to-blue-100"

// Badges
className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"

// Flexbox Layouts
className="flex items-center justify-between gap-4"
```

## 📦 Dependencies & Imports

### External Libraries Used
```javascript
// Next.js
import { useState } from "react";
import { usePathname } from "next/navigation";

// Lucide Icons
import { ChevronDown, Search, ExternalLink, Code, Copy, Check, X } from "lucide-react";

// Shadcn UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Internal
import { getAllDays, searchQuestions } from "@/constants/hundredDaysOfCode";
import DayCard from "@/components/DayCard";
import QuestionDetailsModal from "@/components/QuestionDetailsModal";
```

## 🚀 Performance Optimizations

### Implemented
- ✅ useMemo for filtered results
- ✅ Conditional rendering (only expanded days)
- ✅ Event delegation (single click handler)
- ✅ Lazy state updates

### Opportunities for Expansion
- Add React.memo for components
- Implement virtual scrolling for large lists
- Cache API responses
- Use useCallback for handlers
- Implement code splitting

## 🔐 Security Measures

### Implemented
- ✅ Input sanitization
- ✅ No sensitive data in LocalStorage
- ✅ API calls over HTTPS
- ✅ No client-side auth tokens

### Best Practices
- ✅ Proper error handling
- ✅ No SQL injection concerns
- ✅ XSS protection via React escaping
- ✅ CSRF tokens (if applicable)

## 📱 Responsive Design

### Breakpoints
```css
Mobile: < 640px (full width, stacked)
Tablet: 640px - 1024px (2 columns for stats)
Desktop: > 1024px (full layout)
```

### Mobile Optimizations
- ✅ Responsive grid layouts
- ✅ Touch-friendly buttons
- ✅ Adjusted padding/margins
- ✅ Readable font sizes
- ✅ Horizontal scroll for code blocks

## 🔄 Update Cycle

```
Data Changes
    ↓
Component Re-render (via useState)
    ↓
useMemo Recalculates (if dependencies changed)
    ↓
Filter Functions Update
    ↓
Render Updated Days/Questions
    ↓
UI Updates
    ↓
Browser Paints Changes
```

## 📈 Scalability

### Current Capacity
- ✅ 100+ days
- ✅ 400+ questions
- ✅ Multiple language solutions
- ✅ All filtering types

### Future Scaling Ideas
1. Pagination for large datasets
2. Virtual scrolling
3. Database integration
4. Caching layer
5. Search indexing
6. GraphQL API

## 🧪 Testing Strategy

### Unit Tests (Potential)
```javascript
- searchQuestions() function
- getQuestionsByDifficulty() function
- getDayByNumber() function
- filterQuestionsByTopic() function
```

### Integration Tests (Potential)
```javascript
- Search + Filter together
- LeetCode API integration
- Modal open/close functionality
- Copy to clipboard feature
```

### E2E Tests (Potential)
```javascript
- User journey: Search → Filter → View → Copy
- LeetCode stats loading
- All languages loading correctly
```

## 📊 Analytics Opportunities

Could track:
- Most viewed questions
- Most copied solutions
- Most searched topics
- Popular difficulty levels
- User language preferences
- Time spent per question
- LeetCode username lookup frequency

## 🎯 Success Metrics

### User Engagement
- [ ] Days visited per user
- [ ] Questions solved per day
- [ ] Languages viewed
- [ ] Search queries
- [ ] Filter usage

### Content Quality
- [ ] Question relevance ratings
- [ ] Solution comprehensiveness
- [ ] Complexity accuracy
- [ ] External link validity

---

## 📝 Summary

This architecture provides:
- ✅ Clean separation of concerns
- ✅ Scalable component structure
- ✅ Efficient data flow
- ✅ Responsive design
- ✅ Easy to extend and maintain
- ✅ Good performance characteristics
- ✅ Security best practices

---

**Built with Next.js, React, Tailwind CSS, and Lucide Icons**
