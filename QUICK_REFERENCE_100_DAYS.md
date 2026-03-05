// Quick Reference Guide - 100 Days of Code Feature
// File: QUICK_REFERENCE_100_DAYS.md

# Quick Reference - 100 Days of Code

## 🚀 Feature Access
- **URL**: `/100-days-of-code`
- **Sidebar**: "100 Days to Code" menu item
- **Authentication**: Required (redirects to sign-in if not logged in)

## 📊 Main Page Features

### 1. Search Bar
```javascript
// User can search by:
- Question title
- Description content
- Topic tags
// Real-time results as user types
```

### 2. Topic Filters
```javascript
Available topics:
- All Topics (default)
- Array
- String
- Hash Map
- Sorting
// Add more by modifying the Button components in page.jsx
```

### 3. Difficulty Filters
```javascript
Available levels:
- All Levels (default)
- Easy (green)
- Medium (yellow)
- Hard (red)
```

### 4. LeetCode Integration
```javascript
// User enters username and clicks "Fetch Stats"
Stats displayed:
- Contests Attended
- Current Rating
- Global Ranking
- Top Percentile

// Example response structure:
{
  userContestRanking: {
    attendedContestsCount: 15,
    rating: 1800,
    globalRanking: 5000,
    totalParticipants: 1000000,
    topPercentage: 0.5,
    badge: { name: "..." }
  },
  userContestRankingHistory: [...]
}
```

## 💾 Data Structure

### Question Object
```javascript
{
  id: "q1-1",                              // Unique ID
  title: "Two Sum",                        // Problem name
  difficulty: "Easy",                      // Easy, Medium, Hard
  topic: "Array, Hash Map",                // Topics covered
  description: "...",                      // Full problem description
  leetcodeUrl: "https://...",             // Link to LeetCode
  dsaProblemLink: "https://...",          // Link to DSAProblem
  languages: ["JavaScript", "Python", ...], // Supported languages
  solutions: {
    JavaScript: "function code...",
    Python: "def code...",
    // ... more languages
  },
  complexity: {
    time: "O(n)",                          // Time complexity
    space: "O(n)"                          // Space complexity
  }
}
```

### Day Object
```javascript
{
  day: 1,                                  // Day number
  title: "Day 1",                          // Display title
  topics: ["Array"],                       // Main topics
  questions: [/*array of question objects*/]
}
```

## 🔌 API Integration

### LeetCode GraphQL Query
```javascript
// Contest Rankings Query
{
  query: `query userContestRankingInfo($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      totalParticipants
      topPercentage
      badge { name }
    }
  }`,
  variables: { username: "your_username" },
  operationName: "userContestRankingInfo"
}
```

### API Route
```bash
POST /api/leetcode
```

## 🛠️ Common Modifications

### Add New Topic Filter
```javascript
// In app/(root)/100-days-of-code/page.jsx, find the button group
<Button
  variant={selectedFilter === "binary-search" ? "default" : "outline"}
  onClick={() => setSelectedFilter("binary-search")}
  size="sm"
>
  Binary Search
</Button>
```

### Add New Language to Questions
```javascript
// In any question object
languages: [..., "Go", "Rust"],
solutions: {
  Go: `func twoSum(...) { ... }`,
  Rust: `fn two_sum(...) { ... }`
}
```

### Change Color Theme
```javascript
// Difficulty colors in page.jsx
const getDifficultyColor = (difficulty) => {
  switch(difficulty.toLowerCase()) {
    case "easy":
      return "text-green-600";        // Change green to another color
    case "medium":
      return "text-yellow-600";       // Change yellow
    case "hard":
      return "text-red-600";          // Change red
  }
};
```

### Modify Day Card Colors
```javascript
// In DayCard.jsx - the gradient circle for day number
<div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
  {/* Change from-blue-500 to-blue-600 to your preferred colors */}
</div>
```

## 📋 Component Hierarchy

```
Page (100-days-of-code/page.jsx)
├── Search Bar Input
├── Filter Buttons (Topics)
├── Filter Buttons (Difficulty)
├── LeetCode Stats Section
└── DayCard[] (one per day)
    ├── Day Header (clickable to expand)
    └── Questions List (when expanded)
        ├── QuestionRow
        │   ├── Title & Metadata
        │   └── Action Buttons
        │       ├── View Details (opens modal)
        │       └── View on LeetCode (external link)
        └── QuestionDetailsModal
            ├── Description
            ├── Language Selector
            ├── Code Block
            └── Copy Button
```

## 🎨 Styling Classes Used

### Cards & Containers
```tailwindcss
bg-white dark:bg-slate-800
rounded-lg shadow-lg hover:shadow-xl
```

### Text Colors
```tailwindcss
text-slate-900 dark:text-white    /* Primary text */
text-slate-500 dark:text-slate-400 /* Secondary text */
text-slate-600 dark:text-slate-300 /* Tertiary text */
```

### Difficulty Colors
```tailwindcss
Easy:   text-green-600
Medium: text-yellow-600
Hard:   text-red-600
```

### Interactive Elements
```tailwindcss
hover:bg-slate-50 dark:hover:bg-slate-700
transition-colors opacity-50 hover:opacity-100
```

## 🔍 Search Algorithm

The search implementation:
1. Converts query to lowercase
2. Searches through all days and questions
3. Matches against:
   - `question.title`
   - `question.description`
   - `question.topic`
4. Returns matching questions with their day number
5. Rebuilds the days array with only matching questions

## 💡 Tips & Tricks

### Disable a Question
Set the `disabled` property on a question object
(Note: Would need UI update to reflect this)

### Mark Question as Favorite
(Would require local storage implementation)

### Sort Questions by Last Attempted
(Would require tracking state)

## 🐛 Debugging Tips

### Check Console for Errors
```javascript
// Open browser dev tools
F12 or Ctrl+Shift+I
```

### Check LeetCode API Response
```javascript
// In page.jsx, add logging:
const data = await response.json();
console.log("LeetCode Data:", data);
```

### Verify Question Data Loading
```javascript
// In DayCard component:
console.log("Day questions:", day.questions);
```

## 📈 Performance Optimization Ideas

1. **Memoize Questions List**
   ```javascript
   const filteredDays = useMemo(() => { ... }, [dependencies]);
   ```

2. **Lazy Load Questions**
   ```javascript
   // Only expand one day at a time
   // Or use Intersection Observer for lazy loading
   ```

3. **Cache LeetCode Requests**
   ```javascript
   // Store in localStorage or session storage
   // Reduce API calls from repeated username searches
   ```

4. **Virtualize Long Lists**
   ```javascript
   // For 100+ questions, use react-window
   // Renders only visible items
   ```

## 🔐 Security Notes

1. **LeetCode API**: Uses public GraphQL endpoint, no auth required
2. **Data Privacy**: No user data is stored locally
3. **Network Requests**: All requests are HTTPS
4. **Input Validation**: Search input is sanitized before use

## 📱 Responsive Breakpoints

- **Mobile**: Full width, stacked layout
- **Tablet**: 2-column grid for stats
- **Desktop**: Full UI with all features

## 🎯 Common User Workflows

### Workflow 1: Solve Day 1 Problems
1. Navigate to 100 Days
2. Find Day 1
3. Click to expand
4. Click first question
5. View modal with description
6. Select language
7. Copy solution
8. Solve on LeetCode

### Workflow 2: Find Problems by Topic
1. Navigate to 100 Days
2. Click "Array" filter
3. See all array problems across all days
4. Continue with workflow from step 4 above

### Workflow 3: Check Progress
1. View Progress Overview section
2. See total questions completed
3. View completion percentage

---

**Last Updated**: 2026-03-03
**Version**: 1.0
