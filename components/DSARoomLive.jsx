'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  calculatePoints,
  formatTime,
  getTimerColor,
  calculateAccuracy,
  JUDGE0_LANGUAGES,
  getDifficultyColor,
  SUBMISSION_STATUS,
} from '@/lib/utils/dsa-room-utils';

const DSARoomLive = ({
  roomId,
  userId,
  username,
  socket,
  initialQuestions = [],
  initialParticipants = [],
  timeLimit = 30,
}) => {
  // ─── STATE ────────────────────────────────────────────────────────────
  const [code, setCode] = useState('// Write your solution here\n');
  const [language, setLanguage] = useState('javascript');
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState(initialParticipants);
  
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60 * 1000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [showTestResults, setShowTestResults] = useState(false);
  
  const [solvedQuestions, setSolvedQuestions] = useState([]);
  const [participantStats, setParticipantStats] = useState({});
  
  const roomStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const lastSyncTimeRef = useRef(Date.now());

  // ─── EFFECTS ────────────────────────────────────────────────────────────

  // Fetch questions list on mount
  useEffect(() => {
    if (!socket) return;

    socket.emit('get_question_list', { difficulty: 'Medium' }, (response) => {
      if (response?.success && response.questions) {
        setQuestionsList(response.questions);
        // Select first question by default
        if (response.questions.length > 0) {
          setCurrentQuestionId(response.questions[0].id);
          fetchQuestionDetails(response.questions[0].id, response.questions[0].title);
        }
      }
      setQuestionsLoading(false);
    });
  }, [socket]);

  // Fetch question details when question is selected
  const fetchQuestionDetails = (questionId, titleSlug) => {
    if (!socket) return;

    socket.emit('get_question_details', { questionId, titleSlug }, (response) => {
      if (response?.success && response.question) {
        setCurrentQuestion(response.question);
        setCurrentQuestionId(questionId);
        setCode('// Write your solution here\n');
      }
    });
  };

  // Initialize room
  useEffect(() => {
    if (!socket) return;

    // Handle room state initialization
    socket.on('room_state_init', (data) => {
      setQuestions(data.questions || []);
      setLeaderboard(data.participants || []);
      roomStartTimeRef.current = data.serverStartTime;
    });

    // Handle timer ticks
    socket.on('timer_tick', (data) => {
      const { serverTime, timeRemaining, secondsSinceStart } = data;
      setTimeRemaining(Math.max(0, timeRemaining));
      lastSyncTimeRef.current = serverTime;
    });

    // Handle successful submissions
    socket.on('submission_result', (data) => {
      const { userId: submitterId, questionId, status, points } = data;
      
      if (submitterId === userId) {
        if (status === 'passed') {
          toast.success(`Question solved! +${points} points`);
          setSolvedQuestions((prev) => [...new Set([...prev, questionId])]);
        } else {
          toast.error('Some test cases failed. Try again!');
        }
      }
      
      // Update leaderboard
      setLeaderboard((prev) =>
        prev.map((p) =>
          p.userId === submitterId ? { ...p, points: data.points } : p
        )
      );
    });

    // Handle leaderboard updates
    socket.on('leaderboard_update', (updatedLeaderboard) => {
      setLeaderboard(updatedLeaderboard);
    });

    // Handle user join/leave
    socket.on('user_joined', (data) => {
      toast.info(`${data.username} joined the room`);
    });

    socket.on('user_left', (data) => {
      toast.info(`${data.username} left the room`);
      setLeaderboard((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    // Handle game end
    socket.on('game_ended', (data) => {
      toast.success('Room ended!');
      // Redirect to results page (implement based on your routing)
    });

    return () => {
      socket.off('room_state_init');
      socket.off('timer_tick');
      socket.off('submission_result');
      socket.off('leaderboard_update');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('game_ended');
    };
  }, [socket, userId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      clearInterval(timerIntervalRef.current);
      toast.error('Time limit reached!');
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [timeRemaining]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // ─── HANDLERS ────────────────────────────────────────────────────────────

  const handleCodeSubmit = async () => {
    if (!code.trim()) {
      toast.error('Code cannot be empty');
      return;
    }

    if (timeRemaining <= 0) {
      toast.error('Time limit exceeded');
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus(SUBMISSION_STATUS.PENDING);

    try {
      const currentQuestion = questions[currentQuestionIdx];
      const submissionTime = Date.now() - roomStartTimeRef.current;

      // Emit to socket - backend will execute code via Judge0
      socket.emit('code_submit', {
        sourceCode: code,
        language: language,
      }, (response) => {
        // This callback returns the Judge0 result from the server
        if (response.success) {
          if (response.passed) {
            setSubmissionStatus(SUBMISSION_STATUS.ACCEPTED);
            toast.success(`✅ Accepted! +${response.points} points`);
            setSolvedQuestions((prev) => [...new Set([...prev, currentQuestion.questionId])]);
          } else {
            setSubmissionStatus(SUBMISSION_STATUS.WRONG_ANSWER);
            toast.error('❌ Some test cases failed. Try again!');
          }
          
          // Set test results from Judge0
          setTestResults({
            totalTests: response.testResults?.length || 0,
            passed: response.testResults?.filter((r) => r.status === 'Accepted').length || 0,
            failed: response.testResults?.filter((r) => r.status !== 'Accepted').length || 0,
            results: response.testResults || [],
            executionTime: response.testResults?.[0]?.time,
          });
          setShowTestResults(true);
        } else {
          setSubmissionStatus(SUBMISSION_STATUS.ERROR);
          toast.error(response.error || 'Submission failed');
        }
      });

      setLastSubmissionTime(submissionTime);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit code');
      setSubmissionStatus(SUBMISSION_STATUS.ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode('// Write your solution here\n');
    toast.info(`Switched to ${newLang}`);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setCode('// Write your solution here\n');
      setTestResults(null);
      setShowTestResults(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
      setCode('// Write your solution here\n');
      setTestResults(null);
      setShowTestResults(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────

  const timerColor = getTimerColor(timeRemaining, timeLimit * 60 * 1000);

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Top Bar: Timer + Room ID + User */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">DSA Room</p>
          <p className="text-lg font-bold text-white">Code: {roomId.slice(0, 8)}</p>
        </div>
        <div className={`text-center text-4xl font-black font-mono ${timerColor}`}>
          {formatTime(timeRemaining)}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">You</p>
          <p className="text-lg font-bold text-white">{username}</p>
        </div>
      </div>

      {/* Main Layout: 3-Column (Question List | Editor | Details) */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        
        {/* LEFT: PROBLEM LIST */}
        <div className="w-72 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white">
              ◇ PROBLEMS
            </h2>
            <p className="text-xs text-slate-400 mt-1">{questionsList.length} Available</p>
          </div>

          {/* Questions List */}
          <div className="flex-1 overflow-y-auto">
            {questionsLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">Loading problems...</p>
              </div>
            ) : questionsList.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">No problems available</p>
              </div>
            ) : (
              questionsList.map((q) => (
                <button
                  key={q.id}
                  onClick={() => fetchQuestionDetails(q.id, q.title)}
                  className={`w-full text-left px-6 py-4 border-b border-slate-800 transition ${
                    currentQuestionId === q.id
                      ? 'bg-blue-500/20 border-l-4 border-l-blue-500'
                      : 'hover:bg-slate-800/50'
                  } ${solvedQuestions.includes(q.id) ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white flex-1">
                      # {q.title}
                    </h3>
                    {solvedQuestions.includes(q.id) && (
                      <span className="text-green-400 text-xl ml-2">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${getDifficultyColor(
                        q.difficulty
                      )}`}
                    >
                      {q.difficulty}
                    </span>
                    <span className="text-xs text-slate-500">
                      {q.source === 'leetcode' ? 'LC' : 'GFG'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* MIDDLE: CODE EDITOR */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          {/* Editor Header */}
          <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">Code Editor</p>
              {currentQuestion && (
                <p className="text-xs text-slate-500 mt-1">{currentQuestion.title}</p>
              )}
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm font-semibold hover:bg-slate-600 transition"
            >
              {Object.keys(JUDGE0_LANGUAGES).map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Code Editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 font-mono text-sm bg-slate-800 text-slate-100 border-0 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="// Write your solution here..."
            spellCheck="false"
          />

          {/* Submit Button */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
            <button
              onClick={handleCodeSubmit}
              disabled={isSubmitting || timeRemaining <= 0 || !currentQuestion}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 text-white font-bold rounded transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>⚡ Submitting...</>
              ) : (
                <>▶ START ARENA BATTLE</>
              )}
            </button>
          </div>

          {/* Test Results */}
          {showTestResults && testResults && (
            <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm">Test Results</h3>
                <span
                  className={`text-sm font-semibold ${
                    testResults.failed === 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {testResults.passed}/{testResults.totalTests} Passed
                </span>
              </div>
              {testResults.failed > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-sm text-red-300">
                  <p className="font-semibold mb-2">Failed Test Case:</p>
                  <code className="block text-xs">{JSON.stringify(testResults.results[0])}</code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT ASIDE: QUESTION DETAILS */}
        <aside className="w-96 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          {!currentQuestion ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 text-sm">Select a problem to see details</p>
            </div>
          ) : (
            <>
              {/* Problem Header */}
              <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-bold text-white">
                    {currentQuestion.title}
                  </h2>
                  {solvedQuestions.includes(currentQuestionId) && (
                    <span className="text-2xl">✅</span>
                  )}
                </div>
                <span
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded ${getDifficultyColor(
                    currentQuestion.difficulty
                  )}`}
                >
                  {currentQuestion.difficulty}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Tags */}
                {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.tags.slice(0, 5).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {currentQuestion.description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">
                      Description
                    </p>
                    <div
                      className="text-sm text-slate-300 leading-relaxed prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: currentQuestion.description.substring(0, 300) + '...',
                      }}
                    />
                  </div>
                )}

                {/* Examples */}
                {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">
                      Examples
                    </p>
                    <div className="space-y-3">
                      {currentQuestion.examples.slice(0, 2).map((ex, idx) => (
                        <div key={idx} className="bg-slate-800 rounded p-3">
                          <p className="text-xs font-mono text-slate-400 mb-1">
                            Input:{' '}
                            <span className="text-slate-300">{ex.input}</span>
                          </p>
                          <p className="text-xs font-mono text-slate-400">
                            Output:{' '}
                            <span className="text-slate-300">{ex.output}</span>
                          </p>
                          {ex.explanation && (
                            <p className="text-xs text-slate-400 mt-2">
                              {ex.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Cases */}
                {currentQuestion.testCases && currentQuestion.testCases.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">
                      Test Cases ({currentQuestion.testCases.length})
                    </p>
                    <div className="space-y-2">
                      {currentQuestion.testCases.slice(0, 3).map((tc, idx) => (
                        <div key={idx} className="bg-slate-800 rounded p-2 text-xs">
                          <p className="font-mono text-slate-300">
                            Case {idx + 1}: {tc.stdin.replace(/\n/g, ' | ')}
                          </p>
                          <p className="font-mono text-green-400 mt-1">
                            Expected: {tc.expectedOutput}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link */}
                {currentQuestion.url && (
                  <div className="pt-4 border-t border-slate-700">
                    <a
                      href={currentQuestion.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 break-all"
                    >
                      View on {currentQuestion.source === 'leetcode' ? 'LeetCode' : 'GeeksforGeeks'} →
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

      </div>
    </div>
  );
};

export default DSARoomLive;
