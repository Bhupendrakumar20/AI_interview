const TEST_CASES_BY_TITLE = {
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
};

const TEST_CASES_BY_ID = {
  "q20-1": TEST_CASES_BY_TITLE.lis,
  "q20-2": TEST_CASES_BY_TITLE.lcs,
  "q20-3": TEST_CASES_BY_TITLE["matrix chain multiplication"],
  "q49-1": TEST_CASES_BY_TITLE["longest increasing subsequence"],
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

