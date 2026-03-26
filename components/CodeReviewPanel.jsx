'use client';

import { useState } from 'react';
import { ChevronDown, Copy, GitCompare, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

function CodeReviewPanel({ submissions, question }) {
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [activeComment, setActiveComment] = useState(null);
  const [comments, setComments] = useState({});
  const [selectedComparison, setSelectedComparison] = useState(null);

  // Get language for syntax highlighting
  const getLanguageMode = (language) => {
    const map = { javascript: 'javascript', python: 'python', java: 'java', cpp: 'cpp' };
    return map[language] || 'javascript';
  };

  // Copy code to clipboard
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Code copied!');
  };

  // Add comment to code
  const addComment = (submissionId, lineNumber, text) => {
    const key = `${submissionId}-${lineNumber}`;
    setComments((prev) => ({
      ...prev,
      [key]: text,
    }));
    setActiveComment(null);
  };

  // Calculate test pass rate
  const getTestPassRate = (testResults) => {
    if (!testResults || !testResults.total) return 0;
    return Math.round((testResults.passed / testResults.total) * 100);
  };

  // Side-by-side code comparison
  const renderComparison = () => {
    if (!selectedComparison || selectedComparison.length < 2) return null;

    const sub1 = selectedComparison[0];
    const sub2 = selectedComparison[1];

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-950 rounded-lg w-full max-w-6xl max-h-96 overflow-auto flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-900">
            <h3 className="text-lg font-bold text-white">Code Comparison</h3>
            <button
              onClick={() => setSelectedComparison(null)}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <div className="flex flex-1 overflow-auto">
            {/* Left side */}
            <div className="flex-1 border-r border-slate-700">
              <div className="p-4 bg-slate-800 border-b border-slate-700">
                <p className="text-sm font-bold text-emerald-400">
                  {sub1.user_username} — {sub1.language}
                </p>
                <p className="text-xs text-slate-400">Pass Rate: {getTestPassRate(sub1.test_results)}%</p>
              </div>
              <SyntaxHighlighter
                language={getLanguageMode(sub1.language)}
                style={atomDark}
                className="!bg-slate-950 text-sm max-h-96 p-4"
              >
                {sub1.code}
              </SyntaxHighlighter>
            </div>

            {/* Right side */}
            <div className="flex-1">
              <div className="p-4 bg-slate-800 border-b border-slate-700">
                <p className="text-sm font-bold text-cyan-400">
                  {sub2.user_username} — {sub2.language}
                </p>
                <p className="text-xs text-slate-400">Pass Rate: {getTestPassRate(sub2.test_results)}%</p>
              </div>
              <SyntaxHighlighter
                language={getLanguageMode(sub2.language)}
                style={atomDark}
                className="!bg-slate-950 text-sm max-h-96 p-4"
              >
                {sub2.code}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!submissions || submissions.length === 0) {
    return (
      <div className="bg-slate-900 rounded-lg p-8 text-center border border-slate-700">
        <MessageSquare className="mx-auto mb-3 text-slate-500" size={32} />
        <p className="text-slate-400">No submissions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
        <div>
          <h3 className="text-lg font-bold text-white">Code Review</h3>
          <p className="text-sm text-slate-400">{submissions.length} submissions to review</p>
        </div>
        {submissions.length >= 2 && (
          <button
            onclick={() =>
              setSelectedComparison([submissions[0], submissions[1]])
            }
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            <GitCompare size={18} />
            Compare
          </button>
        )}
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {submissions.map((submission, idx) => (
          <div
            key={submission.id}
            className="border border-slate-700 rounded-lg bg-slate-900 overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() =>
                setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)
              }
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-md text-sm font-mono">
                  #{idx + 1}
                </span>
                <div className="text-left">
                  <p className="font-semibold text-white">{submission.user_username}</p>
                  <p className="text-sm text-slate-400">
                    {submission.language} • {new Date(submission.submitted_at).toLocaleTimeString()}
                  </p>
                </div>

                {/* Test Results Badge */}
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {submission.test_results?.passed > 0 ? (
                      <CheckCircle className="text-emerald-500" size={20} />
                    ) : (
                      <XCircle className="text-red-500" size={20} />
                    )}
                    <span className="text-sm font-mono text-slate-400">
                      {submission.test_results?.passed || 0}/{submission.test_results?.total || 0}
                    </span>
                  </div>

                  {submission.first_blood && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">
                      FIRST BLOOD
                    </span>
                  )}
                </div>
              </div>

              <ChevronDown
                size={20}
                className={`text-slate-500 transition ${
                  expandedSubmission === submission.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expanded Content */}
            {expandedSubmission === submission.id && (
              <div className="border-t border-slate-700 p-4 space-y-4">
                {/* Code Viewer */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-white text-sm">Source Code</h4>
                    <button
                      onClick={() => copyCode(submission.code)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                  <SyntaxHighlighter
                    language={getLanguageMode(submission.language)}
                    style={atomDark}
                    className="!bg-slate-950 rounded text-sm max-h-64 overflow-auto"
                  >
                    {submission.code}
                  </SyntaxHighlighter>
                </div>

                {/* Test Results Breakdown */}
                {submission.test_results && (
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <h4 className="font-semibold text-white text-sm mb-2">Test Results</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-slate-400">Passed</p>
                        <p className="text-emerald-400 font-bold">{submission.test_results.passed || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Failed</p>
                        <p className="text-red-400 font-bold">{submission.test_results.failed || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Total</p>
                        <p className="text-slate-300 font-bold">{submission.test_results.total || 0}</p>
                      </div>
                    </div>

                    {/* Execution Time */}
                    {submission.execution_time_ms && (
                      <div className="mt-2 text-xs text-slate-400">
                        Execution: <span className="text-slate-200 font-mono">{submission.execution_time_ms}ms</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Comments Section */}
                <div className="border-t border-slate-700 pt-3">
                  <h4 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Comments & Feedback
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(comments).map(
                      ([key, text]) =>
                        key.startsWith(submission.id) && (
                          <div
                            key={key}
                            className="bg-slate-950 p-2 rounded text-sm text-slate-300 border-l-2 border-indigo-500"
                          >
                            {text}
                          </div>
                        )
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = e.target.comment.value;
                      addComment(submission.id, 0, text);
                      e.target.reset();
                    }}
                    className="mt-2 flex gap-2"
                  >
                    <input
                      type="text"
                      name="comment"
                      placeholder="Add feedback..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison Modal */}
      {renderComparison()}
    </div>
  );
}

export default CodeReviewPanel;
