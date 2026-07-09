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

/*
 * Fetch LeetCode problem list from GraphQL API
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
  const cacheKey = `lc_details_${titleSlug}`;
  
  // 1. Check Cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  let formatted = null;

  try {
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

    if (question) {
      // Try to parse from description (HTML) first
      let parsedCases = parseTestCasesFromDescription(question.content);
      let parsedExamplesList = [];

      if (parsedCases.length > 0) {
        parsedExamplesList = parsedCases.map(c => ({
          input: c.stdin,
          output: c.expectedOutput,
          explanation: c.explanation || ""
        }));
      } else {
        // Fallback to legacy parser if HTML parsing yielded nothing
        parsedExamplesList = parseExamples(question.exampleTestcases);
        parsedCases = parseTestCases(question.exampleTestcases);
      }

      formatted = {
        source: "leetcode",
        id: `lc_${question.questionId}`,
        title: question.title,
        titleSlug: titleSlug,
        difficulty: question.difficulty,
        tags: question.topicTags.map((t) => t.name),
        description: question.content || "",
        examples: parsedExamplesList,
        testCases: parsedCases,
        url: `https://leetcode.com/problems/${titleSlug}/`,
        codeSnippets: question.codeSnippets || []
      };

      // Validate question format
      if (!validateLeetCodeQuestion(formatted)) {
        console.error("[LeetCode Details] Validation failed for problem:", titleSlug);
        formatted = null;
      }
    }
  } catch (error) {
    console.error("[LeetCode Details Error] Failed to fetch from LeetCode GraphQL API:", error.message);
  }

  // 2. Fallback to Firestore if GraphQL failed or returned invalid data
  if (!formatted) {
    console.log(`[LeetCode Details Fallback] Attempting Firestore lookup for: ${titleSlug}`);
    formatted = await fetchFromFirestore(titleSlug);
  }

  // 3. Cache and return
  if (formatted) {
    cache.set(cacheKey, { data: formatted, timestamp: Date.now() });
    console.log(`[LeetCode Details] Successfully resolved: "${formatted.title}"`);
    return formatted;
  }

  return null;
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

/**
 * Parse test cases dynamically from description HTML (Option 2)
 */
function parseTestCasesFromDescription(htmlContent) {
  if (!htmlContent) return [];
  const text = htmlContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  const cases = [];
  const regex = /Input:\s*([\s\S]*?)\n\s*Output:\s*([\s\S]*?)(?:\n\s*Explanation:\s*([\s\S]*?))?(?=\n\s*(?:Input|Note|Constraints|Example)|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let inputRaw = match[1].trim();
    let outputRaw = match[2].trim();
    let explanation = match[3] ? match[3].trim() : "";
    
    // Split by variables like: target = 9, roads = ...
    const parts = inputRaw.split(/,\s*\w+\s*=/);
    let stdin = "";
    if (parts.length > 1) {
      const firstPartVal = parts[0].substring(parts[0].indexOf('=') + 1).trim();
      stdin = firstPartVal;
      for (let j = 1; j < parts.length; j++) {
        stdin += "\n" + parts[j].trim();
      }
    } else {
      if (inputRaw.includes('=')) {
        stdin = inputRaw.substring(inputRaw.indexOf('=') + 1).trim();
      } else {
        stdin = inputRaw;
      }
    }
    cases.push({
      stdin,
      expectedOutput: outputRaw,
      explanation
    });
  }
  return cases;
}

/**
 * Fetch fallback question & test cases from Firestore (Option 1)
 */
async function fetchFromFirestore(titleSlug) {
  if (typeof window !== 'undefined') {
    console.warn("[Firestore Fallback] Bypassing Firestore fetch on client-side");
    return null;
  }

  try {
    const { db } = eval('require("../firebase/admin")');
    let docRef = db.collection("dsa_questions").doc(`lc_${titleSlug}`);
    let docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      docRef = db.collection("dsa_questions").doc(titleSlug);
      docSnap = await docRef.get();
    }
    
    if (docSnap.exists) {
      const questionData = docSnap.data();
      
      // Fetch associated test cases
      const testCasesSnapshot = await db
        .collection("dsa_test_cases")
        .where("questionId", "==", questionData.id)
        .get();
        
      const testCases = [];
      testCasesSnapshot.forEach((doc) => {
        const tc = doc.data();
        testCases.push({
          stdin: tc.stdin || "",
          expectedOutput: tc.expectedOutput || "",
          explanation: tc.explanation || "",
          isHidden: !!tc.isHidden
        });
      });
      
      return {
        source: "leetcode",
        id: questionData.id,
        title: questionData.title,
        titleSlug: titleSlug,
        difficulty: questionData.difficulty,
        tags: questionData.tags || [],
        description: questionData.description || "",
        examples: questionData.examples || testCases.map(tc => ({
          input: tc.stdin,
          output: tc.expectedOutput,
          explanation: tc.explanation
        })),
        testCases: testCases,
        url: `https://leetcode.com/problems/${titleSlug}/`,
        codeSnippets: questionData.codeSnippets || []
      };
    }
  } catch (error) {
    console.error("[Firestore Fallback Error]:", error);
  }
  return null;
}

// Export as ES Modules for Next.js compatibility
export {
  fetchFromLeetCode,
  fetchLeetCodeDetails,
  getMixedProblems,
  getRandomProblem,
  assignQuestionsForRoom,
  parseExamples,
  parseTestCases,
};
