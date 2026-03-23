// Judge0 Integration Service
// FILE: lib/judge0-service.js

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

/**
 * Submit code to Judge0 for execution
 */
export const submitToJudge0 = async (params) => {
  const {
    sourceCode,
    languageId,
    testInputs,
    expectedOutputs,
    timeLimit = 5,
    memoryLimit = 256,
  } = params;

  try {
    const payload = {
      source_code: sourceCode,
      language_id: languageId,
      stdin: testInputs,
      expected_output: expectedOutputs,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit * 1024, // Convert MB to KB
    };

    const response = await fetch(`${JUDGE0_API_URL}/submissions?wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Judge0 API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      submissionId: data.token,
      status: data.status,
    };
  } catch (error) {
    console.error('[Judge0 Submit] Error:', error);
    throw error;
  }
};

/**
 * Poll Judge0 for submission results
 */
export const pollJudge0Result = async (submissionToken, maxAttempts = 60) => {
  const POLL_INTERVAL = 500; // ms
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(
          `${JUDGE0_API_URL}/submissions/${submissionToken}?base64_encoded=true`,
          {
            headers: {
              'X-RapidAPI-Key': JUDGE0_API_KEY,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            },
          }
        );

        const data = await response.json();

        // Check if still processing
        if (data.status.id <= 2) {
          // Status 1 = In Queue, 2 = Processing
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Judge0 timeout'));
          }
          return; // Keep polling
        }

        // Done processing
        clearInterval(interval);

        // Decode base64 outputs
        const result = {
          status: data.status,
          executionTime: data.time || 0,
          memory: data.memory || 0,
          output: data.stdout ? Buffer.from(data.stdout, 'base64').toString() : '',
          error: data.stderr || null,
          compilationError: data.compile_output ? Buffer.from(data.compile_output, 'base64').toString() : null,
        };

        resolve(result);
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, POLL_INTERVAL);
  });
};

/**
 * Run single test case
 */
export const runTestCase = async (params) => {
  const { sourceCode, languageId, input, expectedOutput, timeLimit = 5, memoryLimit = 256 } = params;

  try {
    // Submit
    const { submissionId } = await submitToJudge0({
      sourceCode,
      languageId,
      testInputs: input,
      expectedOutputs: expectedOutput,
      timeLimit,
      memoryLimit,
    });

    // Poll for results
    const result = await pollJudge0Result(submissionId);

    // Check if output matches expected
    const actualOutput = result.output.trim();
    const expected = expectedOutput.trim();
    const passed = actualOutput === expected;

    return {
      passed,
      output: result.output,
      expectedOutput,
      executionTime: result.executionTime,
      memory: result.memory,
      error: result.error,
      compilationError: result.compilationError,
    };
  } catch (error) {
    console.error('[runTestCase] Error:', error);
    throw error;
  }
};

/**
 * Run all test cases for a question
 */
export const runAllTestCases = async (params) => {
  const { sourceCode, languageId, testCases, timeLimit = 5, memoryLimit = 256 } = params;

  const results = [];

  // Run visible test cases first
  const visibleTests = testCases.filter((t) => t.visible !== false);

  for (const testCase of visibleTests) {
    try {
      const result = await runTestCase({
        sourceCode,
        languageId,
        input: testCase.input,
        expectedOutput: testCase.expected,
        timeLimit,
        memoryLimit,
      });

      results.push({
        ...result,
        testInput: testCase.input,
      });

      // Stop if first visible test fails
      if (!result.passed) {
        break;
      }
    } catch (error) {
      results.push({
        passed: false,
        error: error.message,
        testInput: testCase.input,
      });
      break;
    }
  }

  // Calculate summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const allPassed = failed === 0 && results.length > 0;

  return {
    totalTests: results.length,
    passed,
    failed,
    allPassed,
    results,
    avgExecutionTime: results.reduce((a, r) => a + (r.executionTime || 0), 0) / results.length,
    avgMemory: results.reduce((a, r) => a + (r.memory || 0), 0) / results.length,
  };
};

/**
 * Language mapping for Judge0
 */
export const LANGUAGE_MAP = {
  python: 71,    // Python 3.8.1
  javascript: 63, // JavaScript (Node.js 12.14.0)
  cpp: 54,       // C++ (GCC 9.2.0)
  java: 62,      // Java (OpenJDK 13.0.1)
  go: 60,        // Go (1.13)
  rust: 73,      // Rust (1.40.0)
  csharp: 51,    // C# (Mono 6.12.0)
  typescript: 74, // TypeScript
};

/**
 * Get language ID from language name
 */
export const getLanguageId = (languageName) => {
  return LANGUAGE_MAP[languageName.toLowerCase()] || 63; // Default to JavaScript
};

/**
 * Test Judge0 connectivity
 */
export const testJudge0Connectivity = async () => {
  try {
    const response = await fetch(`${JUDGE0_API_URL}/languages`, {
      headers: {
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Judge0 connectivity test failed:', error);
    return false;
  }
};

/**
 * Batch submit multiple test cases (optimized)
 */
export const batchSubmitTestCases = async (params) => {
  const { sourceCode, languageId, testCases, timeLimit = 5, memoryLimit = 256 } = params;

  try {
    // Prepare all submissions
    const submissions = testCases.map((testCase) => ({
      source_code: sourceCode,
      language_id: languageId,
      stdin: testCase.input,
      expected_output: testCase.expected,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit * 1024,
    }));

    // Batch submit (not all Judge0 tiers support this, fallback to sequential)
    const response = await fetch(`${JUDGE0_API_URL}/submissions/batch?wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({ submissions }),
    });

    if (!response.ok) {
      // Fallback: submit sequentially
      return runAllTestCases(params);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[batchSubmitTestCases] Error, falling back to sequential:', error);
    return runAllTestCases(params);
  }
};

/**
 * Format judge0 status for client
 */
export const formatJudge0Status = (status) => {
  const statuses = {
    1: 'In Queue',
    2: 'Processing',
    3: 'Accepted',
    4: 'Wrong Answer',
    5: 'Time Limit Exceeded',
    6: 'Compilation Error',
    7: 'Runtime Error (SIGSEGV)',
    8: 'Runtime Error (SIGXFSZ)',
    9: 'Runtime Error (SIGFPE)',
    10: 'Runtime Error (SIGABRT)',
    11: 'Runtime Error (NZEC)',
    12: 'Runtime Error (Other)',
    13: 'Internal Error',
    14: 'Exec Format Error',
  };

  return statuses[status] || 'Unknown Status';
};
