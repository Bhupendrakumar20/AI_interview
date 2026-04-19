/**
 * DSA Question Service - LeetCode Only
 * Fetches real coding problems from LeetCode GraphQL API
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
 * Get problems - LeetCode only
 */
async function getMixedProblems(difficulty = "Medium", limit = 3) {
  return await fetchFromLeetCode(difficulty, limit);
}

/**
 * Get random problem
 */
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

module.exports = {
  fetchFromLeetCode,
  fetchLeetCodeDetails,
  getMixedProblems,
  getRandomProblem,
  assignQuestionsForRoom,
  parseExamples,
  parseTestCases,
};
