'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getDifficultyColor } from '@/lib/utils/dsa-room-utils';

const DSARoomLive = ({
  roomId,
  userId,
  username,
  socket,
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
  const [activeTab, setActiveTab] = useState('problem'); // problem | problems | review
  
  const [leaderboard, setLeaderboard] = useState(initialParticipants);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60 * 1000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solvedQuestions, setSolvedQuestions] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  
  const roomStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // ─── EFFECTS ────────────────────────────────────────────────────────────

  // Fetch questions list on mount
  useEffect(() => {
    if (!socket) return;

    console.log("[DSA Room] Requesting LeetCode question list from socket server...");
    socket.emit('get_question_list', { difficulty: 'Medium' }, (response) => {
      console.log("[DSA Room] Question list response received:", response);
      if (response?.success && response.questions) {
        console.log(`[DSA Room] ✅ Loaded ${response.questions.length} LeetCode questions:`, response.questions.map(q => ({ id: q.id, title: q.title, source: q.source })));
        setQuestionsList(response.questions);
        if (response.questions.length > 0) {
          console.log(`[DSA Room] First question: "${response.questions[0].title}" (${response.questions[0].id})`);
          setCurrentQuestionId(response.questions[0].id);
          fetchQuestionDetails(response.questions[0].id, response.questions[0].titleSlug);
        }
      } else {
        console.error("[DSA Room] Failed to load questions:", response?.error || "Unknown error");
      }
      setQuestionsLoading(false);
    });
  }, [socket]);

  // Fetch question details
  const fetchQuestionDetails = (questionId, titleSlug) => {
    if (!socket) return;

    console.log(`[DSA Room] Fetching LeetCode question details: "${titleSlug}" (ID: ${questionId})...`);
    socket.emit('get_question_details', { questionId, titleSlug }, (response) => {
      console.log("[DSA Room] Question details response received:", response);
      if (response?.success && response.question) {
        console.log(`[DSA Room] ✅ Loaded LeetCode question: "${response.question.title}"`);
        console.log(`[DSA Room] Description length: ${response.question.description?.length || 0} chars`);
        console.log(`[DSA Room] Examples: ${response.question.examples?.length || 0}, Test cases: ${response.question.testCases?.length || 0}`);
        setCurrentQuestion(response.question);
        setCurrentQuestionId(questionId);
        setCode('// Write your solution here\n');
        setActiveTab('problem');
      } else {
        console.error("[DSA Room] Failed to load question details:", response?.error || "Unknown error");
      }
    });
  };

  // Initialize socket listeners
  useEffect(() => {
    if (!socket) return;

    // Handle successful submissions
    socket.on('submission_result', (data) => {
      const { userId: submitterId, questionId, status, points } = data;
      
      if (submitterId === userId) {
        if (status === 'passed') {
          toast.success(`✅ Accepted! +${points} points`);
          setSolvedQuestions((prev) => [...new Set([...prev, questionId])]);
        } else {
          toast.error('❌ Some test cases failed. Try again!');
        }
      }

      // Add live event
      const username = leaderboard.find(p => p.userId === submitterId)?.username || 'Player';
      if (status === 'passed') {
        addLiveEvent(`🔴 ${username} solved this problem!`, 'success');
      }

      // Update leaderboard
      setLeaderboard((prev) =>
        prev.map((p) =>
          p.userId === submitterId ? { ...p, points: data.points } : p
        )
      );
    });

    socket.on('leaderboard_update', (updatedLeaderboard) => {
      setLeaderboard(updatedLeaderboard);
    });

    socket.on('user_joined', (data) => {
      addLiveEvent(`🚀 ${data.username} joined the arena!`, 'info');
      toast.info(`${data.username} joined`);
    });

    socket.on('user_left', (data) => {
      addLiveEvent(`👋 ${data.username} left`, 'warning');
      setLeaderboard((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    return () => {
      socket.off('submission_result');
      socket.off('leaderboard_update');
      socket.off('user_joined');
      socket.off('user_left');
    };
  }, [socket, userId, leaderboard]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      clearInterval(timerIntervalRef.current);
      toast.error('⏰ Time limit reached!');
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

  // ─── HELPERS ────────────────────────────────────────────────────────────

  const addLiveEvent = (message, type = 'info') => {
    const eventId = Date.now();
    setLiveEvents((prev) => [{ id: eventId, message, type }, ...prev].slice(0, 10));
  };

  const handleCodeSubmit = async () => {
    if (!code.trim()) {
      toast.error('Code cannot be empty');
      return;
    }

    if (timeRemaining <= 0) {
      toast.error('Time limit exceeded');
      return;
    }

    if (!currentQuestion) {
      toast.error('Select a problem first');
      return;
    }

    setIsSubmitting(true);

    try {
      socket.emit(
        'code_submit',
        {
          questionId: currentQuestionId,
          sourceCode: code,
          language: language,
        },
        (response) => {
          if (response.success) {
            if (response.passed) {
              toast.success(`✅ All tests passed! +${response.points} points`);
              setSolvedQuestions((prev) => [...new Set([...prev, currentQuestionId])]);
            } else {
              toast.error('❌ Some test cases failed');
            }
          } else {
            toast.error(response.error || 'Submission failed');
          }
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit code');
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode('// Write your solution here\n');
  };

  const getRankedLeaderboard = () => {
    return [...leaderboard].sort((a, b) => (b.points || 0) - (a.points || 0));
  };

  // ─── RENDER ────────────────────────────────────────────────────────────

  const rankedLeaderboard = getRankedLeaderboard();
  const currentUserRank = rankedLeaderboard.findIndex((p) => p.userId === userId) + 1;
  const timerMinutes = Math.floor(timeRemaining / 60000);
  const timerSeconds = Math.floor((timeRemaining % 60000) / 1000);
  const timerColor = timeRemaining > 300000 ? 'text-cyan-400' : timeRemaining > 60000 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* ─── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-cyan-400 font-semibold">DSA COMPETITIVE ARENA</p>
          <p className="text-lg font-mono font-bold text-white">Room: {roomId.slice(0, 8)}</p>
        </div>
        <div className={`text-center font-mono font-black text-5xl ${timerColor} transition-colors duration-300`}>
          {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">YOU</p>
          <p className="text-lg font-bold text-white">{username}</p>
          {currentUserRank > 0 && (
            <p className="text-xs text-cyan-400 font-semibold mt-1">Rank: #{currentUserRank}</p>
          )}
        </div>
      </div>

      {/* ─── MAIN LAYOUT: 3-COLUMN ───────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        
        {/* ═══ LEFT COLUMN: PROBLEM PANEL ═══════════════════════════════ */}
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-800 px-6 py-4 border-b border-cyan-500/20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              ◇ PROBLEM DETAILS
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            {['problem', 'problems', 'review'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === tab
                    ? 'bg-slate-800 text-cyan-400 border-b-cyan-400'
                    : 'text-slate-400 border-b-transparent hover:text-white'
                }`}
              >
                {tab === 'problem' && 'Problem'}
                {tab === 'problems' && 'Problems'}
                {tab === 'review' && 'Review'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Problem Tab */}
            {activeTab === 'problem' && (
              <>
                {!currentQuestion ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <p>Select a problem to view</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Title & Difficulty */}
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-white font-bold text-base pr-2">
                          {currentQuestion.title}
                        </h3>
                        {solvedQuestions.includes(currentQuestionId) && (
                          <span className="text-2xl flex-shrink-0">✅</span>
                        )}
                      </div>
                      <span
                        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getDifficultyColor(
                          currentQuestion.difficulty
                        )}`}
                      >
                        {currentQuestion.difficulty}
                      </span>
                    </div>

                    {/* Tags */}
                    {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Topics</p>
                        <div className="flex flex-wrap gap-2">
                          {currentQuestion.tags.slice(0, 4).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-slate-800 text-cyan-300 px-2 py-1 rounded border border-cyan-500/30"
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
                        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase">Description</p>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {currentQuestion.description.substring(0, 500)}
                          {currentQuestion.description.length > 500 && '...'}
                        </p>
                      </div>
                    )}

                    {/* Examples */}
                    {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase">Examples</p>
                        <div className="space-y-3">
                          {currentQuestion.examples.map((ex, idx) => (
                            <div key={idx} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                              <p className="text-xs text-slate-400 mb-2">
                                <span className="text-cyan-400">Input:</span> <code className="text-slate-300">{ex.input}</code>
                              </p>
                              <p className="text-xs text-slate-400">
                                <span className="text-cyan-400">Output:</span> <code className="text-green-400">{ex.output}</code>
                              </p>
                              {ex.explanation && (
                                <p className="text-xs text-slate-400 mt-2 italic">{ex.explanation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Constraints */}
                    {currentQuestion.constraints && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase">Constraints</p>
                        <ul className="space-y-2 text-sm text-slate-300">
                          {(Array.isArray(currentQuestion.constraints) 
                            ? currentQuestion.constraints 
                            : typeof currentQuestion.constraints === 'string'
                            ? currentQuestion.constraints.split('\n').filter(c => c.trim())
                            : []
                          ).map((constraint, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-cyan-400">•</span>
                              <span>{constraint}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Problems Tab */}
            {activeTab === 'problems' && (
              <div className="space-y-2">
                {questionsLoading ? (
                  <p className="text-slate-400 text-sm text-center py-4">Loading problems...</p>
                ) : questionsList.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No problems available</p>
                ) : (
                  questionsList.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => fetchQuestionDetails(q.id, q.title)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${
                        currentQuestionId === q.id
                          ? 'bg-cyan-500/20 border-cyan-500/50 ring-1 ring-cyan-500/30'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-white truncate pr-2">
                          {q.title}
                        </h4>
                        {solvedQuestions.includes(q.id) && (
                          <span className="text-green-400 text-lg flex-shrink-0">✓</span>
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
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Review Tab */}
            {activeTab === 'review' && (
              <div className="space-y-2">
                {solvedQuestions.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No solved problems yet</p>
                ) : (
                  questionsList
                    .filter((q) => solvedQuestions.includes(q.id))
                    .map((q) => (
                      <div
                        key={q.id}
                        className="bg-slate-800 rounded-lg p-3 border border-green-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">{q.title}</h4>
                          <span className="text-green-400 text-lg">✓</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{q.difficulty}</p>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ MIDDLE COLUMN: CODE EDITOR ═══════════════════════════════ */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          
          {/* Editor Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-800 px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-cyan-400 font-semibold">CODE EDITOR</p>
              {currentQuestion && (
                <p className="text-sm text-slate-300 mt-1">{currentQuestion.title}</p>
              )}
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs font-semibold hover:bg-slate-600 transition"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
            </select>
          </div>

          {/* Code Editor with Line Numbers */}
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers */}
            <div className="bg-slate-800 text-slate-500 text-xs font-mono p-4 pr-2 select-none border-r border-slate-700 overflow-y-auto">
              {code.split('\n').map((_, idx) => (
                <div key={idx} className="text-right pr-3">
                  {idx + 1}
                </div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 font-mono text-sm bg-slate-850 text-slate-100 p-4 focus:outline-none resize-none"
              placeholder="// Write your solution here..."
              spellCheck="false"
              style={{
                backgroundColor: '#0f0d2e',
                color: '#e0e0e0',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}
            />
          </div>

          {/* Submit Button */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
            <button
              onClick={handleCodeSubmit}
              disabled={isSubmitting || timeRemaining <= 0 || !currentQuestion}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>⚡ SUBMITTING...</>
              ) : (
                <>▶ SUBMIT SOLUTION</>
              )}
            </button>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: LEADERBOARD & EVENTS ═══════════════════════ */}
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-800 px-6 py-4 border-b border-cyan-500/20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🏆 LEADERBOARD
            </h2>
            <p className="text-xs text-slate-400 mt-1">{leaderboard.length} competitors</p>
          </div>

          {/* Leaderboard + Events Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab !== 'review' && activeTab !== 'problems'
                  ? 'bg-slate-800 text-cyan-400 border-b-cyan-400'
                  : 'text-slate-400 border-b-transparent hover:text-white'
              }`}
            >
              Rankings
            </button>
            <button
              onClick={() => {
                setActiveTab('events');
              }}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'events'
                  ? 'bg-slate-800 text-cyan-400 border-b-cyan-400'
                  : 'text-slate-400 border-b-transparent hover:text-white'
              }`}
            >
              Events
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {(activeTab === 'leaderboard' || (activeTab !== 'events' && activeTab !== 'problem' && activeTab !== 'problems' && activeTab !== 'review')) && (
              <div className="space-y-3">
                {rankedLeaderboard.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No participants</p>
                ) : (
                  rankedLeaderboard.map((player, idx) => {
                    const isCurrentUser = player.userId === userId;
                    const rank = idx + 1;
                    let rankColor = 'bg-slate-700 text-slate-300';
                    let rankBg = '';

                    if (rank === 1) {
                      rankColor = 'bg-yellow-500/90 text-white';
                      rankBg = 'bg-yellow-500/10 border-yellow-500/30';
                    } else if (rank === 2) {
                      rankColor = 'bg-slate-400 text-slate-900';
                      rankBg = 'bg-slate-400/10 border-slate-400/30';
                    } else if (rank === 3) {
                      rankColor = 'bg-orange-600/90 text-white';
                      rankBg = 'bg-orange-600/10 border-orange-600/30';
                    } else {
                      rankBg = 'bg-slate-800/50 border-slate-700';
                    }

                    return (
                      <div
                        key={player.userId}
                        className={`p-4 rounded-lg border transition-all ${rankBg} ${
                          isCurrentUser ? 'ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-900' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-black w-8 h-8 rounded-full flex items-center justify-center ${rankColor}`}>
                              {rank}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {player.username}
                                {isCurrentUser && <span className="text-cyan-400 text-xs ml-2">(YOU)</span>}
                              </p>
                              {player.solvedAt && (
                                <p className="text-xs text-slate-400">
                                  Solved in {Math.floor((Date.now() - player.solvedAt) / 1000)}s
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-cyan-400">{player.points || 0}</p>
                            <p className="text-xs text-slate-400">pts</p>
                          </div>
                        </div>
                        {player.lastProblemSolved && (
                          <p className="text-xs text-slate-400 ml-11">{player.lastProblemSolved}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-2">
                {liveEvents.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Waiting for events...</p>
                ) : (
                  liveEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg text-xs animate-fade-in ${
                        event.type === 'success'
                          ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                          : event.type === 'info'
                          ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                          : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'
                      }`}
                    >
                      {event.message}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DSARoomLive;
