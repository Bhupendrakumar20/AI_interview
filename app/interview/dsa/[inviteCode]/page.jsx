'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { ArrowLeft, Play, Send, Trophy, Users, Zap, CheckCircle2, XCircle, AlertCircle, Timer, Crown } from 'lucide-react';
import { auth } from '@/firebase/client';
import CodeEditorPanel from '@/components/CodeEditorPanel';

// Robust language code snippet extractor
const getSnippetForLanguage = (codeSnippets, targetLang) => {
  if (!codeSnippets || !targetLang) return '';
  const target = targetLang.toLowerCase();
  
  // Exact match first
  let snippetObj = codeSnippets.find(s => s.lang.toLowerCase() === target);
  if (snippetObj) return snippetObj.code;
  
  if (target === 'cpp' || target === 'c++') {
    return codeSnippets.find(s => {
      const l = s.lang.toLowerCase();
      return l === 'c++' || l === 'cpp' || l.includes('c++') || l.includes('cpp');
    })?.code || '';
  }
  
  if (target === 'python' || target === 'python3') {
    return codeSnippets.find(s => s.lang.toLowerCase().includes('python'))?.code || '';
  }
  
  if (target === 'java') {
    return codeSnippets.find(s => s.lang.toLowerCase() === 'java')?.code || '';
  }
  
  if (target === 'javascript' || target === 'js') {
    return codeSnippets.find(s => s.lang.toLowerCase().includes('javascript') || s.lang.toLowerCase() === 'js')?.code || '';
  }
  
  return codeSnippets.find(s => s.lang.toLowerCase().includes(target))?.code || '';
};

export default function DSALiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const roomCode = params?.inviteCode?.toUpperCase();
  const usernameParam = searchParams.get('username') || 'Anonymous';
  const difficultyParam = searchParams.get('difficulty') || 'Medium';
  const isHostParam = searchParams.get('host') === 'true';

  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState({
    status: 'lobby',
    participants: [],
    question: null,
    questions: [],
    startTime: null,
  });

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [codeMap, setCodeMap] = useState({});
  const [language, setLanguage] = useState('javascript');
  const [timerText, setTimerText] = useState('30:00');
  const [isLowTime, setIsLowTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'passed', 'failed', null
  const [testResults, setTestResults] = useState(null);

  const socketRef = useRef(null);

  const activeQuestion = roomState.questions?.[activeQuestionIndex] || roomState.question;

  // Sync Timer
  useEffect(() => {
    if (roomState.status === 'playing' && roomState.startTime) {
      const interval = setInterval(() => {
        const timePassed = Math.floor((Date.now() - roomState.startTime) / 1000);
        
        const qCount = roomState.questions?.length || 2;
        let limitMinutes = 30;
        if (qCount === 4) limitMinutes = 90;
        else if (qCount === 3) limitMinutes = 60;
        else if (qCount === 2) limitMinutes = 40;
        
        const limitSeconds = limitMinutes * 60;
        const remaining = Math.max(0, limitSeconds - timePassed);
        
        const m = String(Math.floor(remaining / 60)).padStart(2, '0');
        const s = String(remaining % 60).padStart(2, '0');
        setTimerText(`${m}:${s}`);

        if (remaining < 120) {
          setIsLowTime(true);
        }

        if (remaining <= 0) {
          clearInterval(interval);
          toast.info("Time is up!");
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [roomState.status, roomState.startTime, roomState.questions]);

  // Handle language switch to auto-extract snippets if not modified yet
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (roomState.questions && roomState.questions.length > 0) {
      setCodeMap((prev) => {
        const updated = { ...prev };
        roomState.questions.forEach((q) => {
          const snippet = getSnippetForLanguage(q?.codeSnippets, newLang);
          updated[q.id] = snippet;
        });
        return updated;
      });
    } else if (roomState.question) {
      const snippet = getSnippetForLanguage(roomState.question?.codeSnippets, newLang);
      setCodeMap({ [roomState.question.id]: snippet });
    }
  };

  const handleCodeChange = (newCode) => {
    if (activeQuestion) {
      setCodeMap((prev) => ({
        ...prev,
        [activeQuestion.id]: newCode
      }));
    }
  };

  // Connect to Sockets
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4002';
    console.log(`🔌 Connecting to DSA Room socket server: ${socketUrl}`);
    
    const socketIo = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    
    socketRef.current = socketIo;
    setSocket(socketIo);

    socketIo.on('connect', () => {
      console.log('✅ Connected to DSA socket server');
      
      const userId = auth.currentUser?.uid || `usr_${Math.random().toString(36).substring(2, 9)}`;
      
      socketIo.emit('dsa-join-room', {
        roomId: roomCode,
        userId,
        username: usernameParam,
      });
    });

    socketIo.on('dsa-lobby-update', (state) => {
      console.log('👥 Room Lobby Update:', state);
      setRoomState(state);

      if (state.status === 'playing' && state.questions && state.questions.length > 0) {
        setCodeMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          state.questions.forEach((q) => {
            if (updated[q.id] === undefined) {
              const snippet = getSnippetForLanguage(q?.codeSnippets, language);
              updated[q.id] = snippet;
              changed = true;
            }
          });
          return changed ? updated : prev;
        });
      }
    });

    socketIo.on('dsa-game-started', ({ questions, startTime }) => {
      toast.success("The competitive round has started!");
      
      const initialCodeMap = {};
      questions?.forEach((q) => {
        const snippet = getSnippetForLanguage(q?.codeSnippets, language);
        initialCodeMap[q.id] = snippet;
      });

      setCodeMap(initialCodeMap);
      setActiveQuestionIndex(0);
      setRoomState((prev) => ({
        ...prev,
        status: 'playing',
        questions,
        startTime,
      }));
    });

    socketIo.on('dsa-user-solved', ({ username, questionId, timeTaken, participants }) => {
      toast.success(`🎉 ${username} solved a challenge in ${Math.floor(timeTaken / 60000)}m ${Math.floor((timeTaken % 60000) / 1000)}s!`);
      setRoomState((prev) => ({
        ...prev,
        participants,
      }));
    });

    socketIo.on('dsa-room-full', ({ message }) => {
      toast.error(message);
      router.push('/dsa-room');
    });

    socketIo.on('dsa-error', ({ message }) => {
      toast.error(message);
    });

    return () => {
      socketIo.disconnect();
    };
  }, [roomCode, usernameParam, language]);

  // Fetch and Start Game
  const handleStartGame = async () => {
    if (!socketRef.current) return;

    toast.info("Fetching random challenges from database...");

    const questionCountParam = parseInt(searchParams.get('questionCount') || '2');

    try {
      const res = await fetch(`/api/leetcode/random-question?difficulty=${difficultyParam}&count=${questionCountParam}`);
      const data = await res.json();
      
      if (!data.success || !data.questions) {
        throw new Error(data.error || "Could not fetch random challenges.");
      }

      const questions = data.questions;

      // Emit to start game for all users in the room
      socketRef.current.emit('dsa-start-game', {
        roomId: roomCode,
        questions,
      });

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to start game.");
    }
  };

  const [submissionResult, setSubmissionResult] = useState(null);
  const [activeTestCaseTab, setActiveTestCaseTab] = useState(0);

  // Submit and verify code
  const handleSubmit = async () => {
    const activeCode = codeMap[activeQuestion?.id] || '';
    if (!activeCode.trim() || submitting) return;

    setSubmitting(true);
    setSubmitStatus(null);
    setTestResults(null);
    setSubmissionResult(null);

    toast.info("Running your solution against test cases...");

    try {
      const res = await fetch('/api/code-executor/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode: activeCode,
          language,
          questionId: activeQuestion?.titleSlug || activeQuestion?.id || 'daily-challenge',
          roomId: roomCode,
          userId: auth.currentUser?.uid || currentParticipant?.userId || 'usr_guest',
          testCases: activeQuestion?.testCases || [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Submission failed.");
      }

      const allPassed = data.allPassed || false;
      const passedCount = data.passed || 0;
      const totalCases = data.totalTests || 0;

      setSubmitStatus(allPassed ? 'passed' : 'failed');
      setTestResults({
        passed: passedCount,
        total: totalCases,
      });
      setSubmissionResult(data);
      setActiveTestCaseTab(0);

      if (allPassed) {
        toast.success("Accepted! You solved this question!");
      } else {
        toast.error(`Failed: Passed ${passedCount}/${totalCases} test cases.`);
      }

      // Notify server of submit status
      socketRef.current?.emit('dsa-code-submit', {
        roomId: roomCode,
        questionId: activeQuestion?.id,
        isCorrect: allPassed,
        code: activeCode,
        passedCount,
        totalCases,
      });

    } catch (err) {
      toast.error(err.message || "Error running solution.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveRoom = () => {
    router.push('/dsa-room');
  };

  const currentParticipant = roomState.participants.find(p => p.socketId === socket?.id);
  const isHost = currentParticipant?.isHost;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Top bar */}
      <div className="flex align-center justify-between px-6 py-3 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={handleLeaveRoom} className="text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ROOM <b className="text-white">#{roomCode}</b>
          </div>
          {activeQuestion && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
              activeQuestion.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              activeQuestion.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {activeQuestion.difficulty}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xl font-mono font-semibold">
          <Timer className="w-5 h-5 text-slate-400" />
          <span className={isLowTime ? 'text-red-400 animate-pulse' : 'text-slate-200'}>
            {timerText}
          </span>
        </div>

        <div>
          <button onClick={handleLeaveRoom} className="px-4 py-1.5 text-xs font-bold rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 min-h-0">
        
        {/* Left: Problem Statement */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col min-h-0 overflow-y-auto max-h-[85vh]">
          {roomState.status === 'lobby' ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Lobby Members ({roomState.participants.length}/3)</h3>
                <p className="text-xs text-slate-500 max-w-xs">Waiting for players to join the duel. The host can start the game once ready.</p>
              </div>

              <div className="w-full space-y-2 max-w-xs">
                {roomState.participants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-900 text-sm">
                    <span className="font-semibold text-slate-200">{p.username}</span>
                    {p.isHost && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Host</span>}
                  </div>
                ))}
              </div>

              {isHost && (
                <button
                  onClick={handleStartGame}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-lg shadow-lg transition"
                >
                  Start Competitive Match
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {roomState.questions && roomState.questions.length > 0 && (
                <div className="flex gap-2 border-b border-slate-800 pb-3 flex-wrap">
                  {roomState.questions.map((q, idx) => {
                    const isSolved = currentParticipant?.questionStatuses?.[q.id]?.status === 'solved';
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center gap-1.5 ${
                          activeQuestionIndex === idx
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                            : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Q{idx + 1}</span>
                        {isSolved && <span className="text-emerald-500 text-[10px] font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              <h2 className="text-2xl font-black">{activeQuestion?.title}</h2>
              <div className="flex gap-2">
                {activeQuestion?.topicTags?.map((tag, i) => (
                  <span key={i} className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-400">
                    {tag.name}
                  </span>
                ))}
              </div>
              <hr className="border-slate-800" />
              <div 
                className="text-sm leading-relaxed text-slate-300 space-y-4 problem-content"
                dangerouslySetInnerHTML={{ __html: activeQuestion?.content || '' }}
              />
            </div>
          )}
        </div>

        {/* Center: Editor */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col flex-1 min-h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">LANGUAGE</span>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold px-3 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python 3</option>
                  <option value="cpp">C++ 17</option>
                  <option value="java">Java</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || roomState.status !== 'playing'}
                  className="px-5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-lg transition hover:scale-105"
                >
                  {submitting ? 'Verifying...' : 'Submit'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 border border-slate-900 rounded-lg overflow-hidden">
              <CodeEditorPanel
                language={language}
                onLanguageChange={handleLanguageChange}
                onChange={handleCodeChange}
                initialCode={codeMap[activeQuestion?.id] || ''}
                testCases={activeQuestion?.testCases || []}
              />
            </div>
          </div>

          {/* Test Case / Code Execution Results Panel */}
          {submissionResult && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Submission Test Results
                </h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  submissionResult.allPassed 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {submissionResult.allPassed 
                    ? `Accepted (${submissionResult.passed}/${submissionResult.totalTests} passed)` 
                    : `Failed (${submissionResult.passed}/${submissionResult.totalTests} passed)`}
                </span>
              </div>

              {/* Case Tabs */}
              <div className="flex gap-2 border-b border-slate-850 pb-2">
                {submissionResult.results?.map((res, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestCaseTab(index)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 border ${
                      activeTestCaseTab === index
                        ? res.passed
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/15 border-red-500/30 text-red-400'
                        : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span>Case {index + 1}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${res.passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </button>
                ))}
              </div>

              {/* Active Tab Details */}
              {submissionResult.results?.[activeTestCaseTab] && (() => {
                const tc = submissionResult.results[activeTestCaseTab];
                return (
                  <div className="space-y-4 text-sm font-mono">
                    {tc.error ? (
                      <div className="space-y-2 bg-red-500/5 border border-red-500/10 p-4 rounded-lg">
                        <div className="text-red-400 font-bold text-sm uppercase flex items-center gap-1.5">
                          <AlertCircle size={16} /> Runtime Error
                        </div>
                        <pre className="text-xs text-red-300/90 whitespace-pre-wrap leading-relaxed overflow-x-auto bg-slate-950/40 p-3 rounded-md">
                          {tc.error}
                        </pre>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Input</div>
                          <pre className="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto border border-slate-850">
                            {tc.testInput}
                          </pre>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Output</div>
                          <pre className={`p-3 rounded-lg text-xs overflow-x-auto border ${
                            tc.passed 
                              ? 'bg-slate-950 text-emerald-400 border-slate-850' 
                              : 'bg-slate-950 text-red-400 border-red-950/30'
                          }`}>
                            {tc.output || "(no output)"}
                          </pre>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected</div>
                          <pre className="bg-slate-950 p-3 rounded-lg text-xs text-slate-400 overflow-x-auto border border-slate-850">
                            {tc.expectedOutput}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Right/Bottom Section: Players status & scoreboard */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Leaderboard & Live Progress</h3>
            <div className="space-y-4">
              {(() => {
                const getSolvedCount = (p) => {
                  if (!p.questionStatuses) return 0;
                  return Object.values(p.questionStatuses).filter(q => q.status === 'solved').length;
                };

                const getLastSolveTime = (p) => {
                  if (!p.questionStatuses) return Infinity;
                  const solvedQs = Object.values(p.questionStatuses).filter(q => q.status === 'solved');
                  if (solvedQs.length === 0) return Infinity;
                  return Math.max(...solvedQs.map(q => q.timeTaken || 0));
                };

                const formatTime = (ms) => {
                  if (!ms) return '';
                  const mins = Math.floor(ms / 60000);
                  const secs = Math.floor((ms % 60000) / 1000);
                  return `${mins}m ${secs}s`;
                };

                const sortedParticipants = [...(roomState.participants || [])].sort((a, b) => {
                  const solvedA = getSolvedCount(a);
                  const solvedB = getSolvedCount(b);
                  if (solvedB !== solvedA) {
                    return solvedB - solvedA;
                  }
                  const timeA = getLastSolveTime(a);
                  const timeB = getLastSolveTime(b);
                  return timeA - timeB;
                });

                return sortedParticipants.map((p, i) => {
                  const isFirst = i === 0;
                  const solvedCount = getSolvedCount(p);
                  const showCrown = isFirst && solvedCount > 0;
                  const totalQuestions = roomState.questions?.length || 2;
                  const hasWinnerTag = showCrown && solvedCount === totalQuestions;

                  return (
                    <div 
                      key={i} 
                      className={`bg-slate-950 p-4 rounded-xl border space-y-3 relative overflow-hidden transition-all duration-300 ${
                        showCrown 
                          ? 'border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.05)]' 
                          : 'border-slate-900'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isFirst ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            #{i + 1}
                          </span>
                          {p.username} 
                          {p.socketId === socket?.id && <span className="text-[10px] text-emerald-400">(You)</span>}
                          {showCrown && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 inline" title="Current Leader" />}
                          {hasWinnerTag && <span className="text-[9px] bg-amber-500/25 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90">Winner</span>}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          p.status === 'solved' ? 'bg-emerald-500/10 text-emerald-400' :
                          p.status === 'testing' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            p.status === 'solved' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          }`}
                          style={{ width: `${p.progress || 0}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Passed {p.passedCount || 0}/{p.totalCases || 0} Cases</span>
                        <span>Attempts: {p.attempts || 0}</span>
                      </div>

                      {/* Per-question Ticks */}
                      {roomState.questions && roomState.questions.length > 0 && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-900/60">
                          {roomState.questions.map((q, qIdx) => {
                            const qStatus = p.questionStatuses?.[q.id];
                            const isSolved = qStatus?.status === 'solved';
                            return (
                              <div
                                key={qIdx}
                                className={`flex-1 py-1.5 px-2 rounded-lg border text-center text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
                                  isSolved
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : qStatus?.attempts > 0
                                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-500'
                                }`}
                              >
                                <span className="opacity-90">Q{qIdx + 1}</span>
                                <span className="text-[10px] font-bold">
                                  {isSolved 
                                    ? `✓ (${formatTime(qStatus.timeTaken)})` 
                                    : qStatus?.attempts > 0 
                                      ? `${qStatus.passedCount}/${qStatus.totalCases}` 
                                      : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-700 py-4 border-t border-slate-900">
        PrepWise Competitive Coding Duel Engine
      </div>
    </div>
  );
}
