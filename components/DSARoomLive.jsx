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
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState(initialQuestions);
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

      // Emit to socket
      socket.emit('code_submit', {
        userId,
        roomId,
        questionId: currentQuestion.questionId,
        code,
        language,
        submittedAt: Date.now(),
        timeFromStart: submissionTime,
      });

      setLastSubmissionTime(submissionTime);

      // Simulate Judge0 response (in real implementation, backend handles this)
      await simulateJudge0Response();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulateJudge0Response = async () => {
    // This would come from the server via Socket.io
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulated response
    setTestResults({
      totalTests: 5,
      passed: 4,
      failed: 1,
      failedTests: [{ input: '[4,1,2,1,2]', expected: '4', actual: '2' }],
    });

    setShowTestResults(true);
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

  const currentQuestion = questions[currentQuestionIdx] || {};
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

      {/* Main Layout: Editor + Leaderboard */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor Section */}
        <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
          {/* Question Info */}
          <div className="bg-slate-900 border-b border-slate-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-white">
                    {currentQuestion.title || 'Loading...'}
                  </h2>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${getDifficultyColor(
                      currentQuestion.difficulty
                    )}`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Question {currentQuestionIdx + 1} of {questions.length}
                </p>
              </div>
              {solvedQuestions.includes(currentQuestion.questionId) && (
                <div className="text-2xl">✅</div>
              )}
            </div>

            {/* Question Description */}
            <div className="bg-slate-800 rounded-lg p-4 mb-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentQuestion.description || ''}
              </p>
            </div>

            {/* Examples */}
            {currentQuestion.examples && currentQuestion.examples.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Examples</p>
                <div className="space-y-2">
                  {currentQuestion.examples.slice(0, 2).map((ex, idx) => (
                    <div key={idx} className="font-mono text-xs text-slate-300">
                      <p>Input: {ex.input}</p>
                      <p>Output: {ex.output}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden bg-slate-900 p-6">
            <div className="flex gap-2 mb-4">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm font-semibold hover:bg-slate-700 transition"
              >
                {Object.keys(JUDGE0_LANGUAGES).map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Code Editor (Fallback: large textarea) */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-[calc(100%-2.5rem)] font-mono text-sm bg-slate-800 text-slate-100 border border-slate-700 rounded p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="// Write your solution here..."
              spellCheck="false"
            />
          </div>

          {/* Test Results */}
          {showTestResults && testResults && (
            <div className="bg-slate-900 border-t border-slate-800 p-6 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Test Results</h3>
                <span className={`text-sm font-semibold ${testResults.failed === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {testResults.passed}/{testResults.totalTests} Passed
                </span>
              </div>
              {testResults.failed > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-sm text-red-300">
                  <p className="font-semibold mb-2">Failed Test Case:</p>
                  <code className="block text-xs">{JSON.stringify(testResults.failedTests[0])}</code>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="bg-slate-900 border-t border-slate-800 p-6 flex gap-3">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIdx === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded transition"
            >
              ← Previous
            </button>

            <button
              onClick={handleCodeSubmit}
              disabled={isSubmitting || timeRemaining <= 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 text-white font-bold rounded transition"
            >
              {isSubmitting ? '⚡ Submitting...' : '✦ Submit Code'}
            </button>

            <button
              onClick={handleNextQuestion}
              disabled={currentQuestionIdx === questions.length - 1}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded transition"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right: Leaderboard */}
        <div className="w-80 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">
          <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white">🏆 Leaderboard</h2>
            <p className="text-xs text-slate-400 mt-1">{leaderboard.length} participants</p>
          </div>

          {/* Leaderboard List */}
          <div className="flex-1 overflow-y-auto">
            {leaderboard.map((participant) => (
              <div
                key={participant.userId}
                className={`px-6 py-4 border-b border-slate-800 ${
                  participant.userId === userId ? 'bg-blue-500/10' : 'hover:bg-slate-800/50'
                } transition`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-400 w-8">#{participant.rank || '?'}</span>
                    <div>
                      <p className="font-semibold text-white text-sm">{participant.username}</p>
                      <p className="text-xs text-slate-500">{participant.questionsCorrect || 0} solved</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-yellow-400">{participant.points || 0}</p>
                    <p className="text-xs text-slate-500">pts</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-1 flex-wrap">
                  {participant.firstBloodQuestions && participant.firstBloodQuestions.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-purple-500/30 text-purple-300 rounded-full">
                      ⚡ First Blood x{participant.firstBloodQuestions.length}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Stats Footer */}
          <div className="bg-slate-800 border-t border-slate-700 p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Your Rank:</span>
                <span className="font-bold text-white">
                  #{leaderboard.find((p) => p.userId === userId)?.rank || '?'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Your Points:</span>
                <span className="font-bold text-yellow-400">
                  {leaderboard.find((p) => p.userId === userId)?.points || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Solved:</span>
                <span className="font-bold text-green-400">{solvedQuestions.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DSARoomLive;
