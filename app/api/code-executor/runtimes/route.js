/**
 * GET  /api/code-executor/runtimes
 * Returns all installed runtimes from the self-hosted Piston Docker container.
 *
 * POST /api/code-executor/runtimes
 * Install a new runtime package into Piston.
 * Body: { language: string, version: string }
 */

import {
  getPistonRuntimes,
  installPistonRuntime,
  testPistonConnectivity,
  PISTON_LANGUAGE_MAP,
} from '@/lib/piston-service';

export async function GET() {
  const connectivity = await testPistonConnectivity();

  if (!connectivity.ok) {
    return Response.json(
      {
        success: false,
        status: 'OFFLINE',
        error: connectivity.error,
        pistonUrl: connectivity.url,
        fix: 'Run: docker compose up -d  (from the project root)',
      },
      { status: 503 }
    );
  }

  const runtimes = await getPistonRuntimes();

  // Map installed runtimes to our supported language names
  const installedLanguages = new Set(runtimes.map((r) => r.language));
  const supportedNotInstalled = Object.values(
    Object.fromEntries(
      Object.entries(PISTON_LANGUAGE_MAP).filter(
        ([, v]) => !installedLanguages.has(v)
      )
    )
  );

  return Response.json({
    success: true,
    status: 'OPERATIONAL',
    pistonUrl: connectivity.url,
    installedCount: runtimes.length,
    runtimes,
    supportedLanguages: Object.keys(PISTON_LANGUAGE_MAP),
    notYetInstalled: [...new Set(supportedNotInstalled)],
    tip: 'POST to this endpoint with { language, version } to install a runtime',
  });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { language, version } = body;

  if (!language || !version) {
    return Response.json(
      { error: 'Both language and version are required', example: { language: 'python', version: '3.10.0' } },
      { status: 400 }
    );
  }

  console.log(`[Piston Install] Installing ${language}@${version}...`);
  const result = await installPistonRuntime(language, version);

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    message: `Runtime ${language}@${version} installed successfully`,
    data: result.data,
  });
}
