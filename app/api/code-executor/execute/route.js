/**
 * Code Executor API
 *
 * POST /api/code-executor/execute
 *   Body: { sourceCode, language, stdin?, testCases?, stopOnFirstFailure? }
 *
 * GET  /api/code-executor/execute
 *   Returns: { status, runtimes, pistonUrl, supportedLanguages }
 */

import {
  executeCode,
  runAllTestCases,
  testPistonConnectivity,
  getPistonRuntimes,
  getPistonLanguage,
  PISTON_LANGUAGE_MAP,
} from '@/lib/piston-service';

// ──────────────────────────────────────────────
// GET — health + runtime info
// ──────────────────────────────────────────────
export async function GET() {
  const connectivity = await testPistonConnectivity();
  const runtimes = connectivity.ok ? (connectivity.runtimes ?? []) : [];

  return Response.json({
    status: connectivity.ok ? 'OPERATIONAL' : 'OFFLINE',
    pistonUrl: connectivity.url,
    error: connectivity.error ?? null,
    runtimeCount: runtimes.length,
    runtimes: runtimes.map((r) => ({ language: r.language, version: r.version })),
    supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
    note: connectivity.ok
      ? '✅ Piston Docker container is running'
      : '❌ Piston is offline — run: docker compose up -d',
  });
}

// ──────────────────────────────────────────────
// POST — execute code
// ──────────────────────────────────────────────
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    sourceCode,
    language,
    stdin = '',
    testCases = [],
    stopOnFirstFailure = false,
  } = body;

  // ── Validation ──────────────────────────────
  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return Response.json({ error: 'sourceCode is required and must be a non-empty string' }, { status: 400 });
  }
  if (!language || typeof language !== 'string') {
    return Response.json(
      {
        error: 'language is required',
        supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
      },
      { status: 400 }
    );
  }

  const pistonLang = getPistonLanguage(language);
  if (!PISTON_LANGUAGE_MAP[language.toLowerCase()]) {
    return Response.json(
      {
        error: `Language '${language}' is not supported`,
        supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
        resolvedAs: pistonLang,
      },
      { status: 400 }
    );
  }

  try {
    // ── Case A: Run multiple test cases ─────────
    if (Array.isArray(testCases) && testCases.length > 0) {
      const result = await runAllTestCases({
        sourceCode,
        language,
        testCases,
        stopOnFirstFailure,
      });

      return Response.json({
        success: true,
        mode: 'test_cases',
        language: pistonLang,
        totalTests: result.totalTests,
        ranTests: result.ranTests,
        passed: result.passed,
        failed: result.failed,
        allPassed: result.allPassed,
        results: result.results,
      });
    }

    // ── Case B: Simple execution (with or without stdin) ─────────
    const result = await executeCode({ sourceCode, language, stdin });

    return Response.json({
      success: result.success,
      mode: 'execute',
      language: result.language,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
      stage: result.stage,
    });
  } catch (err) {
    console.error('[/api/code-executor/execute] Unhandled error:', err);
    return Response.json(
      {
        error: err.message || 'Code execution failed',
        details:
          process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
