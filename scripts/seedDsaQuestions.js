// scripts/seedDsaQuestions.js
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// Popular DSA Problem Slugs (Blind 75 & NeetCode 150 Classics)
const SLUGS = [
  "two-sum",
  "longest-substring-without-repeating-characters",
  "median-of-two-sorted-arrays",
  "longest-palindromic-substring",
  "container-with-most-water",
  "3sum",
  "remove-nth-node-from-end-of-list",
  "valid-parentheses",
  "merge-two-sorted-lists",
  "generate-parentheses",
  "merge-k-sorted-lists",
  "search-in-rotated-sorted-array",
  "find-first-and-last-position-of-element-in-sorted-array",
  "search-insert-position",
  "combination-sum",
  "permutations",
  "rotate-image",
  "group-anagrams",
  "maximum-subarray",
  "spiral-matrix",
  "jump-game",
  "merge-intervals",
  "insert-interval",
  "unique-paths",
  "climbing-stairs",
  "set-matrix-zeroes",
  "search-a-2d-matrix",
  "sort-colors",
  "minimum-window-substring",
  "subsets",
  "word-search",
  "remove-duplicates-from-sorted-list",
  "merge-sorted-array",
  "same-tree",
  "symmetric-tree",
  "binary-tree-level-order-traversal",
  "maximum-depth-of-binary-tree",
  "construct-binary-tree-from-preorder-and-inorder-traversal",
  "validate-binary-search-tree",
  "path-sum",
  "best-time-to-buy-and-sell-stock",
  "valid-palindrome",
  "single-number",
  "linked-list-cycle",
  "lru-cache",
  "min-stack",
  "reverse-linked-list",
  "intersection-of-two-linked-lists",
  "excel-sheet-column-title",
  "majority-element",
  "house-robber",
  "binary-tree-right-side-view",
  "number-of-islands",
  "reverse-bits",
  "number-of-1-bits",
  "happy-number",
  "remove-linked-list-elements",
  "isomorphic-strings",
  "reverse-linked-list",
  "contains-duplicate",
  "invert-binary-tree",
  "kth-smallest-element-in-a-bst",
  "lowest-common-ancestor-of-a-binary-search-tree",
  "lowest-common-ancestor-of-a-binary-tree",
  "delete-node-in-a-linked-list",
  "product-of-array-except-self",
  "valid-anagram",
  "binary-tree-paths",
  "add-digits",
  "ugly-number",
  "missing-number",
  "first-bad-version",
  "move-zeroes",
  "find-the-duplicate-number",
  "game-of-life",
  "word-pattern",
  "nim-game",
  "longest-increasing-subsequence",
  "remove-invalid-parentheses",
  "best-time-to-buy-and-sell-stock-with-cooldown",
  "minimum-height-trees",
  "coin-change",
  "number-of-connected-components-in-an-undirected-graph",
  "counting-bits",
  "top-k-frequent-elements",
  "design-twitter",
  "find-k-pairs-with-smallest-sums",
  "guess-number-higher-or-lower",
  "ransom-note",
  "first-unique-character-in-a-string",
  "find-the-difference",
  "is-subsequence",
  "sum-of-two-integers",
  "pacific-atlantic-water-flow",
  "longest-repeating-character-replacement",
  "non-overlapping-intervals",
  "serialize-and-deserialize-binary-tree",
  "meeting-rooms",
  "meeting-rooms-ii",
  "graph-valid-tree",
  "alien-dictionary",
  "house-robber-ii",
  "word-break",
  "combination-sum-iv",
  "decode-ways",
  "longest-common-subsequence"
];

// Helper to clean HTML and parse test cases
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
    
    // Split variables like: target = 9, roads = ...
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

// Fetch single question details from LeetCode GraphQL
async function fetchLeetCodeDetails(titleSlug) {
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
  return data.data?.question;
}

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seed() {
  console.log("🚀 Starting seeding process for Firestore database...");
  let successCount = 0;

  for (let i = 0; i < SLUGS.length; i++) {
    const slug = SLUGS[i];
    console.log(`[${i + 1}/${SLUGS.length}] Fetching: ${slug}...`);

    try {
      const question = await fetchLeetCodeDetails(slug);
      if (!question) {
        console.warn(`⚠️ Warning: Could not fetch LeetCode details for ${slug}`);
        continue;
      }

      const testCases = parseTestCasesFromDescription(question.content);

      if (testCases.length === 0) {
        console.warn(`⚠️ Warning: Parsed 0 test cases from description for: ${slug}. Skipping.`);
        continue;
      }

      const id = `lc_${question.questionId}`;
      const batch = db.batch();

      // Write question metadata
      const questionRef = db.collection("dsa_questions").doc(id);
      batch.set(questionRef, {
        id,
        title: question.title,
        difficulty: question.difficulty,
        tags: question.topicTags.map(t => t.name),
        description: question.content || "",
        examples: testCases.map(tc => ({
          input: tc.stdin,
          output: tc.expectedOutput,
          explanation: tc.explanation || ""
        })),
        url: `https://leetcode.com/problems/${slug}/`,
        codeSnippets: question.codeSnippets || [],
        createdAt: new Date(),
        is_active: true
      });

      // Write each test case
      testCases.forEach((tc, idx) => {
        const caseId = `${id}_case_${idx}`;
        const caseRef = db.collection("dsa_test_cases").doc(caseId);
        batch.set(caseRef, {
          questionId: id,
          stdin: tc.stdin || "",
          expectedOutput: tc.expectedOutput || "",
          explanation: tc.explanation || "",
          isHidden: false,
        });
      });

      await batch.commit();
      successCount++;
      console.log(`✅ Success: Added "${question.title}" with ${testCases.length} testcases.`);

      // Sleep to prevent rate limit
      await sleep(300);

    } catch (err) {
      console.error(`❌ Error seeding ${slug}:`, err.message);
    }
  }

  console.log(`\n🎉 Seeding finished! Successfully seeded ${successCount}/${SLUGS.length} questions into Firestore.`);
  process.exit(0);
}

seed();
