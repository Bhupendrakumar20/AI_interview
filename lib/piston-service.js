// Piston Code Execution Service
// FILE: lib/piston-service.js
// Using Piston API (free, no API key needed)
// https://piston.readthedocs.io/

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
const EXECUTION_TIMEOUT = 5000; // 5 seconds

/**
 * Language mapping for Piston
 * Piston uses language names instead of IDs like Judge0
 */
export const PISTON_LANGUAGE_MAP = {
  python: 'python',
  python3: 'python',
  python2: 'python',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  java: 'java',
  go: 'go',
  golang: 'go',
  rust: 'rust',
  csharp: 'csharp',
  'c#': 'csharp',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  bash: 'bash',
  shell: 'bash',
  r: 'r',
  lua: 'lua',
};

/**
 * Get Piston language name from user input
 */
export const getPistonLanguage = (languageName) => {
  return PISTON_LANGUAGE_MAP[languageName?.toLowerCase()] || 'javascript';
};

/**
 * Execute code using Piston API
 */
export const executeCode = async (params) => {
  const {
    sourceCode,
    language,
    stdin = '',
    version = '*',
  } = params;

  try {
    const pistonLanguage = getPistonLanguage(language);

    const payload = {
      language: pistonLanguage,
      version: version,
      files: [
        {
          name: `main.${getFileExtension(pistonLanguage)}`,
          content: sourceCode,
        },
      ],
      stdin: stdin,
    };

    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: EXECUTION_TIMEOUT,
    });

    if (!response.ok) {
      throw new Error(`Piston API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      output: data.run?.stdout || '',
      error: data.run?.stderr || '',
      exitCode: data.run?.exit_code || 0,
      language: pistonLanguage,
      output_raw: data,
    };
  } catch (error) {
    console.error('[Piston Execute] Error:', error);
    return {
      success: false,
      output: '',
      error: error.message || 'Execution failed',
      exitCode: -1,
    };
  }
};

/**
 * Run single test case
 */
export const runTestCase = async (params) => {
  const {
    sourceCode,
    language,
    input,
    expectedOutput,
  } = params;

  try {
    const result = await executeCode({
      sourceCode,
      language,
      stdin: input,
    });

    if (!result.success) {
      return {
        passed: false,
        output: result.output,
        error: result.error,
        expectedOutput: expectedOutput,
      };
    }

    // Check if output matches expected
    const actualOutput = result.output.trim();
    const expected = expectedOutput.trim();
    const passed = actualOutput === expected;

    return {
      passed,
      output: result.output,
      expectedOutput,
      error: result.error,
      exitCode: result.exitCode,
    };
  } catch (error) {
    console.error('[runTestCase] Error:', error);
    return {
      passed: false,
      output: '',
      expectedOutput: expectedOutput,
      error: error.message,
    };
  }
};

/**
 * Run all test cases
 */
export const runAllTestCases = async (params) => {
  const {
    sourceCode,
    language,
    testCases,
  } = params;

  const results = [];

  // Run visible test cases
  const visibleTests = testCases.filter((t) => t.visible !== false);

  for (const testCase of visibleTests) {
    try {
      const result = await runTestCase({
        sourceCode,
        language,
        input: testCase.input || testCase.stdin,
        expectedOutput: testCase.expected || testCase.expectedOutput,
      });

      results.push({
        ...result,
        testInput: testCase.input || testCase.stdin,
      });

      // Stop on first failure
      if (!result.passed) {
        break;
      }
    } catch (error) {
      results.push({
        passed: false,
        error: error.message,
        testInput: testCase.input || testCase.stdin,
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
  };
};

/**
 * Test Piston connectivity
 */
export const testPistonConnectivity = async () => {
  try {
    const response = await fetch(`${PISTON_API_URL}/runtimes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    return response.ok;
  } catch (error) {
    console.error('[Piston Connectivity] Error:', error);
    return false;
  }
};

/**
 * Get available runtimes
 */
export const getPistonRuntimes = async () => {
  try {
    const response = await fetch(`${PISTON_API_URL}/runtimes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch runtimes: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[getPistonRuntimes] Error:', error);
    return [];
  }
};

/**
 * Get file extension for language
 */
function getFileExtension(language) {
  const extensions = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    go: 'go',
    rust: 'rs',
    csharp: 'cs',
    ruby: 'rb',
    php: 'php',
    swift: 'swift',
    kotlin: 'kt',
    bash: 'sh',
    r: 'r',
    lua: 'lua',
  };

  return extensions[language] || 'txt';
}

/**
 * Format Piston response for client display
 */
export const formatPistonResult = (result) => {
  return {
    passed: result.passed,
    output: result.output,
    error: result.error,
    exitCode: result.exitCode,
    testInput: result.testInput,
    expectedOutput: result.expectedOutput,
  };
};

/**
 * Format all test results for client
 */
export const formatAllTestResults = (results) => {
  return {
    totalTests: results.totalTests,
    passed: results.passed,
    failed: results.failed,
    allPassed: results.allPassed,
    results: results.results.map((r) => ({
      passed: r.passed,
      output: r.output,
      error: r.error,
      expectedOutput: r.expectedOutput,
      testInput: r.testInput,
    })),
  };
};

export default {
  executeCode,
  runTestCase,
  runAllTestCases,
  testPistonConnectivity,
  getPistonRuntimes,
  getPistonLanguage,
  formatPistonResult,
  formatAllTestResults,
  PISTON_LANGUAGE_MAP,
};
