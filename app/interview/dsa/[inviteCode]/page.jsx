'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { ArrowLeft, Play, Send, Trophy, Users, Zap, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { auth } from '@/firebase/client';
import CodeEditorPanel from '@/components/CodeEditorPanel';

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
    startTime: null,
  });

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [timerText, setTimerText] = useState('30:00');
  const [isLowTime, setIsLowTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'passed', 'failed', null
  const [testResults, setTestResults] = useState(null);

  const socketRef = useRef(null);

  // Sync Timer
  useEffect(() => {
    if (roomState.status === 'playing' && roomState.startTime) {
      const interval = setInterval(() => {
        const timePassed = Math.floor((Date.now() - roomState.startTime) / 1000);
        const limitSeconds = 30 * 60; // 30 mins
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
  }, [roomState.status, roomState.startTime]);

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
    });

    socketIo.on('dsa-game-started', ({ question, startTime }) => {
      toast.success("The competitive round has started!");
      
      // Auto-extract starter code for selected language
      const snippet = question?.codeSnippets?.find(
        (s) => s.lang.toLowerCase().includes(language)
      )?.code || '';

      setCode(snippet);
      setRoomState((prev) => ({
        ...prev,
        status: 'playing',
        question,
        startTime,
      }));
    });

    socketIo.on('dsa-user-solved', ({ username, timeTaken, participants }) => {
      toast.success(`🎉 ${username} solved the problem in ${Math.floor(timeTaken / 60000)}m ${Math.floor((timeTaken % 60000) / 1000)}s!`);
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
  }, [roomCode, usernameParam]);

  // Fetch and Start Game
  const handleStartGame = async () => {
    if (!socketRef.current) return;

    toast.info("Fetching challenge from LeetCode...");

    try {
      // 1. Fetch daily challenge question
      const dailyRes = await fetch('/api/leetcode/daily-question');
      const dailyData = await dailyRes.json();
      
      if (!dailyData.success || !dailyData.question?.titleSlug) {
        throw new Error("Could not fetch daily LeetCode challenge.");
      }

      const slug = dailyData.question.titleSlug;

      // 2. Fetch full details of the challenge
      const query = `
        query questionDetail($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            title
            content
            difficulty
            exampleTestcases
            topicTags {
              name
            }
            codeSnippets {
              lang
              code
            }
          }
        }
      `;

      const detailsRes = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { titleSlug: slug } }),
      });

      const detailsData = await detailsRes.json();
      const question = detailsData.data?.question;

      if (!question) {
        throw new Error("Could not fetch details for LeetCode challenge.");
      }

      const parseTestCasesFromDescription = (htmlContent) => {
        if (!htmlContent) return [];
        const text = htmlContent
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<[^>]*>/g, '');
        
        const cases = [];
        const regex = /Input:\s*([\s\S]*?)\n\s*Output:\s*([\s\S]*?)(?=\n\s*(?:Explanation|Input|Note|Constraints|Example)|$)/gi;
        let match;
        while ((match = regex.exec(text)) !== null) {
          let inputRaw = match[1].trim();
          let outputRaw = match[2].trim();
          
          // Split by variables like: target = 9, roads = ...
          const parts = inputRaw.split(/,\s*\w+\s*=/);
          let stdin = "";
          if (parts.length > 1) {
            const firstPartVal = parts[0].substring(parts[0].indexOf('=') + 1).trim();
            stdin = firstPartVal;
            for (let j = 1; j < parts.length; j++) {
              stdin += "\n" + parts[j].trim();
            }
          } else {
            if (inputRaw.includes('=')) {
              stdin = inputRaw.substring(inputRaw.indexOf('=') + 1).trim();
            } else {
              stdin = inputRaw;
            }
          }
          cases.push({
            stdin,
            expectedOutput: outputRaw
          });
        }
        return cases;
      };

      // Format test cases
      let testCases = parseTestCasesFromDescription(question.content);
      
      // Fallback if HTML parsing found nothing
      if (testCases.length === 0) {
        const testCasesRaw = question.exampleTestcases?.trim().split('\n') || [];
        for (let i = 0; i < testCasesRaw.length; i += 2) {
          if (testCasesRaw[i]) {
            testCases.push({
              stdin: testCasesRaw[i],
              expectedOutput: testCasesRaw[i + 1] || '',
            });
          }
        }
      }
      question.testCases = testCases;

      // Emit to start game for all users in the room
      socketRef.current.emit('dsa-start-game', {
        roomId: roomCode,
        question,
      });

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to start game.");
    }
  };

  // Submit and verify code
  const handleSubmit = async () => {
    if (!code.trim() || submitting) return;

    setSubmitting(true);
    setSubmitStatus(null);
    setTestResults(null);

    toast.info("Running your solution against test cases...");

    try {
      const res = await fetch('/api/code-executor/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode: code,
          language,
          testCases: roomState.question?.testCases || [],
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

      if (allPassed) {
        toast.success("Accepted! You solved the problem!");
      } else {
        toast.error(`Failed: Passed ${passedCount}/${totalCases} test cases.`);
      }

      // Notify server of submit status
      socketRef.current?.emit('dsa-code-submit', {
        roomId: roomCode,
        isCorrect: allPassed,
        code,
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
          {roomState.question && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
              roomState.question.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              roomState.question.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {roomState.question.difficulty}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xl font-mono font-semibold">
          <span className="text-slate-400">⏱</span>
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
              <h2 className="text-2xl font-black">{roomState.question?.title}</h2>
              <div className="flex gap-2">
                {roomState.question?.topicTags?.map((tag, i) => (
                  <span key={i} className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-400">
                    {tag.name}
                  </span>
                ))}
              </div>
              <hr className="border-slate-800" />
              <div 
                className="text-sm leading-relaxed text-slate-300 space-y-4 problem-content"
                dangerouslySetInnerHTML={{ __html: roomState.question?.content || '' }}
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
                  onChange={(e) => setLanguage(e.target.value)}
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
                  {submitting ? 'Verifying...' : 'Submit & Test'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 border border-slate-900 rounded-lg overflow-hidden">
              <CodeEditorPanel
                language={language}
                onLanguageChange={setLanguage}
                onChange={setCode}
                initialCode={code}
                testCases={roomState.question?.testCases || []}
              />
            </div>
          </div>

          {/* Right/Bottom Section: Players status & scoreboard */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Leaderboard & Live Progress</h3>
            <div className="space-y-4">
              {roomState.participants.map((p, i) => (
                <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-200">
                      {p.username} {p.socketId === socket?.id && <span className="text-[10px] text-emerald-400">(You)</span>}
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
                </div>
              ))}
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
