const TEST_CASES_BY_TITLE = {
  // Day 1: Arrays
  "reverse an array": [
    { stdin: "5\n1 2 3 4 5", expectedOutput: "5 4 3 2 1" },
    { stdin: "4\n10 20 30 40", expectedOutput: "40 30 20 10" },
    { stdin: "1\n42", expectedOutput: "42" },
  ],
  "find max and min": [
    { stdin: "5\n3 7 2 9 1", expectedOutput: "9 1" },
    { stdin: "4\n5 5 5 5", expectedOutput: "5 5" },
    { stdin: "3\n1 2 3", expectedOutput: "3 1" },
  ],
  "find kth max and min": [
    { stdin: "5 2\n3 7 2 9 1", expectedOutput: "7 2" },
    { stdin: "4 1\n5 5 5 5", expectedOutput: "5 5" },
    { stdin: "5 3\n10 20 30 40 50", expectedOutput: "30 30" },
  ],
  "sort 0s 1s 2s": [
    { stdin: "6\n0 1 2 2 1 0", expectedOutput: "0 0 1 1 2 2" },
    { stdin: "5\n1 0 2 1 0", expectedOutput: "0 0 1 1 2" },
    { stdin: "3\n2 2 2", expectedOutput: "2 2 2" },
  ],
  
  // String problems
  "palindrome string": [
    { stdin: "racecar", expectedOutput: "true" },
    { stdin: "hello", expectedOutput: "false" },
    { stdin: "a", expectedOutput: "true" },
  ],
  "reverse words": [
    { stdin: "Hello World", expectedOutput: "World Hello" },
    { stdin: "a", expectedOutput: "a" },
    { stdin: "the sky is blue", expectedOutput: "blue is sky the" },
  ],
  "anagram check": [
    { stdin: "listen\nsilent", expectedOutput: "true" },
    { stdin: "hello\nworld", expectedOutput: "false" },
    { stdin: "abc\ncba", expectedOutput: "true" },
  ],
  
  // DP problems
  lis: [
    { stdin: "10 9 2 5 3 7 101 18", expectedOutput: "4" },
    { stdin: "7 7 7 7 7", expectedOutput: "1" },
    { stdin: "4 10 4 3 8 9", expectedOutput: "3" },
  ],
  lcs: [
    { stdin: "abcde\nace", expectedOutput: "3" },
    { stdin: "abc\nabc", expectedOutput: "3" },
    { stdin: "abc\ndef", expectedOutput: "0" },
  ],
  "matrix chain multiplication": [
    { stdin: "40 20 30 10 30", expectedOutput: "26000" },
    { stdin: "10 20 30 40 30", expectedOutput: "30000" },
    { stdin: "10 20 30", expectedOutput: "6000" },
  ],
  "longest increasing subsequence": [
    { stdin: "10 9 2 5 3 7 101 18", expectedOutput: "4" },
    { stdin: "0 1 0 3 2 3", expectedOutput: "4" },
    { stdin: "7 7 7 7 7", expectedOutput: "1" },
  ],
  "longest common subsequence": [
    { stdin: "abcde\nace", expectedOutput: "3" },
    { stdin: "abc\nabc", expectedOutput: "3" },
    { stdin: "abc\ndef", expectedOutput: "0" },
  ],
  "coin change": [
    { stdin: "11\n1 2 5", expectedOutput: "3" },
    { stdin: "3\n2", expectedOutput: "-1" },
    { stdin: "0\n1", expectedOutput: "0" },
  ],
  "0/1 knapsack": [
    { stdin: "3\n10 20 30\n60 100 120\n50", expectedOutput: "220" },
    { stdin: "3\n1 3 4\n15 20 30\n4", expectedOutput: "35" },
    { stdin: "2\n5 10\n10 30\n0", expectedOutput: "0" },
  ],
  
  // Additional common LeetCode problems
  "two sum": [
    { stdin: "2 7 11 15\n9", expectedOutput: "0 1" },
    { stdin: "3 2 4\n6", expectedOutput: "1 2" },
    { stdin: "3 3\n6", expectedOutput: "0 1" },
  ],
  "climbing stairs": [
    { stdin: "1", expectedOutput: "1" },
    { stdin: "2", expectedOutput: "2" },
    { stdin: "3", expectedOutput: "3" },
  ],
  "merge sorted array": [
    { stdin: "1 2 3\n2 5 6", expectedOutput: "1 2 2 3 5 6" },
    { stdin: "4 5 6\n1 2 3", expectedOutput: "1 2 3 4 5 6" },
    { stdin: "1\n2", expectedOutput: "1 2" },
  ],
  "remove duplicates from sorted array": [
    { stdin: "1 1 2", expectedOutput: "2\n1 2" },
    { stdin: "0 0 1 1 1 2 2 3 3 4", expectedOutput: "5\n0 1 2 3 4" },
    { stdin: "1", expectedOutput: "1\n1" },
  ],
  "valid parentheses": [
    { stdin: "()", expectedOutput: "true" },
    { stdin: "()", expectedOutput: "true" },
    { stdin: "(]", expectedOutput: "false" },
  ],
};

const TEST_CASES_BY_ID = {
  // Day 1 - Arrays
  "q1-1": TEST_CASES_BY_TITLE["reverse an array"],
  "q1-2": TEST_CASES_BY_TITLE["find max and min"],
  "q1-3": TEST_CASES_BY_TITLE["find kth max and min"],
  "q1-4": TEST_CASES_BY_TITLE["sort 0s 1s 2s"],
  
  // Day 7-8 - Strings
  "q7-1": TEST_CASES_BY_TITLE["reverse an array"], // reverse string
  "q7-2": TEST_CASES_BY_TITLE["palindrome string"],
  "q6-3": TEST_CASES_BY_TITLE["anagram check"],
  
  // Day 10 - Searching
  "q19-1": TEST_CASES_BY_TITLE["climbing stairs"],
  
  // Day 13 - LinkedList
  "q13-2": TEST_CASES_BY_TITLE["merge sorted array"],
  
  // Day 16 - Arrays
  "q16-3": TEST_CASES_BY_TITLE["two sum"],
  
  // Day 20 - DP
  "q20-1": TEST_CASES_BY_TITLE.lis,
  "q20-2": TEST_CASES_BY_TITLE.lcs,
  "q20-3": TEST_CASES_BY_TITLE["matrix chain multiplication"],
  
  // Day 22 - Stacks
  "q22-2": TEST_CASES_BY_TITLE["valid parentheses"],
  
  // Day 49 - DP
  "q49-1": TEST_CASES_BY_TITLE["longest increasing subsequence"],
  
  // Day 73 - DP
  "q73-1": TEST_CASES_BY_TITLE["0/1 knapsack"],
  "q73-2": TEST_CASES_BY_TITLE["coin change"],
};

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9/+\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getQuestionTestCases(questionOrId, titleMaybe) {
  if (typeof questionOrId === "string") {
    const byId = TEST_CASES_BY_ID[questionOrId];
    if (byId?.length) return byId;
    const byTitle = TEST_CASES_BY_TITLE[normalizeKey(titleMaybe)];
    return byTitle || [];
  }

  const question = questionOrId || {};
  const byId = TEST_CASES_BY_ID[question.id];
  if (byId?.length) return byId;

  const byTitle = TEST_CASES_BY_TITLE[normalizeKey(question.title)];
  return byTitle || [];
}

export function hasQuestionTestCases(question) {
  return getQuestionTestCases(question).length > 0;
}

