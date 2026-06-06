'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Code2, 
  Play, 
  Loader, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Trash2,
  Zap,
  Eye,
  EyeOff,
  Code,
  FileText,
  BarChart3
} from 'lucide-react';
import { formatCode, detectSyntaxErrors, getCodeStats } from '@/lib/code-formatter';
import { useTheme } from '@/lib/theme-context';

/**
 * Enhanced Code Editor Component with Theme Support
 * Features:
 * - Multiple language support
 * - Real-time syntax checking
 * - Code formatting
 * - Test case runner
 * - Code statistics
 * - Dark/Light theme support
 */
export default function CodeEditorPanel({ 
  language = 'javascript', 
  onLanguageChange, 
  onExecute,
  initialCode = '',
  testCases = [],
  disabled = false 
}) {
  const { theme } = useTheme();
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // editor, output, stats
  const [showSyntaxErrors, setShowSyntaxErrors] = useState(true);
  const [executionTime, setExecutionTime] = useState(0);
  const [testResults, setTestResults] = useState(null);
  const [codeStats, setCodeStats] = useState(null);
  
  const codeInputRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCodeChange = (e) => {
    setCode(e.target.value);
  };

  const handleFormat = useCallback(() => {
    try {
      const formatted = formatCode(code, language);
      setCode(formatted);
      setError('');
    } catch (err) {
      setError(`Formatting failed: ${err.message}`);
    }
  }, [code, language]);

  const handleCheckSyntax = useCallback(() => {
    const errors = detectSyntaxErrors(code, language);
    
    if (errors.length === 0) {
      setError('✓ No syntax errors detected');
    } else {
      const errorText = errors
        .map(e => `Line ${e.line}: ${e.message} (${e.severity})`)
        .join('\n');
      setError(errorText);
    }
  }, [code, language]);

  const handleUpdateStats = useCallback(() => {
    const stats = getCodeStats(code);
    setCodeStats(stats);
  }, [code]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  const handleClearCode = () => {
    if (confirm('Clear all code?')) {
      setCode('');
      setOutput('');
      setError('');
      setTestResults(null);
    }
  };

  const handleExecute = async () => {
    if (!code.trim()) {
      setError('Code cannot be empty');
      return;
    }

    setIsLoading(true);
    setError('');
    setOutput('');
    setTestResults(null);

    const startTime = performance.now();

    try {
      const response = await fetch('/api/code-executor/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode: code,
          language,
          testCases: testCases.length > 0 ? testCases : undefined,
        }),
      });

      const data = await response.json();
      const executionMs = performance.now() - startTime;
      setExecutionTime(executionMs);

      if (!response.ok) {
        setError(`Error: ${data.error || 'Execution failed'}`);
        return;
      }

      // Handle test results
      if (data.results) {
        setTestResults({
          total: data.totalTests,
          passed: data.passed,
          failed: data.failed,
          allPassed: data.allPassed,
          results: data.results,
        });
        setOutput(
          data.results
            .map((r, i) => `Test ${i + 1}: ${r.passed ? '✓ PASS' : '✗ FAIL'}\nOutput: ${r.output}`)
            .join('\n---\n')
        );
      } else {
        // Single execution
        setOutput(data.output || '(no output)');
        if (data.error) {
          setError(`Runtime Error:\n${data.error}`);
        }
      }

      if (onExecute) {
        onExecute({ code, output: data.output, language });
      }

    } catch (err) {
      setError(`Execution Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setActiveTab('output');
    }
  };

  useEffect(() => {
    handleUpdateStats();
  }, [code, handleUpdateStats]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER SYNTAX ERRORS
  // ─────────────────────────────────────────────────────────────────────────────

  const syntaxErrors = detectSyntaxErrors(code, language);

  // Theme colors
  const isDark = theme === 'dark';
  const bgPrimary = isDark ? 'bg-slate-950' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const bgTertiary = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-300';
  const editorBg = isDark ? 'bg-slate-950' : 'bg-gray-50';
  const editorText = isDark ? 'text-green-400' : 'text-green-700';
  const inputBg = isDark ? 'bg-slate-700' : 'bg-slate-200';
  const inputHover = isDark ? 'hover:border-blue-500' : 'hover:border-blue-400';

  return (
    <div className={`flex flex-col h-full ${bgSecondary} rounded-lg overflow-hidden border ${borderColor}`}>
      
      {/* TOOLBAR */}
      <div className={`${bgTertiary} border-b ${borderColor} p-3 flex items-center justify-between flex-wrap gap-2`}>
        
        {/* Left: Language & Format Buttons */}
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => {
              onLanguageChange?.(e.target.value);
            }}
            className={`px-3 py-1 ${inputBg} ${textPrimary} rounded text-sm border ${borderColor} ${inputHover} focus:outline-none focus:border-blue-500`}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          <button
            onClick={handleFormat}
            title="Format Code"
            className={`p-2 ${inputBg} hover:bg-blue-600 ${textPrimary} rounded transition text-sm`}
          >
            <Code2 size={16} />
          </button>

          <button
            onClick={handleCheckSyntax}
            title="Check Syntax"
            className={`p-2 ${inputBg} hover:bg-yellow-600 ${textPrimary} rounded transition text-sm`}
          >
            <AlertCircle size={16} />
          </button>
        </div>

        {/* Center: Stats & Visibility */}
        <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
          {codeStats && (
            <>
              <span>{codeStats.nonEmptyLines} lines</span>
              <span>•</span>
              <span>{codeStats.characters} chars</span>
            </>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            title="Copy Code"
            className={`p-2 ${inputBg} hover:bg-slate-600 ${textPrimary} rounded transition text-sm`}
          >
            <Copy size={16} />
          </button>

          <button
            onClick={handleClearCode}
            title="Clear Code"
            className={`p-2 ${inputBg} hover:bg-red-600 ${textPrimary} rounded transition text-sm`}
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={handleExecute}
            disabled={isLoading || disabled}
            className={`px-4 py-1 rounded text-sm font-semibold flex items-center gap-2 transition ${
              isLoading
                ? isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-500'
                : isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
            } ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className={`flex border-b ${borderColor} ${bgTertiary}`}>
        {[
          { id: 'editor', label: 'Editor', icon: Code },
          { id: 'output', label: 'Output', icon: FileText },
          { id: 'stats', label: 'Stats', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition border-b-2 ${
              activeTab === tab.id
                ? isDark ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600'
                : `border-transparent ${textSecondary} ${isDark ? 'hover:text-slate-300' : 'hover:text-slate-700'}`
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className={`flex-1 overflow-hidden ${bgSecondary}`}>
        
        {/* EDITOR TAB */}
        {activeTab === 'editor' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              <textarea
                ref={codeInputRef}
                value={code}
                onChange={handleCodeChange}
                placeholder="Write your code here..."
                className={`w-full h-full p-4 ${editorBg} ${editorText} font-mono text-sm resize-none focus:outline-none border-none`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8f8f8',
                  color: isDark ? '#4ade80' : '#15803d',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  lineHeight: '1.6',
                }}
              />
            </div>

            {/* SYNTAX ERRORS DISPLAY */}
            {showSyntaxErrors && syntaxErrors.length > 0 && (
              <div className={`border-t ${borderColor} ${bgTertiary} p-3 max-h-24 overflow-auto`}>
                <div className={`${isDark ? 'text-yellow-500' : 'text-yellow-600'} text-xs font-semibold mb-2`}>
                  ⚠ Potential Issues ({syntaxErrors.length}):
                </div>
                {syntaxErrors.map((err, i) => (
                  <div key={i} className={`${isDark ? 'text-yellow-600' : 'text-yellow-700'} text-xs mb-1`}>
                    Line {err.line}: {err.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OUTPUT TAB */}
        {activeTab === 'output' && (
          <div className={`p-4 h-full overflow-auto flex flex-col gap-4`}>
            
            {/* EXECUTION TIME */}
            {executionTime > 0 && (
              <div className={`text-xs ${textSecondary} flex items-center gap-1`}>
                <Zap size={14} />
                Execution time: {executionTime.toFixed(2)}ms
              </div>
            )}

            {/* TEST RESULTS */}
            {testResults && (
              <div className={`p-3 rounded-lg border ${
                testResults.allPassed
                  ? isDark ? 'border-green-700 bg-green-900 text-green-300' : 'border-green-300 bg-green-100 text-green-800'
                  : isDark ? 'border-red-700 bg-red-900 text-red-300' : 'border-red-300 bg-red-100 text-red-800'
              }`}>
                <div className="flex items-center gap-2 font-semibold mb-2">
                  {testResults.allPassed ? (
                    <>
                      <CheckCircle size={18} />
                      All Tests Passed! ({testResults.passed}/{testResults.total})
                    </>
                  ) : (
                    <>
                      <AlertCircle size={18} />
                      {testResults.passed} of {testResults.total} tests passed
                    </>
                  )}
                </div>
                <div className="text-xs space-y-1">
                  {testResults.results.map((result, i) => (
                    <div key={i} className={result.passed ? isDark ? 'text-green-300' : 'text-green-700' : isDark ? 'text-red-300' : 'text-red-700'}>
                      Test {i + 1}: {result.passed ? '✓' : '✗'} {result.testInput && `(input: "${result.testInput}")`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
              <div className={`p-3 rounded-lg border ${isDark ? 'border-red-700 bg-red-900 text-red-200' : 'border-red-300 bg-red-100 text-red-800'} text-sm font-mono overflow-auto max-h-32`}>
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Error
                </div>
                <pre className="text-xs whitespace-pre-wrap">{error}</pre>
              </div>
            )}

            {/* STDOUT */}
            {output && !testResults && (
              <div className={`p-3 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-800 text-green-400' : 'border-slate-300 bg-slate-100 text-green-700'} text-sm font-mono overflow-auto max-h-40`}>
                <div className={`font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Output:</div>
                <pre className="text-xs whitespace-pre-wrap">{output}</pre>
              </div>
            )}

            {!output && !error && !testResults && (
              <div className={`${textSecondary} text-sm italic`}>
                Run your code to see output here...
              </div>
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && codeStats && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Lines', value: codeStats.totalLines },
                { label: 'Non-Empty Lines', value: codeStats.nonEmptyLines },
                { label: 'Comment Lines', value: codeStats.commentLines },
                { label: 'Code Lines', value: codeStats.codeLines },
                { label: 'Characters', value: codeStats.characters },
                { label: 'Words', value: codeStats.words },
              ].map(stat => (
                <div key={stat.label} className={`${bgTertiary} p-3 rounded border ${borderColor}`}>
                  <div className={`${textSecondary} text-xs`}>{stat.label}</div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div className={`${bgTertiary} p-3 rounded border ${borderColor}`}>
              <div className={`${textSecondary} text-sm`}>Comment Ratio</div>
              <div className={`mt-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-2 overflow-hidden`}>
                <div
                  className={isDark ? 'bg-blue-500' : 'bg-blue-600'}
                  style={{
                    height: '100%',
                    width: `${codeStats.nonEmptyLines > 0 ? (codeStats.commentLines / codeStats.nonEmptyLines) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className={`text-xs ${textSecondary} mt-1`}>
                {((codeStats.commentLines / codeStats.nonEmptyLines) * 100 || 0).toFixed(1)}% comments
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
