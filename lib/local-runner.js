// local-runner.js — ES Module version for piston-service.js
// Falls back gracefully in serverless environments (Next.js API routes)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let spawnSync, fs, path;
try {
  ({ spawnSync } = require('child_process'));
  fs = require('fs');
  path = require('path');
} catch (_) {
  // child_process not available (e.g. Next.js edge runtime)
  spawnSync = null;
  fs = null;
  path = null;
}

export function executeLocally(sourceCode, language, stdin = '') {
  // Guard: child_process unavailable in Next.js serverless/edge
  if (!spawnSync || !fs || !path) {
    return {
      success: false,
      output: '',
      error: 'Local execution unavailable in this environment (serverless/edge). Use Piston API instead.',
      exitCode: -1,
    };
  }
  // Create a temp folder if it doesn't exist
  const tempDir = path.resolve(process.cwd(), '.temp_code');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  
  let cmd = '';
  let args = [];
  let compileCmd = '';
  let compileArgs = [];
  let ext = '';
  let runFile = '';
  let exeFile = '';
  
  const lang = language.toLowerCase();
  
  if (lang === 'javascript' || lang === 'js') {
    ext = 'js';
    cmd = 'node';
    runFile = path.join(tempDir, `run_${timestamp}.${ext}`);
    fs.writeFileSync(runFile, sourceCode, 'utf-8');
    args = [runFile];
  } else if (lang === 'python' || lang === 'python3' || lang === 'py') {
    ext = 'py';
    cmd = 'python'; // Try python first, fallback to python3 if missing
    runFile = path.join(tempDir, `run_${timestamp}.${ext}`);
    fs.writeFileSync(runFile, sourceCode, 'utf-8');
    args = [runFile];
  } else if (lang === 'cpp' || lang === 'c++') {
    ext = 'cpp';
    runFile = path.join(tempDir, `run_${timestamp}.${ext}`);
    exeFile = path.join(tempDir, `run_${timestamp}.exe`);
    fs.writeFileSync(runFile, sourceCode, 'utf-8');
    compileCmd = 'g++';
    compileArgs = ['-O3', runFile, '-o', exeFile];
    cmd = exeFile;
  } else if (lang === 'java') {
    ext = 'java';
    const runDir = path.join(tempDir, `run_${timestamp}`);
    fs.mkdirSync(runDir, { recursive: true });
    
    let className = 'Solution';
    const match = sourceCode.match(/public\s+class\s+(\w+)/);
    if (match) {
      className = match[1];
    }
    
    runFile = path.join(runDir, `${className}.java`);
    fs.writeFileSync(runFile, sourceCode, 'utf-8');
    compileCmd = 'javac';
    compileArgs = [runFile];
    cmd = 'java';
    args = ['-cp', runDir, className];
  } else {
    return {
      success: false,
      output: '',
      error: `Language ${language} not supported for local fallback.`,
      exitCode: -1
    };
  }

  try {
    // Compile if necessary
    if (compileCmd) {
      const compileResult = spawnSync(compileCmd, compileArgs, {
        encoding: 'utf-8',
        timeout: 10000,
      });

      if (compileResult.status !== 0) {
        cleanup();
        return {
          success: false,
          output: '',
          error: `Compilation Error:\n${compileResult.stderr || compileResult.stdout || 'Unknown compiler error'}`,
          exitCode: compileResult.status || -1
        };
      }
    }

    // Fallback python -> python3 if python not found
    if (cmd === 'python') {
      const checkPy = spawnSync('python', ['--version']);
      if (checkPy.error) {
        cmd = 'python3';
      }
    }

    const runResult = spawnSync(cmd, args, {
      input: stdin,
      encoding: 'utf-8',
      timeout: 5000,
    });

    cleanup();

    if (runResult.error) {
      if (runResult.error.code === 'ETIMEDOUT') {
        return {
          success: false,
          output: '',
          error: 'Time Limit Exceeded (5 seconds)',
          exitCode: -1
        };
      }
      return {
        success: false,
        output: '',
        error: `Runtime Error: ${runResult.error.message}`,
        exitCode: -1
      };
    }

    return {
      success: true,
      output: runResult.stdout || '',
      error: runResult.stderr || '',
      exitCode: runResult.status || 0
    };

  } catch (err) {
    cleanup();
    return {
      success: false,
      output: '',
      error: `Local Runner Exception: ${err.message}`,
      exitCode: -1
    };
  }

  function cleanup() {
    try {
      if (runFile && fs.existsSync(runFile)) {
        fs.unlinkSync(runFile);
      }
      if (exeFile && fs.existsSync(exeFile)) {
        fs.unlinkSync(exeFile);
      }
      if (lang === 'java') {
        const runDir = path.dirname(runFile);
        if (fs.existsSync(runDir)) {
          const files = fs.readdirSync(runDir);
          for (const file of files) {
            fs.unlinkSync(path.join(runDir, file));
          }
          fs.rmdirSync(runDir);
        }
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}

// Also export as CommonJS for the socket server (which uses require)
export default { executeLocally };
