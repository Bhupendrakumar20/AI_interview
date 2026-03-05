// Helper module for extending and managing DSA questions
// This allows adding more days and handling external question sources

export const ADDITIONAL_DAYS_TEMPLATE = {
  // Day 4: Linked List Problems
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
        description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        leetcodeUrl: "https://leetcode.com/problems/reverse-linked-list/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/10",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function reverseList(head) {\n  let prev = null;\n  let current = head;\n  while (current) {\n    const next = current.next;\n    current.next = prev;\n    prev = current;\n    current = next;\n  }\n  return prev;\n}`,
          Python: `def reverseList(head):\n    prev = None\n    current = head\n    while current:\n        next_temp = current.next\n        current.next = prev\n        prev = current\n        current = next_temp\n    return prev`,
          Java: `public ListNode reverseList(ListNode head) {\n    ListNode prev = null;\n    ListNode current = head;\n    while (current != null) {\n        ListNode next = current.next;\n        current.next = prev;\n        prev = current;\n        current = next;\n    }\n    return prev;\n}`,
          "C++": `ListNode* reverseList(ListNode* head) {\n    ListNode* prev = nullptr;\n    ListNode* current = head;\n    while (current) {\n        ListNode* next = current->next;\n        current->next = prev;\n        prev = current;\n        current = next;\n    }\n    return prev;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      }
    ]
  },
  // Day 5: Stack & Queue Problems
  day5: {
    day: 5,
    title: "Day 5",
    topics: ["Stack", "Queue"],
    questions: [
      {
        id: "q5-1",
        title: "Valid Parentheses",
        difficulty: "Easy",
        topic: "Stack, String",
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: 1. Open brackets must be closed by the same type of brackets. 2. Open brackets must be closed in the correct order.",
        leetcodeUrl: "https://leetcode.com/problems/valid-parentheses/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/11",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function isValid(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (map[char]) {\n      if (stack.pop() !== map[char]) return false;\n    } else {\n      stack.push(char);\n    }\n  }\n  return stack.length === 0;\n}`,
          Python: `def isValid(s):\n    stack = []\n    pairs = { ')': '(', '}': '{', ']': '[' }\n    for char in s:\n        if char in pairs:\n            if not stack or stack.pop() != pairs[char]:\n                return False\n        else:\n            stack.append(char)\n    return len(stack) == 0`,
          Java: `public boolean isValid(String s) {\n    Stack<Character> stack = new Stack<>();\n    Map<Character, Character> pairs = new HashMap<>();\n    pairs.put(')', '(');\n    pairs.put('}', '{');\n    pairs.put(']', '[');\n    for (char c : s.toCharArray()) {\n        if (pairs.containsKey(c)) {\n            if (stack.isEmpty() || stack.pop() != pairs.get(c)) return false;\n        } else {\n            stack.push(c);\n        }\n    }\n    return stack.isEmpty();\n}`,
          "C++": `bool isValid(string s) {\n    stack<char> st;\n    unordered_map<char, char> pairs = {{')', '('}, {'}', '{'}, {']', '['}};\n    for (char c : s) {\n        if (pairs.find(c) != pairs.end()) {\n            if (st.empty() || st.top() != pairs[c]) return false;\n            st.pop();\n        } else {\n            st.push(c);\n        }\n    }\n    return st.empty();\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      }
    ]
  }
};

// Function to merge additional days with base questions
export const mergeDaysWithAdditional = (baseQuestions, additionalQuestions) => {
  return {
    ...baseQuestions,
    ...additionalQuestions
  };
};

// Function to get a sample of questions for the day
export const getSampleQuestionsForDay = (dayNumber) => {
  const samples = {
    1: ["Array Basics", "Hash Maps", "Two Pointers"],
    2: ["Dynamic Programming", "Strings", "Sorting"],
    3: ["Binary Search", "Matrix", "Intervals"],
    4: ["Linked List", "Recursion", "Stack"],
    5: ["Queue", "BFS", "Tree Traversal"],
  };
  return samples[dayNumber] || ["General DSA"];
};

// Template for creating new DSA questions
export const createDSAQuestion = (config) => {
  return {
    id: config.id,
    title: config.title,
    difficulty: config.difficulty || "Medium",
    topic: config.topic,
    description: config.description,
    leetcodeUrl: config.leetcodeUrl || "",
    dsaProblemLink: config.dsaProblemLink || "",
    languages: config.languages || ["JavaScript", "Python", "Java", "C++"],
    solutions: config.solutions || {},
    complexity: {
      time: config.timeComplexity || "O(n)",
      space: config.spaceComplexity || "O(1)"
    }
  };
};

// Function to export questions as JSON
export const exportQuestionsAsJSON = (questions) => {
  return JSON.stringify(questions, null, 2);
};

// Function to export questions as CSV
export const exportQuestionsAsCSV = (allDays) => {
  let csv = "Day,Question Title,Difficulty,Topic,Time Complexity,Space Complexity\n";
  
  allDays.forEach(day => {
    day.questions.forEach(question => {
      csv += `${day.day},"${question.title}","${question.difficulty}","${question.topic}","${question.complexity.time}","${question.complexity.space}"\n`;
    });
  });
  
  return csv;
};

// Function to get progress statistics
export const getProgressStats = (completedQuestions, allDays) => {
  const totalQuestions = allDays.reduce((sum, day) => sum + day.questions.length, 0);
  const completionPercentage = (completedQuestions / totalQuestions) * 100;
  
  return {
    totalQuestions,
    completedQuestions,
    remainingQuestions: totalQuestions - completedQuestions,
    completionPercentage: completionPercentage.toFixed(2),
    daysCompleted: Math.ceil(completedQuestions / 3.5) // Assuming ~3.5 questions per day
  };
};

// Filter questions by multiple topics
export const filterQuestionsByMultipleTopics = (topics, allDays) => {
  const results = [];
  
  allDays.forEach(day => {
    day.questions.forEach(question => {
      if (topics.some(topic => question.topic.toLowerCase().includes(topic.toLowerCase()))) {
        results.push({
          ...question,
          day: day.day
        });
      }
    });
  });
  
  return results;
};

// Get recommended questions based on difficulty progression
export const getProgressionPath = (currentLevel = "Easy") => {
  const progression = {
    "Easy": ["Array", "String", "Hash Map"],
    "Medium": ["Dynamic Programming", "Two Pointers", "Sorting"],
    "Hard": ["Binary Search", "Graph", "Advanced DP"]
  };
  
  return progression[currentLevel] || progression["Easy"];
};
