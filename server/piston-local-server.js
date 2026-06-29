/**
 * Piston-Compatible Local Execution Server
 * ─────────────────────────────────────────
 * Mimics the Piston Docker API exactly:
 *   POST /api/v2/piston/execute
 *   GET  /api/v2/piston/runtimes
 *   GET  /api/v2/piston/packages
 *
 * Runs on http://localhost:2000 — same URL the app expects.
 * No Docker, no virtualization needed. Uses local compilers/runtimes.
 *
 * Start:  node server/piston-local-server.js
 *         (or: npm run piston:start)
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const express = require("express");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PISTON_LOCAL_PORT || 2000;
const EXEC_TIMEOUT_MS = 10_000;
const TEMP_DIR = path.resolve(os.tmpdir(), "piston-local");

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────
// RUNTIME DETECTION
// Checks which languages are actually installed on this machine.
// ─────────────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === "win32";

function commandExists(cmd) {
  try {
    const r = spawnSync(cmd, ["--version"], {
      timeout: 3000,
      encoding: "utf-8",
      shell: IS_WINDOWS, // needed on Windows for PATH resolution
    });
    // On Windows, Microsoft Store python stub exits with status 9009
    if (r.status === 9009) return false;
    return !r.error && r.status !== null && r.status !== 9009;
  } catch {
    return false;
  }
}

function getVersion(cmd, args = ["--version"]) {
  try {
    const r = spawnSync(cmd, args, { timeout: 3000, encoding: "utf-8", shell: IS_WINDOWS });
    const out = (r.stdout || r.stderr || "").split("\n")[0].trim();
    const match = out.match(/(\d+\.\d+[\.\d]*)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

// Build the list of available runtimes at startup
function detectRuntimes() {
  const runtimes = [];

  const checks = [
    { lang: "javascript", cmds: ["node"], versionArgs: ["--version"], versionCmd: "node" },
    { lang: "python",     cmds: ["python", "python3"], versionArgs: ["--version"], versionCmd: null },
    { lang: "typescript", cmds: ["ts-node", "npx"], versionArgs: ["--version"], versionCmd: null },
    { lang: "java",       cmds: ["java"], versionArgs: ["-version"], versionCmd: "java" },
    { lang: "cpp",        cmds: ["g++"], versionArgs: ["--version"], versionCmd: "g++" },
    { lang: "c",          cmds: ["gcc"], versionArgs: ["--version"], versionCmd: "gcc" },
    { lang: "go",         cmds: ["go"], versionArgs: ["version"], versionCmd: "go" },
    { lang: "rust",       cmds: ["rustc"], versionArgs: ["--version"], versionCmd: "rustc" },
    { lang: "ruby",       cmds: ["ruby"], versionArgs: ["--version"], versionCmd: "ruby" },
    { lang: "php",        cmds: ["php"], versionArgs: ["--version"], versionCmd: "php" },
    { lang: "bash",       cmds: ["bash"], versionArgs: ["--version"], versionCmd: "bash" },
    { lang: "lua",        cmds: ["lua", "lua5.4", "lua5.3"], versionArgs: ["-v"], versionCmd: null },
  ];

  for (const check of checks) {
    const found = check.cmds.find(commandExists);
    if (found) {
      let version = "unknown";
      try {
        const vCmd = check.versionCmd || found;
        version = getVersion(vCmd, check.versionArgs);
      } catch {}
      runtimes.push({ language: check.lang, version, aliases: [check.lang], runtime: found });
    }
  }

  return runtimes;
}

const AVAILABLE_RUNTIMES = detectRuntimes();
console.log(
  `[Piston Local] Detected ${AVAILABLE_RUNTIMES.length} runtimes:`,
  AVAILABLE_RUNTIMES.map((r) => `${r.language}@${r.version}`).join(", ")
);

// ─────────────────────────────────────────────────────────────────
// FILE EXTENSIONS
// ─────────────────────────────────────────────────────────────────

const EXTENSIONS = {
  python: "py", javascript: "js", typescript: "ts",
  java: "java", cpp: "cpp", c: "c", go: "go",
  rust: "rs", ruby: "rb", php: "php", bash: "sh",
  csharp: "cs", kotlin: "kt", lua: "lua", r: "r",
};

// ─────────────────────────────────────────────────────────────────
// TEMP FILE HELPERS
// ─────────────────────────────────────────────────────────────────

function makeTempDir() {
  const id = crypto.randomBytes(8).toString("hex");
  const dir = path.join(TEMP_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

// ─────────────────────────────────────────────────────────────────
// EXECUTION ENGINE
// ─────────────────────────────────────────────────────────────────

function runProcess(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
    shell: IS_WINDOWS, // ensures PATH lookup works on Windows
    ...opts,
  });

  const timedOut = result.error?.code === "ETIMEDOUT" || result.signal === "SIGTERM";

  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exit_code: timedOut ? 124 : (result.status ?? -1),
    timedOut,
    error: result.error?.message || null,
  };
}

// Find the actual working Python command (Windows-safe)
function findPythonCmd() {
  // On Windows, 'python3' is often a Microsoft Store stub (exits 9009)
  // Try 'python' first on Windows
  const candidates = IS_WINDOWS
    ? ["python", "py", "python3"]
    : ["python3", "python"];
  return candidates.find(commandExists) || null;
}

function findLuaCmd() {
  for (const c of ["lua", "lua5.4", "lua5.3", "lua5.2"]) {
    if (commandExists(c)) return c;
  }
  return null;
}

/**
 * Execute source code for a given language.
 * Returns { stdout, stderr, exit_code, compile? }
 */
function executeLocally(language, sourceCode, stdin, workDir) {
  const lang = language.toLowerCase();
  const ext = EXTENSIONS[lang] || "txt";

  switch (lang) {
    // ── JavaScript ──────────────────────────────────────────────
    case "javascript": {
      const file = path.join(workDir, `main.${ext}`);
      fs.writeFileSync(file, sourceCode, "utf-8");
      const run = runProcess("node", [file], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── TypeScript ──────────────────────────────────────────────
    case "typescript": {
      const tsFile = path.join(workDir, "main.ts");
      const jsFile = path.join(workDir, "main.js");
      fs.writeFileSync(tsFile, sourceCode, "utf-8");

      // Try ts-node first (single step), else tsc+node
      if (commandExists("ts-node")) {
        const run = runProcess("ts-node", [tsFile], { input: stdin, cwd: workDir });
        return { run };
      }
      if (commandExists("tsc")) {
        const compile = runProcess("tsc", [tsFile, "--outDir", workDir, "--skipLibCheck"], { cwd: workDir });
        if (compile.exit_code !== 0) return { compile, run: { stdout: "", stderr: "", exit_code: 1 } };
        const run = runProcess("node", [jsFile], { input: stdin, cwd: workDir });
        return { compile, run };
      }
      // Fallback: strip types and run as JS
      const jsCode = sourceCode.replace(/:\s*(string|number|boolean|any|void|object|unknown|never)(\[\])?/g, "").replace(/<[^>]+>/g, "");
      fs.writeFileSync(jsFile, jsCode, "utf-8");
      const run = runProcess("node", [jsFile], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── Python ──────────────────────────────────────────────────
    case "python": {
      const pyCmd = findPythonCmd();
      if (!pyCmd) {
        return { run: { stdout: "", stderr: "Python not found. Install Python 3.", exit_code: 127 } };
      }
      const file = path.join(workDir, `main.${ext}`);
      fs.writeFileSync(file, sourceCode, "utf-8");
      const run = runProcess(pyCmd, [file], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── Java ─────────────────────────────────────────────────────
    case "java": {
      // Determine class name
      const classMatch = sourceCode.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : "Main";
      const file = path.join(workDir, `${className}.java`);
      fs.writeFileSync(file, sourceCode, "utf-8");

      const compile = runProcess("javac", [file], { cwd: workDir });
      if (compile.exit_code !== 0) {
        return { compile, run: { stdout: "", stderr: compile.stderr, exit_code: 1 } };
      }
      const run = runProcess("java", ["-cp", workDir, className], { input: stdin, cwd: workDir });
      return { compile, run };
    }

    // ── C++ ──────────────────────────────────────────────────────
    case "cpp": {
      const srcFile = path.join(workDir, "main.cpp");
      const exeFile = path.join(workDir, process.platform === "win32" ? "main.exe" : "main");
      fs.writeFileSync(srcFile, sourceCode, "utf-8");

      const compile = runProcess("g++", ["-O2", "-o", exeFile, srcFile], { cwd: workDir });
      if (compile.exit_code !== 0) {
        return { compile, run: { stdout: "", stderr: compile.stderr, exit_code: 1 } };
      }
      const run = runProcess(exeFile, [], { input: stdin, cwd: workDir });
      return { compile, run };
    }

    // ── C ───────────────────────────────────────────────────────
    case "c": {
      const srcFile = path.join(workDir, "main.c");
      const exeFile = path.join(workDir, process.platform === "win32" ? "main.exe" : "main");
      fs.writeFileSync(srcFile, sourceCode, "utf-8");

      const compile = runProcess("gcc", ["-O2", "-o", exeFile, srcFile], { cwd: workDir });
      if (compile.exit_code !== 0) {
        return { compile, run: { stdout: "", stderr: compile.stderr, exit_code: 1 } };
      }
      const run = runProcess(exeFile, [], { input: stdin, cwd: workDir });
      return { compile, run };
    }

    // ── Go ───────────────────────────────────────────────────────
    case "go": {
      const file = path.join(workDir, "main.go");
      fs.writeFileSync(file, sourceCode, "utf-8");
      const run = runProcess("go", ["run", file], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── Rust ─────────────────────────────────────────────────────
    case "rust": {
      const srcFile = path.join(workDir, "main.rs");
      const exeFile = path.join(workDir, process.platform === "win32" ? "main.exe" : "main");
      fs.writeFileSync(srcFile, sourceCode, "utf-8");

      const compile = runProcess("rustc", ["-o", exeFile, srcFile], { cwd: workDir });
      if (compile.exit_code !== 0) {
        return { compile, run: { stdout: "", stderr: compile.stderr, exit_code: 1 } };
      }
      const run = runProcess(exeFile, [], { input: stdin, cwd: workDir });
      return { compile, run };
    }

    // ── Ruby ─────────────────────────────────────────────────────
    case "ruby": {
      const file = path.join(workDir, "main.rb");
      fs.writeFileSync(file, sourceCode, "utf-8");
      const run = runProcess("ruby", [file], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── PHP ──────────────────────────────────────────────────────
    case "php": {
      const file = path.join(workDir, "main.php");
      fs.writeFileSync(file, sourceCode, "utf-8");
      const run = runProcess("php", [file], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── Bash ─────────────────────────────────────────────────────
    case "bash": {
      const file = path.join(workDir, "main.sh");
      fs.writeFileSync(file, sourceCode, "utf-8");
      const run = runProcess("bash", [file], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── Lua ──────────────────────────────────────────────────────
    case "lua": {
      const luaCmd = findLuaCmd();
      if (!luaCmd) {
        return { run: { stdout: "", stderr: "Lua not found. Install Lua.", exit_code: 127 } };
      }
      const file = path.join(workDir, "main.lua");
      fs.writeFileSync(file, sourceCode, "utf-8");
      const run = runProcess(luaCmd, [file], { input: stdin, cwd: workDir });
      return { run };
    }

    // ── Unsupported ──────────────────────────────────────────────
    default:
      return {
        run: {
          stdout: "",
          stderr: `Language '${language}' is not supported. Available: ${AVAILABLE_RUNTIMES.map((r) => r.language).join(", ")}`,
          exit_code: 1,
        },
      };
  }
}

// ─────────────────────────────────────────────────────────────────
// API ROUTES  (Piston v2 compatible)
// ─────────────────────────────────────────────────────────────────

// GET /api/v2/piston/runtimes
app.get("/api/v2/piston/runtimes", (req, res) => {
  res.json(AVAILABLE_RUNTIMES.map(({ language, version, aliases }) => ({ language, version, aliases })));
});

// GET /api/v2/piston/packages  (Piston compat — mirrors runtimes)
app.get("/api/v2/piston/packages", (req, res) => {
  res.json(AVAILABLE_RUNTIMES.map(({ language, version }) => ({ language, version, installed: true })));
});

// POST /api/v2/piston/execute
app.post("/api/v2/piston/execute", (req, res) => {
  const { language, version, files, stdin = "", run_timeout } = req.body;

  if (!language || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      message: "language and files are required",
    });
  }

  const sourceCode = files.map((f) => f.content || "").join("\n");

  if (!sourceCode.trim()) {
    return res.status(400).json({ message: "No source code provided" });
  }

  // Check if runtime is available
  const runtime = AVAILABLE_RUNTIMES.find((r) => r.language === language.toLowerCase());
  if (!runtime) {
    return res.status(400).json({
      message: `Runtime '${language}' is not installed on this machine.`,
      availableRuntimes: AVAILABLE_RUNTIMES.map((r) => r.language),
      hint: `Install ${language} on your system to use it.`,
    });
  }

  const workDir = makeTempDir();

  try {
    const startMs = Date.now();
    const result = executeLocally(language, sourceCode, stdin, workDir);
    const wallTime = Date.now() - startMs;

    console.log(
      `[Execute] ${language} | exit=${result.run.exit_code} | ${wallTime}ms` +
        (result.run.timedOut ? " | TIMEOUT" : "")
    );

    // Build Piston-compatible response
    const response = {
      language,
      version: runtime.version,
      run: {
        stdout: result.run.stdout || "",
        stderr: result.run.stderr || "",
        output: (result.run.stdout || "") + (result.run.stderr || ""),
        exit_code: result.run.exit_code,
        signal: null,
        wall_time: wallTime,
      },
    };

    // Add compile stage if present
    if (result.compile) {
      response.compile = {
        stdout: result.compile.stdout || "",
        stderr: result.compile.stderr || "",
        output: (result.compile.stdout || "") + (result.compile.stderr || ""),
        exit_code: result.compile.exit_code,
        signal: null,
      };
    }

    res.json(response);
  } catch (err) {
    console.error("[Execute] Unexpected error:", err);
    res.status(500).json({
      message: "Internal execution error",
      error: err.message,
    });
  } finally {
    cleanupDir(workDir);
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    runtimes: AVAILABLE_RUNTIMES.length,
    mode: "local-native",
    note: "Piston-compatible local server (no Docker needed)",
  });
});

// Root
app.get("/", (req, res) => {
  res.json({
    name: "Piston Local Server",
    version: "1.0.0",
    mode: "native",
    pistonApiBase: "/api/v2/piston",
    runtimes: AVAILABLE_RUNTIMES.length,
  });
});

// ─────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────

app.listen(PORT, "127.0.0.1", () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Piston-Compatible Local Execution Server  ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n🚀 Running on: http://localhost:${PORT}/api/v2/piston`);
  console.log(`📦 Runtimes  : ${AVAILABLE_RUNTIMES.length}`);
  AVAILABLE_RUNTIMES.forEach((r) =>
    console.log(`   • ${r.language.padEnd(12)} ${r.version}`)
  );
  console.log("\n   GET  /api/v2/piston/runtimes");
  console.log("   POST /api/v2/piston/execute");
  console.log("\n   Press Ctrl+C to stop\n");
});

module.exports = app;
