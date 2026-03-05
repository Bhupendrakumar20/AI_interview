# 100 Days of Code - DSA Challenge

A comprehensive platform for mastering Data Structures and Algorithms through a structured 100-day challenge with integrated LeetCode support and curated DSA questions.

## Features

### 1. **100 Days of DSA Questions**
- **3-4 questions per day** covering various DSA topics
- Problems ranging from **Easy to Hard** difficulty levels
- Each question includes:
  - Detailed description
  - Solutions in multiple languages (JavaScript, Python, Java, C++)
  - Time and space complexity analysis
  - Links to LeetCode and DSAProblem.com

### 2. **Search & Filter System**
- **Full-text search** across question titles, descriptions, and topics
- **Filter by topic**: Array, String, Hash Map, Sorting, Linked List, etc.
- **Filter by difficulty**: Easy, Medium, Hard
- **Real-time filtering** with instant results

### 3. **LeetCode Integration**
- **Contest rankings** and statistics viewing
- Enter your LeetCode username to fetch:
  - Contest attendance count
  - Global ranking
  - Rating
  - Top percentile performance
  - Contest history

### 4. **Interactive UI**
- **Expandable day cards** with question summaries
- **Question detail modal** with full description and solutions
- **Code syntax highlighting** with copy-to-clipboard functionality
- **Language selection** for viewing solutions in different programming languages
- **Dark mode support** for comfortable long study sessions

### 5. **Progress Tracking**
- **Progress overview** showing:
  - Total days available
  - Total questions
  - Average questions per day
  - Estimated completion time
- Statistics on completion rates

## File Structure

```
app/(root)/
├── 100-days-of-code/
│   ├── page.jsx           # Main 100 Days page
│   └── layout.jsx         # Layout configuration

components/
├── DayCard.jsx            # Individual day card component
└── QuestionDetailsModal.jsx # Question detail modal

constants/
└── hundredDaysOfCode.js   # DSA questions database

lib/
└── dsa-helpers.js         # Helper functions and utilities

app/api/
└── leetcode/
    └── route.js           # LeetCode API proxy
```

## How to Use

### Accessing the Feature
1. Navigate to the sidebar and click **"100 Days to Code"**
2. Or directly visit `/100-days-of-code`

### Viewing Day Questions
1. Click on any **Day card** to expand it
2. View 3-4 questions for that day with difficulty badges and topic tags
3. Click on a **question title** to see full details and solutions

### Searching Questions
1. Use the **search bar** to find questions by title, description, or topic
2. Use **topic filters** to focus on specific DSA concepts
3. Use **difficulty filters** to choose appropriate problem levels

### Viewing Solutions
1. Open any question to see the **full description**
2. Select a **programming language** from the dropdown
3. View the **solution code** with proper syntax highlighting
4. **Copy the code** to your clipboard with one click
5. View **time and space complexity** analysis

### Checking LeetCode Stats
1. Enter your **LeetCode username**
2. Click **"Fetch Stats"**
3. View your contest rankings and performance metrics

## Adding More Questions

### Method 1: Direct Modification of Constants

Edit `/constants/hundredDaysOfCode.js` to add new days:

```javascript
day4: {
  day: 4,
  title: "Day 4",
  topics: ["Linked List"],
  questions: [
    {
      id: "q4-1",
      title: "Reverse Linked List",
      difficulty: "Easy",
      topic: "Linked List, Recursion",
      description: "Given the head of a singly linked list...",
      leetcodeUrl: "https://leetcode.com/problems/reverse-linked-list/",
      dsaProblemLink: "https://www.dsaproblem.com/preview/10",
      languages: ["JavaScript", "Python", "Java", "C++"],
      solutions: {
        JavaScript: `function reverseList(head) { ... }`,
        Python: `def reverseList(head): ...`,
        Java: `public ListNode reverseList(ListNode head) { ... }`,
        "C++": `ListNode* reverseList(ListNode* head) { ... }`
      },
      complexity: {
        time: "O(n)",
        space: "O(1)"
      }
    }
  ]
}
```

### Method 2: Using Helper Functions

Use the helper functions in `/lib/dsa-helpers.js`:

```javascript
import { createDSAQuestion, mergeDaysWithAdditional, ADDITIONAL_DAYS_TEMPLATE } from "@/lib/dsa-helpers";

// Create a new question
const newQuestion = createDSAQuestion({
  id: "q6-1",
  title: "My Problem",
  difficulty: "Medium",
  topic: "Graph, BFS",
  description: "Problem description...",
  leetcodeUrl: "https://leetcode.com/problems/...",
  dsaProblemLink: "https://www.dsaproblem.com/preview/...",
  languages: ["JavaScript", "Python", "Java", "C++"],
  solutions: { /* solutions */ },
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)"
});
```

### Method 3: Extending with Additional Days

The template `ADDITIONAL_DAYS_TEMPLATE` in `/lib/dsa-helpers.js` contains ready-to-use day definitions:

```javascript
import { ADDITIONAL_DAYS_TEMPLATE, mergeDaysWithAdditional } from "@/lib/dsa-helpers";
import { HUNDRED_DAYS_DSA } from "@/constants/hundredDaysOfCode";

const allDays = mergeDaysWithAdditional(HUNDRED_DAYS_DSA, ADDITIONAL_DAYS_TEMPLATE);
```

## API Endpoints

### LeetCode Contest Rankings
**POST** `/api/leetcode`

Request body:
```json
{
  "query": "query userContestRankingInfo($username: String!) { ... }",
  "variables": {
    "username": "leetcode_username"
  },
  "operationName": "userContestRankingInfo"
}
```

### Daily LeetCode Challenge
**POST** `/api/leetcode`

Request body:
```json
{
  "query": "query questionOfToday { activeDailyCodingChallengeQuestion { ... } }",
  "variables": {},
  "operationName": "questionOfToday"
}
```

## Utility Functions

### Export Questions
```javascript
import { exportQuestionsAsJSON, exportQuestionsAsCSV } from "@/lib/dsa-helpers";

// Export as JSON
const jsonData = exportQuestionsAsJSON(allDays);

// Export as CSV
const csvData = exportQuestionsAsCSV(allDays);
```

### Get Progress Statistics
```javascript
import { getProgressStats } from "@/lib/dsa-helpers";

const stats = getProgressStats(50, allDays); // 50 questions completed
// Returns: {
//   totalQuestions: 350,
//   completedQuestions: 50,
//   remainingQuestions: 300,
//   completionPercentage: "14.29",
//   daysCompleted: 14
// }
```

### Filter by Multiple Topics
```javascript
import { filterQuestionsByMultipleTopics } from "@/lib/dsa-helpers";

const filtered = filterQuestionsByMultipleTopics(["Array", "String"], allDays);
```

### Get Progression Path
```javascript
import { getProgressionPath } from "@/lib/dsa-helpers";

const easyTopics = getProgressionPath("Easy");
// Returns: ["Array", "String", "Hash Map"]

const mediumTopics = getProgressionPath("Medium");
// Returns: ["Dynamic Programming", "Two Pointers", "Sorting"]
```

## Customization Guide

### Adding Language Support
Edit a question's `languages` array and add the corresponding solution:

```javascript
languages: ["JavaScript", "Python", "Java", "C++", "Go"],
solutions: {
  Go: `func twoSum(nums []int, target int) []int { ... }`
}
```

### Changing Color Schemes
Update the difficulty color mapping in `/app/(root)/100-days-of-code/page.jsx`:

```javascript
const getDifficultyColor = (difficulty) => {
  switch(difficulty.toLowerCase()) {
    case "easy":
      return "text-green-600";
    case "medium":
      return "text-yellow-600";
    case "hard":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};
```

### Customizing Filter Options
Add new filter buttons in the page component:

```javascript
<Button
  variant={selectedFilter === "graph" ? "default" : "outline"}
  onClick={() => setSelectedFilter("graph")}
  size="sm"
>
  Graph
</Button>
```

## Best Practices

1. **Daily Practice**: Solve 3-4 questions per day to maintain momentum
2. **Understand, Don't Memorize**: Focus on understanding the approach rather than memorizing solutions
3. **Multiple Approaches**: Try to solve each problem in multiple ways
4. **Optimize Gradually**: Start with brute force, then optimize
5. **Track Progress**: Use the progress overview to monitor your journey
6. **Consistency**: The key to mastering DSA is consistent practice

## Tips for Success

- **Start Easy**: Begin with Easy problems to build confidence
- **Master Patterns**: Learn common patterns (Two Pointers, Sliding Window, etc.)
- **Practice Coding**: Type out solutions instead of just reading them
- **Time Yourself**: Start tracking solution times after you understand the concept
- **Review Often**: Revisit previous days to reinforce learning
- **Explain Out Loud**: Verbally explain your solution to master the concept

## Troubleshooting

### LeetCode Stats Not Loading
- Verify your username is spelled correctly
- Check if your LeetCode profile is public
- Ensure you have internet connectivity
- Try again after a few seconds

### Search Not Working
- Make sure you don't have too many filters applied
- Clear filters and try searching again
- Refresh the page if needed

### Solutions Not Displaying
- Check your browser's console for errors
- Ensure you're online
- Try selecting a different language and back

## Future Enhancements

- [ ] Streak tracking and notifications
- [ ] Leaderboard with global rankings
- [ ] Community discussions for each problem
- [ ] Video solutions and explanations
- [ ] Spaced repetition algorithm for review
- [ ] Integration with other coding platforms
- [ ] Mobile app for on-the-go practice
- [ ] AI-powered hint system
- [ ] Code performance analysis

## Contributing

To contribute new DSA questions or improvements:

1. Follow the question template structure
2. Include solutions in at least JavaScript and one other language
3. Test all solutions before submitting
4. Ensure links are valid and up-to-date
5. Verify complexity analysis accuracy

## Resources

- [LeetCode](https://leetcode.com)
- [DSAProblem.com](https://www.dsaproblem.com)
- [GeeksforGeeks](https://www.geeksforgeeks.org)
- [NeetCode.io](https://neetcode.io)

---

**Happy Coding! 🚀**
