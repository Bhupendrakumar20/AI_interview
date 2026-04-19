/**
 * DSA Question Service
 * Fetches real coding problems from LeetCode and GeeksforGeeks
 * Supports caching to avoid repeated API calls
 */

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

/**
 * Fetch from LeetCode GraphQL API
 * Returns real LeetCode problems
 */
async function fetchFromLeetCode(difficulty = "Medium", limit = 3) {
  try {
    const query = `
      query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          total
          questions {
            questionId
            questionFrontendId
            boundaryOnly
            title
            titleSlug
            acRate
            difficulty
            likes
            dislikes
            topicTags {
              name
              id
            }
            isFavor
            isPaidOnly
            status
            solutionNum
          }
        }
      }
    `;

    const variables = {
      categorySlug: "algorithms",
      skip: 0,
      limit: limit,
      filters: {
        difficulty: difficulty,
      },
    };

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com/problemset/all/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (!data.data?.problemsetQuestionList?.questions) {
      return [];
    }

    // Format LeetCode questions
    return data.data.problemsetQuestionList.questions.map((q) => ({
      source: "leetcode",
      id: `lc_${q.questionId}`,
      title: q.title,
      titleSlug: q.titleSlug,
      difficulty: q.difficulty,
      tags: q.topicTags.map((t) => t.name),
      url: `https://leetcode.com/problems/${q.titleSlug}/`,
      acRate: q.acRate,
    }));
  } catch (error) {
    console.error("[LeetCode API Error]:", error.message);
    return [];
  }
}

/**
 * Fetch LeetCode problem details (description, examples, constraints)
 */
async function fetchLeetCodeDetails(titleSlug) {
  try {
    const cacheKey = `lc_details_${titleSlug}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }

    const query = `
      query questionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          content
          difficulty
          exampleTestcases
          topicTags {
            name
          }
          codeSnippets {
            lang
            code
          }
        }
      }
    `;

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/problems/${titleSlug}/`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({ query, variables: { titleSlug } }),
    });

    const data = await response.json();
    const question = data.data?.question;

    if (!question) {
      return null;
    }

    const formatted = {
      source: "leetcode",
      id: `lc_${question.questionId}`,
      title: question.title,
      titleSlug: titleSlug,
      difficulty: question.difficulty,
      tags: question.topicTags.map((t) => t.name),
      description: question.content || "",
      examples: parseExamples(question.exampleTestcases),
      testCases: parseTestCases(question.exampleTestcases),
      url: `https://leetcode.com/problems/${titleSlug}/`,
    };

    cache.set(cacheKey, { data: formatted, timestamp: Date.now() });
    return formatted;
  } catch (error) {
    console.error("[LeetCode Details Error]:", error.message);
    return null;
  }
}

/**
 * Fetch GeeksforGeeks problems with full details
 * GFG doesn't have a public API, so we provide curated problems with real data
 */
function fetchFromGFG(difficulty = "Medium", limit = 3) {
  const gfgProblems = [
    {
      source: "gfg",
      id: "gfg_knapsack",
      title: "0/1 Knapsack Problem",
      difficulty: "Medium",
      tags: ["Dynamic Programming", "Array"],
      url: "https://www.geeksforgeeks.org/problems/0-1-knapsack-problem0945/1",
      acRate: 78.24,
      description: `Given two arrays, val[] and wt[], where each element represents the value and weight of an item respectively, and an integer W representing the maximum capacity of the knapsack (the total weight it can hold).

The task is to put the items into the knapsack such that the total value obtained is maximum without exceeding the capacity W.

Note: You can either include an item completely or exclude it entirely — fractional selection of items is not allowed. Each item is available only once.`,
      examples: [
        {
          input: "W = 4, val[] = [1, 2, 3], wt[] = [4, 5, 1]",
          output: "3",
          explanation: "Choose the last item, which weighs 1 unit and has a value of 3."
        },
        {
          input: "W = 3, val[] = [1, 2, 3], wt[] = [4, 5, 6]",
          output: "0",
          explanation: "Every item has a weight exceeding the knapsack's capacity (3)."
        },
        {
          input: "W = 5, val[] = [10, 40, 30, 50], wt[] = [5, 4, 2, 3]",
          output: "80",
          explanation: "Choose the third item (value 30, weight 2) and the last item (value 50, weight 3) for a total value of 80."
        }
      ],
      testCases: [
        { stdin: "4\n1 2 3\n4 5 1", expectedOutput: "3", explanation: "Choose item 3" },
        { stdin: "3\n1 2 3\n4 5 6", expectedOutput: "0", explanation: "No item fits" },
        { stdin: "5\n10 40 30 50\n5 4 2 3", expectedOutput: "80", explanation: "Choose items 3 and 4" }
      ],
      constraints: [
        "1 ≤ val.size() = wt.size() ≤ 10^3",
        "1 ≤ W ≤ 10^3",
        "1 ≤ val[i] ≤ 10^3",
        "1 ≤ wt[i] ≤ 10^3"
      ]
    },
    {
      source: "gfg",
      id: "gfg_1",
      title: "Find the kth smallest element in BST",
      difficulty: "Easy",
      tags: ["Binary Search Tree", "Recursion"],
      url: "https://www.geeksforgeeks.org/problems/?difficulty=Easy",
      acRate: 85,
    },
    {
      source: "gfg",
      id: "gfg_2",
      title: "Lowest Common Ancestor in a Binary Search Tree",
      difficulty: "Medium",
      tags: ["Binary Search Tree", "Tree Traversal"],
      url: "https://www.geeksforgeeks.org/problems/?difficulty=Medium",
      acRate: 78,
    },
    {
      source: "gfg",
      id: "gfg_3",
      title: "Serialize and Deserialize a Binary Tree",
      difficulty: "Hard",
      tags: ["Binary Tree", "String Manipulation"],
      url: "https://www.geeksforgeeks.org/problems/?difficulty=Hard",
      acRate: 62,
    },
    {
      source: "gfg",
      id: "gfg_4",
      title: "Maximum sum subarray of size k",
      difficulty: "Easy",
      tags: ["Array", "Sliding Window"],
      url: "https://www.geeksforgeeks.org/maximum-sum-subarray-of-size-k/",
      acRate: 90,
    },
    {
      source: "gfg",
      id: "gfg_5",
      title: "Stock Buy and Sell with Transaction Fee",
      difficulty: "Medium",
      tags: ["Dynamic Programming", "Array"],
      url: "https://www.geeksforgeeks.org/stock-buy-sell-with-transaction-fee/",
      acRate: 75,
    },
  ];

  return gfgProblems
    .filter((p) => p.difficulty === difficulty)
    .slice(0, limit);
}

/**
 * Get mixed problems from both sources
 */
async function getMixedProblems(difficulty = "Medium", limit = 3) {
  const perSource = Math.ceil(limit / 2);

  const [leetcodeProblems, gfgProblems] = await Promise.all([
    fetchFromLeetCode(difficulty, perSource),
    Promise.resolve(fetchFromGFG(difficulty, perSource)),
  ]);

  return [...leetcodeProblems, ...gfgProblems].slice(0, limit);
}

/**
 * Parse examples from test case string
 */
function parseExamples(testcasesStr) {
  if (!testcasesStr) return [];

  const lines = testcasesStr.trim().split("\n");
  const examples = [];
  let current = {};

  for (const line of lines) {
    if (line.startsWith("Input:")) {
      if (Object.keys(current).length > 0) examples.push(current);
      current = { input: line.replace("Input: ", "").trim() };
    } else if (line.startsWith("Output:")) {
      current.output = line.replace("Output: ", "").trim();
    } else if (line.startsWith("Explanation:")) {
      current.explanation = line.replace("Explanation: ", "").trim();
    }
  }

  if (Object.keys(current).length > 0) examples.push(current);
  return examples;
}

/**
 * Parse test cases from examples
 */
function parseTestCases(testcasesStr) {
  const examples = parseExamples(testcasesStr);
  return examples.map((ex) => ({
    stdin: ex.input,
    expectedOutput: ex.output,
    explanation: ex.explanation,
  }));
}

/**
 * Fetch GFG problem details (full description, constraints, test cases)
 */
function fetchGFGDetails(questionId) {
  const allProblems = [
    {
      source: "gfg",
      id: "gfg_knapsack",
      title: "0/1 Knapsack Problem",
      difficulty: "Medium",
      tags: ["Dynamic Programming", "Array"],
      url: "https://www.geeksforgeeks.org/problems/0-1-knapsack-problem0945/1",
      acRate: 78.24,
      description: `Given two arrays, val[] and wt[], where each element represents the value and weight of an item respectively, and an integer W representing the maximum capacity of the knapsack (the total weight it can hold).

The task is to put the items into the knapsack such that the total value obtained is maximum without exceeding the capacity W.

Note: You can either include an item completely or exclude it entirely — fractional selection of items is not allowed. Each item is available only once.`,
      examples: [
        {
          input: "W = 4, val[] = [1, 2, 3], wt[] = [4, 5, 1]",
          output: "3",
          explanation: "Choose the last item, which weighs 1 unit and has a value of 3."
        },
        {
          input: "W = 3, val[] = [1, 2, 3], wt[] = [4, 5, 6]",
          output: "0",
          explanation: "Every item has a weight exceeding the knapsack's capacity (3)."
        },
        {
          input: "W = 5, val[] = [10, 40, 30, 50], wt[] = [5, 4, 2, 3]",
          output: "80",
          explanation: "Choose the third item (value 30, weight 2) and the last item (value 50, weight 3) for a total value of 80."
        }
      ],
      testCases: [
        { stdin: "4\n1 2 3\n4 5 1", expectedOutput: "3", explanation: "Choose item 3" },
        { stdin: "3\n1 2 3\n4 5 6", expectedOutput: "0", explanation: "No item fits" },
        { stdin: "5\n10 40 30 50\n5 4 2 3", expectedOutput: "80", explanation: "Choose items 3 and 4" }
      ],
      constraints: [
        "1 ≤ val.size() = wt.size() ≤ 10^3",
        "1 ≤ W ≤ 10^3",
        "1 ≤ val[i] ≤ 10^3",
        "1 ≤ wt[i] ≤ 10^3"
      ]
    },
  ];

  const problem = allProblems.find(p => p.id === questionId);
  return problem || null;
}
async function getRandomProblem(difficulty = "Medium") {
  const problems = await getMixedProblems(difficulty, 10);
  return problems[Math.floor(Math.random() * problems.length)] || null;
}

/**
 * Assign different problems to each user in room
 */
async function assignQuestionsForRoom(userCount, difficulty = "Medium") {
  const questions = await getMixedProblems(
    difficulty,
    Math.min(userCount, 10)
  );

  const assignments = {};
  const userIds = Array.from({ length: userCount }, (_, i) => `user_${i}`);

  userIds.forEach((userId, index) => {
    assignments[userId] = questions[index % questions.length];
  });

  return assignments;
}

module.exports = {
  fetchFromLeetCode,
  fetchLeetCodeDetails,
  fetchFromGFG,
  fetchGFGDetails,
  getMixedProblems,
  getRandomProblem,
  assignQuestionsForRoom,
  parseExamples,
  parseTestCases,
};
