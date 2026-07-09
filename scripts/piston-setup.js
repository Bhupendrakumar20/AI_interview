#!/usr/bin/env node
/**
 * piston-setup.js
 * ───────────────
 * Installs all required language runtimes into the self-hosted
 * Piston Docker container.
 *
 * Usage:
 *   node scripts/piston-setup.js
 *
 * Prerequisites:
 *   docker compose up -d       ← must be running first
 */

const PISTON_URL = process.env.PISTON_API_URL || 'http://localhost:2000/api/v2';

// ── Languages to install (name must match Piston package names) ───
// Get full list: GET http://localhost:2000/api/v2/packages
const RUNTIMES_TO_INSTALL = [
  { language: 'python',     version: '3.10.0' },
  { language: 'node',       version: '18.15.0' },
  { language: 'typescript', version: '5.0.3' },
  { language: 'java',       version: '15.0.2' },
  { language: 'gcc',        version: '10.2.0' },
  { language: 'go',         version: '1.16.2' },
  { language: 'rust',       version: '1.68.2' },
  { language: 'ruby',       version: '3.0.1' },
  { language: 'bash',       version: '5.2.0' },
];

// ANSI colours
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', B = '\x1b[36m', X = '\x1b[0m';

async function checkConnectivity() {
  console.log(`${B}[Piston Setup]${X} Checking connectivity to ${PISTON_URL} ...`);
  try {
    const res = await fetch(`${PISTON_URL}/runtimes`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const runtimes = await res.json();
    console.log(`${G}✔ Piston is running${X} — ${runtimes.length} runtime(s) already installed`);
    return runtimes;
  } catch (err) {
    console.error(`${R}✖ Cannot reach Piston:${X}`, err.message);
    console.error(`  Make sure Docker is running: ${Y}docker compose up -d${X}`);
    process.exit(1);
  }
}

async function getAvailablePackages() {
  try {
    const res = await fetch(`${PISTON_URL}/packages`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function installRuntime(language, version, installedSet) {
  const key = `${language}-${version}`;
  if (installedSet.has(key)) {
    console.log(`${Y}  ↩ ${language}@${version} already installed — skipping${X}`);
    return { skipped: true };
  }

  process.stdout.write(`  Installing ${B}${language}@${version}${X} ... `);
  try {
    const res = await fetch(`${PISTON_URL}/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, version }),
      signal: AbortSignal.timeout(120_000), // 2 min per package
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log(`${R}FAILED${X} (HTTP ${res.status})`);
      if (body?.message) console.error(`    Error: ${body.message}`);
      return { success: false };
    }

    console.log(`${G}OK${X}`);
    return { success: true };
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.log(`${R}TIMEOUT${X}`);
    } else {
      console.log(`${R}ERROR${X}: ${err.message}`);
    }
    return { success: false };
  }
}

async function verifyInstallations() {
  const res = await fetch(`${PISTON_URL}/runtimes`, { signal: AbortSignal.timeout(5000) });
  return await res.json();
}

async function main() {
  console.log(`\n${B}═══════════════════════════════════════${X}`);
  console.log(`${B}  Piston Docker Runtime Setup Script   ${X}`);
  console.log(`${B}═══════════════════════════════════════${X}\n`);

  // 1. Check Piston is up
  const existingRuntimes = await checkConnectivity();
  const installedSet = new Set(existingRuntimes.map((r) => `${r.language}-${r.version}`));

  // 2. Show available packages (optional, may fail on some builds)
  const available = await getAvailablePackages();
  if (available) {
    console.log(`\n${B}Available packages in this Piston build:${X} ${available.length}`);
  }

  // 3. Install runtimes
  console.log(`\n${B}Installing ${RUNTIMES_TO_INSTALL.length} language runtimes...${X}\n`);

  const results = { success: 0, skipped: 0, failed: 0 };
  for (const { language, version } of RUNTIMES_TO_INSTALL) {
    const result = await installRuntime(language, version, installedSet);
    if (result.skipped) results.skipped++;
    else if (result.success) results.success++;
    else results.failed++;
  }

  // 4. Final verification
  console.log(`\n${B}Verifying installed runtimes...${X}`);
  const finalRuntimes = await verifyInstallations();
  console.log(`\n${G}Installed runtimes (${finalRuntimes.length}):${X}`);
  finalRuntimes.forEach((r) => console.log(`  • ${r.language} ${r.version}`));

  // 5. Summary
  console.log(`\n${B}═══════════════════════════════════════${X}`);
  console.log(`${G}✔ Installed: ${results.success}${X}  ${Y}↩ Skipped: ${results.skipped}${X}  ${results.failed > 0 ? R : G}✖ Failed: ${results.failed}${X}`);
  console.log(`${B}═══════════════════════════════════════${X}\n`);

  if (results.failed > 0) {
    console.log(`${Y}Some installs failed. This can happen if Piston doesn't have those packages.`);
    console.log(`Check available packages: GET ${PISTON_URL}/packages${X}\n`);
  } else {
    console.log(`${G}🎉 All done! Piston is ready for code execution.${X}`);
    console.log(`Test it: ${Y}GET http://localhost:2000/api/v2/piston/runtimes${X}\n`);
  }
}

main().catch((err) => {
  console.error(`${R}Unexpected error:${X}`, err);
  process.exit(1);
});
