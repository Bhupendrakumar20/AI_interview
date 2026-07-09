/**
 * Piston Code Execution Service
 * Targets self-hosted Docker Piston instance (http://localhost:2000)
 * Docker setup: docker compose up -d  (see docker-compose.yml)
 *
 * API Docs: https://piston.readthedocs.io/en/latest/api-v2/
 */

const PISTON_BASE_URL =
  process.env.PISTON_API_URL || 'http://localhost:2000/api/v2/piston';

const EXECUTION_TIMEOUT_MS = 10_000; // 10 s — generous for cold-start runtimes
const RUNTIME_FETCH_TIMEOUT_MS = 5_000;

// ─────────────────────────────────────────────────────────────────
// LANGUAGE MAP  (normalised name → Piston language name)
// ─────────────────────────────────────────────────────────────────
export const PISTON_LANGUAGE_MAP = {
  python:     'python',
  python3:    'python',
  python2:    'python',
  javascript: 'javascript',
  js:         'javascript',
  typescript: 'typescript',
  ts:         'typescript',
  cpp:        'cpp',
  'c++':      'cpp',
  c:          'c',
  java:       'java',
  go:         'go',
  golang:     'go',
  rust:       'rust',
  csharp:     'csharp',
  'c#':       'csharp',
  ruby:       'ruby',
  php:        'php',
  swift:      'swift',
  kotlin:     'kotlin',
  bash:       'bash',
  shell:      'bash',
  r:          'r',
  lua:        'lua',
};

// File extensions per Piston language
const EXTENSIONS = {
  python:     'py',
  javascript: 'js',
  typescript: 'ts',
  cpp:        'cpp',
  c:          'c',
  java:       'java',
  go:         'go',
  rust:       'rs',
  csharp:     'cs',
  ruby:       'rb',
  php:        'php',
  swift:      'swift',
  kotlin:     'kt',
  bash:       'sh',
  r:          'r',
  lua:        'lua',
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Normalize a user-supplied language string to a Piston language name.
 * Falls back to 'javascript' if unknown.
 */
export const getPistonLanguage = (lang) =>
  PISTON_LANGUAGE_MAP[lang?.toLowerCase()?.trim()] || 'javascript';

function getExtension(lang) {
  return EXTENSIONS[lang] || 'txt';
}

/**
 * fetch() with a hard timeout via AbortController.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = EXECUTION_TIMEOUT_MS) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

// ─────────────────────────────────────────────────────────────────
// CORE EXECUTION
// ─────────────────────────────────────────────────────────────────

/**
 * Execute source code via the self-hosted Piston Docker container.
 *
 * @param {object} params
 * @param {string} params.sourceCode   - Code to run
 * @param {string} params.language     - Language name (any alias in PISTON_LANGUAGE_MAP)
 * @param {string} [params.stdin]      - Standard input
 * @param {string} [params.version]    - Runtime version (default '*' = latest installed)
 * @returns {Promise<{success, output, error, exitCode, language, executionTime}>}
 */
export const executeCode = async ({ sourceCode, language, stdin = '', version = '*' }) => {
  const pistonLang = getPistonLanguage(language);
  const startMs = Date.now();

  if (!sourceCode?.trim()) {
    return {
      success: false,
      output: '',
      error: 'No source code provided.',
      exitCode: -1,
      language: pistonLang,
      executionTime: 0,
    };
  }

  const payload = {
    language: pistonLang,
    version,
    files: [
      {
        name: `main.${getExtension(pistonLang)}`,
        content: sourceCode,
      },
    ],
    stdin,
    run_timeout: 3000,   // ms — Piston internal limit
    compile_timeout: 10000,
  };

  try {
    const response = await fetchWithTimeout(
      `${PISTON_BASE_URL}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      EXECUTION_TIMEOUT_MS
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // Whitelist / auth error
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          output: '',
          error:
            'Piston API returned 401/403. Is the Docker container running? ' +
            'Run: docker compose up -d',
          exitCode: response.status,
          language: pistonLang,
          executionTime: Date.now() - startMs,
        };
      }
      throw new Error(`Piston HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const run = data.run ?? {};
    const compile = data.compile ?? {};

    // Compilation errors (C++, Java, Go, etc.)
    if (compile.stderr && compile.exit_code !== 0) {
      return {
        success: false,
        output: compile.stdout || '',
        error: compile.stderr || 'Compilation failed',
        exitCode: compile.exit_code,
        language: pistonLang,
        executionTime: Date.now() - startMs,
        stage: 'compile',
      };
    }

    const hasRuntimeError = run.exit_code !== 0;
    const output = run.stdout || '';
    const stderr = run.stderr || '';

    return {
      success: !hasRuntimeError,
      output,
      error: stderr,
      exitCode: run.exit_code ?? 0,
      language: pistonLang,
      executionTime: Date.now() - startMs,
      stage: 'run',
      output_raw: data,
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error(`[Piston] executeCode error (lang=${pistonLang}):`, err.message);
    return {
      success: false,
      output: '',
      error: isTimeout
        ? `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s`
        : `Piston error: ${err.message}. Make sure Docker is running: docker compose up -d`,
      exitCode: isTimeout ? 124 : -1,
      language: pistonLang,
      executionTime: Date.now() - startMs,
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// TEST CASE RUNNERS
// ─────────────────────────────────────────────────────────────────

/**
 * Run a single test case and compare output.
 */
export const runTestCase = async ({ sourceCode, language, input, expectedOutput }) => {
  const result = await executeCode({ sourceCode, language, stdin: input ?? '' });

  if (!result.success && result.exitCode !== 0) {
    return {
      passed: false,
      output: result.output,
      error: result.error,
      expectedOutput,
      executionTime: result.executionTime,
    };
  }

  const actual = (result.output ?? '').trim();
  const expected = (expectedOutput ?? '').trim();
  const normalize = (str) => str.replace(/\s+/g, '');
  const passed = actual === expected || normalize(actual) === normalize(expected);

  return {
    passed,
    output: result.output,
    error: result.error,
    expectedOutput,
    exitCode: result.exitCode,
    executionTime: result.executionTime,
  };
};

/**
 * Run all test cases sequentially (avoids hammering Piston).
 * Stops on first failure by default.
 */
export const runAllTestCases = async ({
  sourceCode,
  language,
  testCases = [],
  stopOnFirstFailure = false,
}) => {
  const visibleTests = testCases.filter((t) => t.visible !== false);
  const results = [];

  for (const tc of visibleTests) {
    const input = tc.input ?? tc.stdin ?? '';
    const expected = tc.expected ?? tc.expectedOutput ?? '';

    try {
      const result = await runTestCase({ sourceCode, language, input, expectedOutput: expected });
      results.push({ ...result, testInput: input });

      if (!result.passed && stopOnFirstFailure) break;
    } catch (err) {
      results.push({
        passed: false,
        error: err.message,
        testInput: input,
        expectedOutput: expected,
      });
      if (stopOnFirstFailure) break;
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  const allPassed = failedCount === 0 && results.length > 0;

  return {
    totalTests: visibleTests.length,
    ranTests: results.length,
    passed: passedCount,
    failed: failedCount,
    allPassed,
    results,
  };
};

// ─────────────────────────────────────────────────────────────────
// DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────

/**
 * Check if Piston Docker container is reachable.
 * Returns { ok, url, runtimes?, error? }
 */
export const testPistonConnectivity = async () => {
  try {
    const response = await fetchWithTimeout(
      `${PISTON_BASE_URL}/runtimes`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      RUNTIME_FETCH_TIMEOUT_MS
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, url: PISTON_BASE_URL, error: `HTTP ${response.status}: ${body.slice(0, 200)}` };
    }
    const runtimes = await response.json();
    return { ok: true, url: PISTON_BASE_URL, runtimeCount: runtimes.length, runtimes };
  } catch (err) {
    return {
      ok: false,
      url: PISTON_BASE_URL,
      error: err.name === 'AbortError'
        ? 'Connection timed out. Docker container may not be running.'
        : err.message,
    };
  }
};

/**
 * Get list of installed runtimes from Piston Docker.
 */
export const getPistonRuntimes = async () => {
  try {
    const response = await fetchWithTimeout(
      `${PISTON_BASE_URL}/runtimes`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      RUNTIME_FETCH_TIMEOUT_MS
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('[Piston] getPistonRuntimes error:', err.message);
    return [];
  }
};

/**
 * Install a Piston language runtime into the Docker container.
 * Call this from the setup script / admin panel.
 *
 * @param {string} language - e.g. 'python'
 * @param {string} version  - e.g. '3.10.0'
 */
export const installPistonRuntime = async (language, version) => {
  try {
    const response = await fetchWithTimeout(
      `${PISTON_BASE_URL}/packages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, version }),
      },
      60_000 // installs can take a while
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 300)}` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────────
// FORMATTING HELPERS (kept for API compatibility)
// ─────────────────────────────────────────────────────────────────

export const formatPistonResult = (result) => ({
  passed: result.passed,
  output: result.output,
  error: result.error,
  exitCode: result.exitCode,
  testInput: result.testInput,
  expectedOutput: result.expectedOutput,
  executionTime: result.executionTime,
});

export const formatAllTestResults = (results) => ({
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
    executionTime: r.executionTime,
  })),
});

export default {
  executeCode,
  runTestCase,
  runAllTestCases,
  testPistonConnectivity,
  getPistonRuntimes,
  installPistonRuntime,
  getPistonLanguage,
  formatPistonResult,
  formatAllTestResults,
  PISTON_LANGUAGE_MAP,
};
