/**
 * Code Executor API Route
 * Handles code execution via Piston API
 * 
 * POST /api/code-executor/execute
 * Body:
 *   - sourceCode: string (required)
 *   - language: string (required) - javascript, python, java, cpp, etc.
 *   - stdin?: string - input for the code
 *   - testCases?: array - multiple test cases to run
 */

import { 
  executeCode, 
  runTestCase, 
  runAllTestCases,
  getPistonLanguage,
  PISTON_LANGUAGE_MAP 
} from '@/lib/piston-service';

export async function POST(req) {
  try {
    const { sourceCode, language, stdin = '', testCases = [] } = await req.json();

    // Validation
    if (!sourceCode || !language) {
      return Response.json(
        { error: 'Missing sourceCode or language' },
        { status: 400 }
      );
    }

    // Check if language is supported
    if (!Object.values(PISTON_LANGUAGE_MAP).includes(getPistonLanguage(language))) {
      return Response.json(
        { error: `Language '${language}' not supported`, supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP) },
        { status: 400 }
      );
    }

    let result;

    // Case 1: Run single code execution with stdin
    if (stdin && testCases.length === 0) {
      result = await executeCode({
        sourceCode,
        language,
        stdin,
      });

      return Response.json({
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        language: result.language,
      });
    }

    // Case 2: Run multiple test cases
    if (testCases.length > 0) {
      result = await runAllTestCases({
        sourceCode,
        language,
        testCases,
      });

      return Response.json({
        success: true,
        totalTests: result.totalTests,
        passed: result.passed,
        failed: result.failed,
        allPassed: result.allPassed,
        results: result.results,
      });
    }

    // Case 3: Run code without input
    result = await executeCode({
      sourceCode,
      language,
      stdin: '',
    });

    return Response.json({
      success: result.success,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      language: result.language,
    });

  } catch (error) {
    console.error('[Code Executor API] Error:', error);
    return Response.json(
      { 
        error: error.message || 'Code execution failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check available languages
export async function GET(req) {
  return Response.json({
    supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
    pistonLanguages: Object.values(PISTON_LANGUAGE_MAP),
  });
}
