/**
 * Piston Code Execution Service
 * Targets self-hosted Docker Piston instance (http://localhost:2000)
 * Docker setup: docker compose up -d  (see docker-compose.yml)
 *
 * API Docs: https://piston.readthedocs.io/en/latest/api-v2/
 */

import { createRequire } from 'module';

function loadBuiltin(name) {
  if (typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function') {
    return process.getBuiltinModule(name);
  }
  const req = createRequire(import.meta.url);
  return req(name);
}

const PISTON_BASE_URL =
  process.env.PISTON_API_URL || 'http://127.0.0.1:2000/api/v2';

const EXECUTION_TIMEOUT_MS = 20_000; // 20 s — generous for cold-start runtimes and compilation
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

/**
 * Resilient fetch that automatically tries 127.0.0.1, localhost, /api/v2, and /api/v2/piston
 * to seamlessly support both Docker Piston (all 12 runtimes) and the local runner fallback.
 */
async function fetchPistonWithFallback(endpointPath, options = {}, timeoutMs = EXECUTION_TIMEOUT_MS) {
  const baseUrls = [
    PISTON_BASE_URL || 'http://127.0.0.1:2000/api/v2',
    'http://localhost:2000/api/v2',
    'http://127.0.0.1:2000/api/v2/piston',
    'http://localhost:2000/api/v2/piston',
  ];
  const uniqueUrls = [...new Set(baseUrls.map((u) => u.replace(/\/+$/, '')))];

  let lastErr = null;
  for (const base of uniqueUrls) {
    try {
      const res = await fetchWithTimeout(`${base}${endpointPath}`, options, timeoutMs);
      if (res.status !== 404) return res;
    } catch (err) {
      lastErr = err;
    }
  }

  if (lastErr) throw lastErr;
  throw new Error(`Endpoint ${endpointPath} not reachable on Piston`);
}

/**
 * Native in-process/sub-process execution fallback if Docker Piston is offline or down.
 */
export function executeLocallyFallback({ sourceCode, language, stdin = '', startMs = Date.now() }) {
  const childProcess = loadBuiltin('child_process');
  const runSync = childProcess['spawnSync'];
  const fs = loadBuiltin('fs');
  const path = loadBuiltin('path');
  const os = loadBuiltin('os');
  const crypto = loadBuiltin('crypto');

  const lang = (language || '').toLowerCase().trim();
  const tempId = crypto.randomBytes(6).toString('hex');
  const tempDir = path.join(os.tmpdir(), `piston-fallback-${tempId}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // ── JavaScript (runs directly via Node) ──
    if (lang === 'javascript' || lang === 'js') {
      const file = path.join(tempDir, 'main.js');
      fs.writeFileSync(file, sourceCode, 'utf-8');
      const isWin = process.platform === 'win32';
      const res = runSync(
        isWin ? 'cmd' : 'sh',
        isWin ? ['/c', 'node', file] : ['-c', 'node "$1"', '_', file],
        {
          input: stdin,
          timeout: 10000,
          encoding: 'utf-8',
          cwd: tempDir,
        }
      );
      return {
        success: res.status === 0,
        output: res.stdout || '',
        error: res.stderr || (res.error ? res.error.message : ''),
        exitCode: res.status ?? (res.error ? 1 : 0),
        language: 'javascript',
        executionTime: Date.now() - startMs,
        stage: 'run',
        mode: 'native-fallback',
      };
    }

    // ── Python (runs via python/python3 on system) ──
    if (lang === 'python' || lang === 'py' || lang === 'python3') {
      const file = path.join(tempDir, 'main.py');
      fs.writeFileSync(file, sourceCode, 'utf-8');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const res = runSync(pythonCmd, [file], {
        input: stdin,
        timeout: 10000,
        encoding: 'utf-8',
        cwd: tempDir,
        shell: process.platform === 'win32',
      });
      return {
        success: res.status === 0,
        output: res.stdout || '',
        error: res.stderr || (res.error ? res.error.message : ''),
        exitCode: res.status ?? (res.error ? 1 : 0),
        language: 'python',
        executionTime: Date.now() - startMs,
        stage: 'run',
        mode: 'native-fallback',
      };
    }

    // ── C++ (runs via g++ if installed on system) ──
    if (lang === 'cpp' || lang === 'c++') {
      const srcFile = path.join(tempDir, 'main.cpp');
      const exeFile = path.join(tempDir, process.platform === 'win32' ? 'main.exe' : 'main');
      fs.writeFileSync(srcFile, sourceCode, 'utf-8');
      const compile = runSync('g++', ['-O2', '-o', exeFile, srcFile], {
        timeout: 15000,
        encoding: 'utf-8',
        cwd: tempDir,
        shell: process.platform === 'win32',
      });
      if (compile.status !== 0) {
        return {
          success: false,
          output: compile.stdout || '',
          error: compile.stderr || 'Compilation failed',
          exitCode: compile.status ?? 1,
          language: 'cpp',
          executionTime: Date.now() - startMs,
          stage: 'compile',
          mode: 'native-fallback',
        };
      }
      const run = runSync(exeFile, [], {
        input: stdin,
        timeout: 10000,
        encoding: 'utf-8',
        cwd: tempDir,
      });
      return {
        success: run.status === 0,
        output: run.stdout || '',
        error: run.stderr || '',
        exitCode: run.status ?? 0,
        language: 'cpp',
        executionTime: Date.now() - startMs,
        stage: 'run',
        mode: 'native-fallback',
      };
    }
  } catch (fallbackErr) {
    console.error('[Piston Fallback Engine] Error executing locally:', fallbackErr.message);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
  return null;
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
    run_timeout: 10000,      // ms — allow Java / interpreted runtimes to finish
    run_cpu_time: 10000,     // ms — CPU time limit
    compile_timeout: 20000,  // ms — allow C++, Java compilation
    compile_cpu_time: 20000, // ms — compile CPU time
  };

  try {
    const response = await fetchPistonWithFallback(
      '/execute',
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

    const compileCode = compile.code !== undefined ? compile.code : (compile.exit_code ?? 0);
    const runCode = run.code !== undefined ? run.code : (run.exit_code ?? 0);

    // Compilation errors (C++, Java, Go, etc.)
    if (compileCode !== 0 || (compile.stderr && compile.stderr.trim().length > 0 && compileCode !== 0)) {
      return {
        success: false,
        output: compile.stdout || '',
        error: compile.stderr || compile.output || 'Compilation failed',
        exitCode: compileCode,
        language: pistonLang,
        executionTime: Date.now() - startMs,
        stage: 'compile',
      };
    }

    const hasRuntimeError = runCode !== 0;
    const output = run.stdout || run.output || '';
    const stderr = run.stderr || '';

    return {
      success: !hasRuntimeError,
      output,
      error: stderr,
      exitCode: runCode,
      language: pistonLang,
      executionTime: Date.now() - startMs,
      stage: 'run',
      output_raw: data,
    };
  } catch (err) {
    console.warn(`[Piston] Primary Piston execution failed (${err.message}). Trying native local fallback...`);
    const fallbackResult = executeLocallyFallback({
      sourceCode,
      language: pistonLang,
      stdin,
      startMs,
    });
    if (fallbackResult) {
      return fallbackResult;
    }

    const isTimeout = err.name === 'AbortError';
    console.error(`[Piston] executeCode error (lang=${pistonLang}):`, err.message);
    return {
      success: false,
      output: '',
      error: isTimeout
        ? `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s`
        : `Execution error: ${err.message}. Ensure Docker is running (docker compose up -d) or language runtime is installed.`,
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
    const response = await fetchPistonWithFallback(
      '/runtimes',
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
    const response = await fetchPistonWithFallback(
      '/runtimes',
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
    const response = await fetchPistonWithFallback(
      '/packages',
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
