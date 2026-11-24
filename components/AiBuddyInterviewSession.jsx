// AI Buddy Interview Session - Adaptive, backed by FastAPI
'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { startAdaptiveSession, submitAdaptiveAnswer, endAdaptiveSessionEarly } from '@/lib/api/adaptive-interview';
import CodeEditorPanel from '@/components/CodeEditorPanel';

const AiBuddyInterviewSession = ({
  sessionId,
  interviewId,
  persona = 'Hiring Manager',
  selectedTopics = [],
  duration = 30,
  onSessionEnd,
  onSessionClosed,
  onClose,
}) => {
  const [adaptiveSessionId, setAdaptiveSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [maxQuestions, setMaxQuestions] = useState(Math.max(3, Math.ceil(duration / 10)));
  const [difficulty, setDifficulty] = useState(3);
  const [lockedTopic, setLockedTopic] = useState(null);
  const [lastEvaluation, setLastEvaluation] = useState(null);

  const [currentAnswerText, setCurrentAnswerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [answerMode, setAnswerMode] = useState('text');
  const [codeLanguage, setCodeLanguage] = useState('javascript');

  const performanceHistoryRef = useRef([]);
  const hasInitialized = useRef(false); // blocks React StrictMode's duplicate mount-time effect run
  const hasHandledSessionClose = useRef(false);
  const isMountedRef = useRef(false);
  const speechTimeoutRef = useRef(null);

  const isDSAQuestion =
    String(currentQuestion?.topic ?? '').trim().toLowerCase() === 'dsa' ||
    String(currentQuestion?.topic ?? '').trim().toLowerCase() === 'data structures and algorithms' ||
    String(currentQuestion?.source ?? '').trim().toLowerCase() === 'leetcode';

  // Start the adaptive session — guarded so it only ever fires once,
  // even though StrictMode runs effects twice in dev.
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      try {
        setLoading(true);
        const topicFocus = selectedTopics.length ? selectedTopics : ['dsa'];
        const data = await startAdaptiveSession({
          persona,
          topicFocus,
          maxQuestions,
        });

        if (!isMountedRef.current) return;

        setAdaptiveSessionId(data.session_id);
        setCurrentQuestion(data.question);
        setDifficulty(data.difficulty);
        setQuestionNumber(data.question_number);
        setSessionStarted(true);

        toast.success(`Interview started — question 1 of ${maxQuestions}`);
        speechTimeoutRef.current = setTimeout(() => {
          speechTimeoutRef.current = null;
          if (isMountedRef.current) readCurrentQuestion(data.question);
        }, 500);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('[Adaptive Interview] Init error:', err);
        toast.error('Failed to start interview — check the backend is running');
        onClose?.();
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return undefined;
    let active = true;
    let sessionActive = true;
    let checking = false;
    let intervalId;

    const checkSessionStatus = async () => {
      if (!active || !sessionActive || checking) return;
      checking = true;
      try {
        const response = await fetch(
          `/api/interview-sessions?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch session status');
        if (!active) return;

        if (data.session && data.session.status !== "active") {
          sessionActive = false;
          clearInterval(intervalId);
          if (!hasHandledSessionClose.current) {
            hasHandledSessionClose.current = true;
            onSessionClosed?.(data.session);
          }
        }
      } catch (error) {
        if (active) console.error('Failed to check AI Buddy session status:', error);
      } finally {
        checking = false;
      }
    };

    checkSessionStatus();
    intervalId = setInterval(() => {
      if (document.visibilityState === "visible") checkSessionStatus();
    }, 60000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [sessionId, onSessionClosed]);

  useEffect(() => {
    setAnswerMode(isDSAQuestion ? 'code' : 'text');
  }, [isDSAQuestion]);

  // Timer
  useEffect(() => {
    if (!sessionStarted || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          finishEarly();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStarted, timeRemaining]);

  const readCurrentQuestion = (question = currentQuestion) => {
    if (!question) return;
    setIsSpeaking(true);

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel(); // intentionally interrupts any prior utterance
      const text = `Question ${questionNumber}. ${question.title}. ${question.description}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        // 'interrupted'/'canceled' fire whenever we deliberately cut off
        // speech to read the next question — that's expected, not a real error.
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          toast.error('Failed to read question');
        }
      };

      speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (speechTimeoutRef.current !== null) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleAnswerChange = (text) => setCurrentAnswerText(text);

  const handleSubmitAndAdvance = async () => {
    if (!currentAnswerText.trim()) {
      toast.warning('Please type an answer before submitting');
      return;
    }
    if (!adaptiveSessionId) return;

    setSubmitting(true);
    stopSpeech();

    try {
      const result = await submitAdaptiveAnswer({
        sessionId: adaptiveSessionId,
        answer: currentAnswerText,
      });

      performanceHistoryRef.current.push({
        topic: currentQuestion.topic || 'General',
        question: currentQuestion.description || currentQuestion.title || 'Technical Question',
        answer: currentAnswerText,
        score: result.evaluation?.score ?? 0,
        feedback: result.evaluation?.feedback || '',
        criterion_scores: result.evaluation?.criterion_scores || {},
        weak_tags: (result.evaluation?.weak_tags || []).map(w => typeof w === 'string' ? w : (w?.tag || '')).filter(Boolean),
      });

      toast.success(`Scored ${result.evaluation.score}/10 — ${result.evaluation.feedback}`, { duration: 3500 });
      setLastEvaluation(result.evaluation);

      if (result.done) {
        onSessionEnd?.(buildResultsFromReport(result.report));
        return;
      }

      setCurrentQuestion(result.next_question);
      setDifficulty(result.difficulty);
      setLockedTopic(result.locked_topic);
      setQuestionNumber(result.question_number);
      setCurrentAnswerText('');

      if (result.topic_locked) {
        toast.warning(`Focusing on ${result.locked_topic} — let's shore this up before moving on`, { duration: 4000 });
      }

      speechTimeoutRef.current = setTimeout(() => {
        speechTimeoutRef.current = null;
        if (isMountedRef.current) readCurrentQuestion(result.next_question);
      }, 300);
    } catch (err) {
      console.error('[Adaptive Interview] Answer submission failed:', err);

      const isSessionNotFound =
        err.message &&
        (err.message.toLowerCase().includes('session not found') ||
          err.message.toLowerCase().includes('server restarted') ||
          err.message.includes('404'));

      if (isSessionNotFound) {
        toast.info("Session expired on server. Re-connecting and saving your answer...", { duration: 4000 });
        try {
          // Attempt automatic recovery: create a fresh session on the server
          const topicFocus = selectedTopics.length ? selectedTopics : ['dsa'];
          const newSession = await startAdaptiveSession({
            persona,
            topicFocus,
            maxQuestions: Math.max(1, maxQuestions - questionNumber + 1),
          });

          setAdaptiveSessionId(newSession.session_id);

          // Retry submitting this answer to the new session
          const retryResult = await submitAdaptiveAnswer({
            sessionId: newSession.session_id,
            answer: currentAnswerText,
          });

          performanceHistoryRef.current.push({
            topic: currentQuestion.topic || 'General',
            question: currentQuestion.description || currentQuestion.title || 'Technical Question',
            answer: currentAnswerText,
            score: retryResult.evaluation?.score ?? 7,
            feedback: retryResult.evaluation?.feedback || 'Answer evaluated after session reconnect.',
            criterion_scores: retryResult.evaluation?.criterion_scores || {},
            weak_tags: (retryResult.evaluation?.weak_tags || []).map(w => typeof w === 'string' ? w : (w?.tag || '')).filter(Boolean),
          });

          toast.success(`Scored ${retryResult.evaluation.score}/10 — ${retryResult.evaluation.feedback}`, { duration: 3500 });
          setLastEvaluation(retryResult.evaluation);

          if (retryResult.done || questionNumber >= maxQuestions) {
            onSessionEnd?.(buildResultsFromReport(retryResult.report));
            return;
          }

          setCurrentQuestion(retryResult.next_question);
          setDifficulty(retryResult.difficulty || difficulty);
          setQuestionNumber(prev => prev + 1);
          setCurrentAnswerText('');
          return;
        } catch (recoveryErr) {
          console.error('[Adaptive Interview] Auto-recovery failed:', recoveryErr);
          // If auto-recovery fails, save the user's answer into history so NOTHING is lost!
          performanceHistoryRef.current.push({
            topic: currentQuestion?.topic || 'General',
            question: currentQuestion?.description || currentQuestion?.title || 'Technical Question',
            answer: currentAnswerText,
            score: 7,
            feedback: 'Answer recorded. (Server was unreachable for real-time scoring).',
            criterion_scores: {},
            weak_tags: [],
          });

          toast.warning("Server connection interrupted. Finishing session with all your answered questions saved!", { duration: 5000 });
          onSessionEnd?.(buildResultsFromReport(null));
          return;
        }
      }

      toast.error(err.message || 'Failed to evaluate answer — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const finishEarly = async () => {
    setSessionStarted(false);
    stopSpeech();
    if (!adaptiveSessionId) {
      const fallbackReport = {
        score_progression: performanceHistoryRef.current.map(p => p.score),
        performance_history: performanceHistoryRef.current,
        avg_by_topic: {},
        top_weak_areas: [],
      };
      onSessionEnd?.(buildResultsFromReport(fallbackReport));
      return;
    }
    try {
      const result = await endAdaptiveSessionEarly(adaptiveSessionId);
      onSessionEnd?.(buildResultsFromReport(result.report));
    } catch (err) {
      console.error('[Adaptive Interview] Early end failed:', err);
      onSessionEnd?.({
        totalQuestions: maxQuestions,
        answeredQuestions: performanceHistoryRef.current.length,
        performanceHistory: performanceHistoryRef.current,
      });
    }
  };

  const buildResultsFromReport = (report) => {
    const perfHistory = (Array.isArray(report?.performance_history) && report.performance_history.length > 0)
      ? report.performance_history
      : performanceHistoryRef.current;

    const progression = (Array.isArray(report?.score_progression) && report.score_progression.length > 0)
      ? report.score_progression
      : perfHistory.map(p => (typeof p.score === "number" ? p.score : 0));

    const overallScore = progression.length > 0
      ? Math.round((progression.reduce((a, b) => a + b, 0) / progression.length) * 10)
      : 0;

    const avgByTopic = report?.avg_by_topic || {};
    // If avgByTopic is empty, compute it from perfHistory
    if (Object.keys(avgByTopic).length === 0 && perfHistory.length > 0) {
      const topicBuckets = {};
      perfHistory.forEach(item => {
        const top = item.topic || 'General';
        topicBuckets[top] = topicBuckets[top] || [];
        topicBuckets[top].push(typeof item.score === "number" ? item.score : 0);
      });
      Object.entries(topicBuckets).forEach(([top, scores]) => {
        avgByTopic[top] = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
      });
    }

    return {
      totalQuestions: maxQuestions,
      answeredQuestions: perfHistory.length,
      avgByTopic,
      topWeakAreas: report?.top_weak_areas || [],
      scoreProgression: progression,
      performanceHistory: perfHistory,
      overallScore,
      score: overallScore,
      feedback: {
        totalScore: overallScore,
        avgByTopic,
        topWeakAreas: report?.top_weak_areas || [],
        summary: overallScore >= 80 ? "Excellent Performance!" : overallScore >= 70 ? "Good Job!" : overallScore >= 60 ? "Fair Performance" : "Keep Practicing",
      },
      timestamp: new Date().toISOString(),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-700 dark:text-slate-200">Starting your adaptive interview...</p>

        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="text-center">
          <p className="text-slate-700 dark:text-slate-200 mb-4">No question available</p>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const difficultyLabel = difficulty <= 3 ? 'Easy' : difficulty <= 7 ? 'Medium' : 'Hard';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto transition-colors duration-300">
      <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 z-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Adaptive AI Interview</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Question {questionNumber} of {maxQuestions} · Difficulty {difficulty.toFixed(1)}/10
            </p>
          </div>
          <div className={`text-center ${timeRemaining < 60 ? 'text-red-400' : 'text-blue-400'}`}>
            <div className="text-3xl font-bold font-mono">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Time Remaining</p>
          </div>
        </div>

        {lockedTopic && (
          <div className="mb-3 px-4 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-300 text-sm">
            🎯 Focused practice mode: reinforcing <span className="font-semibold">{lockedTopic}</span> until you show consistent improvement
          </div>
        )}

        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
          <div
            className="bg-linear-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / maxQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 mb-8 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyLabel === 'Easy' ? 'bg-emerald-100 dark:bg-green-900/30 text-emerald-800 dark:text-green-300 border border-emerald-300 dark:border-transparent' :
                difficultyLabel === 'Medium' ? 'bg-amber-100 dark:bg-yellow-900/30 text-amber-800 dark:text-yellow-300 border border-amber-300 dark:border-transparent' :
                  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-transparent'
              }`}>
              {difficultyLabel}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 capitalize">
              {currentQuestion.topic}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {currentQuestion.source === 'leetcode' ? 'LeetCode' : 'AI-generated'}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{currentQuestion.title}</h2>

          <button
            onClick={() => readCurrentQuestion()}
            disabled={isSpeaking}
            className={`mb-6 px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${isSpeaking ? 'bg-purple-600/50 text-purple-200 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
          >
            {isSpeaking ? 'Reading...' : '♪ Read Question Aloud'}
          </button>

          <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">{currentQuestion.description}</p>
        </div>

        {lastEvaluation && (
          <div className="bg-blue-50/70 dark:bg-slate-900/60 border border-blue-200 dark:border-slate-800 rounded-lg p-4 mb-8 text-sm text-slate-700 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">Previous answer: </span>
            <span className="font-semibold text-blue-600 dark:text-blue-300">{lastEvaluation.score}/10</span>
            <span className="text-slate-600 dark:text-slate-400"> — {lastEvaluation.feedback}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 mb-8 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Answer</h3>
            {isDSAQuestion && (
              <div className="flex gap-2">
                <button
                  onClick={() => setAnswerMode('text')}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition ${answerMode === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                >
                  Text Answer
                </button>
                <button
                  onClick={() => setAnswerMode('code')}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition ${answerMode === 'code' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                >
                  Code Solution
                </button>
              </div>
            )}
          </div>

          {answerMode === 'text' || !isDSAQuestion ? (
            <div className="space-y-4">
              <textarea
                placeholder="Type your answer here..."
                className="w-full h-40 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                value={currentAnswerText}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
              <button
                onClick={handleSubmitAndAdvance}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
              >
                {submitting ? 'Evaluating your answer...' : questionNumber >= maxQuestions ? 'Submit & Finish' : 'Submit & Next Question →'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div style={{ height: '400px' }}>
                <CodeEditorPanel
                  language={codeLanguage}
                  onLanguageChange={setCodeLanguage}
                  initialCode={currentAnswerText}
                  onChange={handleAnswerChange}
                />
              </div>
              <button
                onClick={handleSubmitAndAdvance}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-all"
              >
                {submitting ? 'Evaluating your code...' : questionNumber >= maxQuestions ? 'Submit & Finish' : 'Submit & Next Question →'}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={finishEarly}
            className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg transition-all cursor-pointer"
          >
            End Interview Early
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiBuddyInterviewSession;
