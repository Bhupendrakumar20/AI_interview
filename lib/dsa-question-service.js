/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           DSA QUESTION SERVICE - LEETCODE ONLY (NO GFG OR OTHERS)            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * STRICT LEETCODE-ONLY POLICY:
 * • All questions fetched from LeetCode GraphQL API (https://leetcode.com/graphql)
 * • Question IDs MUST start with "lc_" prefix
 * • Titles, descriptions, examples, and test cases come from LeetCode ONLY
 * • NO GeeksforGeeks (GFG) content - EVER
 * • NO mock data or fallback from other sources
 * • NO hardcoded problems from any source except LeetCode
 * 
 * This service guarantees that DSA rooms use ONLY real, verified LeetCode problems.
 * 
 * API Integration:
 * - fetchFromLeetCode(): Fetches problem list from LeetCode GraphQL
 * - fetchLeetCodeDetails(): Fetches full problem description + examples from GraphQL
 * - getMixedProblems(): Returns ONLY LeetCode (calls fetchFromLeetCode)
 * - getRandomProblem(): Returns ONLY LeetCode
 * - assignQuestionsForRoom(): Distributes ONLY LeetCode problems
 */

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

/**
 * ✅ VALIDATION: Ensure question is from LeetCode
 */
function validateLeetCodeQuestion(question) {
  if (!question || typeof question !== 'object') {
    console.error("[LeetCode Validator] Invalid question object");
    return false;
  }
  if (!question.id || !question.id.startsWith('lc_')) {
    console.error("[LeetCode Validator] Non-LeetCode ID detected:", question.id);
    return false;
  }
  if (question.source !== 'leetcode') {
    console.error("[LeetCode Validator] Non-LeetCode source detected:", question.source);
    return false;
  }
  return true;
}

/**
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

    // VALIDATE before returning
    if (!validateLeetCodeQuestion(formatted)) {
      console.error("[LeetCode Details] Validation failed for problem:", titleSlug);
      return null;
    }

    cache.set(cacheKey, { data: formatted, timestamp: Date.now() });
    console.log(`[LeetCode Details] Successfully fetched from LeetCode GraphQL: "${formatted.title}" with full description, examples, and test cases`);
    return formatted;
  } catch (error) {
    console.error("[LeetCode Details Error] Failed to fetch from LeetCode GraphQL API:", error.message);
    return null;
  }
}

/**
 * ✅ GET PROBLEMS - LEETCODE ONLY
 * This function returns ONLY LeetCode problems (no GFG, no other sources)
 * Each problem is validated to have lc_ prefix
 */
async function getMixedProblems(difficulty = "Medium", limit = 3) {
  console.log(`[LeetCode - getMixedProblems] Fetching ${limit} LeetCode problems (${difficulty})...`);
  
  // FETCH FROM LEETCODE ONLY
  const problems = await fetchFromLeetCode(difficulty, limit);
  
  // VALIDATE ALL PROBLEMS ARE FROM LEETCODE
  const validProblems = problems.filter(p => {
    const isValid = validateLeetCodeQuestion(p);
    if (!isValid) {
      console.error("[LeetCode - Validation] Filtered out non-LeetCode question:", p);
    }
    return isValid;
  });
  
  console.log(`[LeetCode - getMixedProblems] ✅ Returning ${validProblems.length} verified LeetCode problems`);
  return validProblems;
}

/**
 * ✅ GET RANDOM PROBLEM - LEETCODE ONLY
 */
async function getRandomProblem(difficulty = "Medium") {
  console.log(`[LeetCode - getRandomProblem] Fetching random LeetCode problem (${difficulty})...`);
  const problems = await getMixedProblems(difficulty, 10);
  
  if (problems.length === 0) {
    console.error("[LeetCode - getRandomProblem] No LeetCode problems available");
    return null;
  }
  
  const randomProblem = problems[Math.floor(Math.random() * problems.length)];
  console.log(`[LeetCode - getRandomProblem] ✅ Selected LeetCode problem: \"${randomProblem.title}\"`);
  return randomProblem;
}

/**
 * ✅ ASSIGN PROBLEMS FOR ROOM - LEETCODE ONLY
 */
async function assignQuestionsForRoom(userCount, difficulty = "Medium") {
  console.log(`[LeetCode - assignQuestionsForRoom] Assigning LeetCode problems to ${userCount} users...`);
  
  const questions = await getMixedProblems(
    difficulty,
    Math.min(Math.max(userCount, 3), 10)
  );

  if (questions.length === 0) {
    console.error("[LeetCode - assignQuestionsForRoom] No LeetCode problems available for assignment");
    return {};
  }

  const assignments = {};
  const userIds = Array.from({ length: userCount }, (_, i) => `user_${i}`);

  userIds.forEach((userId, index) => {
    const assignedProblem = questions[index % questions.length];
    assignments[userId] = assignedProblem;
    console.log(`[LeetCode - assignQuestionsForRoom] User ${userId} assigned LeetCode: \"${assignedProblem.title}\"`);
  });

  console.log(`[LeetCode - assignQuestionsForRoom] ✅ Successfully assigned LeetCode problems to all users`);
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
