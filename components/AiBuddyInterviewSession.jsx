// AI Buddy Interview Session - Adaptive, backed by FastAPI
'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { startAdaptiveSession, submitAdaptiveAnswer, endAdaptiveSessionEarly } from '@/lib/api/adaptive-interview';
import CodeEditorPanel from '@/components/CodeEditorPanel';

const AiBuddyInterviewSession = ({
  interviewId,
  persona = 'Hiring Manager',
  selectedTopics = [],
  duration = 30,
  onSessionEnd,
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

        setAdaptiveSessionId(data.session_id);
        setCurrentQuestion(data.question);
        setDifficulty(data.difficulty);
        setQuestionNumber(data.question_number);
        setSessionStarted(true);

        toast.success(`Interview started — question 1 of ${maxQuestions}`);
        setTimeout(() => readCurrentQuestion(data.question), 500);
      } catch (err) {
        console.error('[Adaptive Interview] Init error:', err);
        toast.error('Failed to start interview — check the backend is running');
        onClose?.();
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        topic: currentQuestion.topic,
        question: currentQuestion.description,
        answer: currentAnswerText,
        score: result.evaluation.score,
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

      setTimeout(() => readCurrentQuestion(result.next_question), 300);
    } catch (err) {
      console.error('[Adaptive Interview] Answer submission failed:', err);
      toast.error(err.message || 'Failed to evaluate answer — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const finishEarly = async () => {
    setSessionStarted(false);
    stopSpeech();
    if (!adaptiveSessionId) return;
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
    const scoreProgression = Array.isArray(report.score_progression) ? report.score_progression : [];
    const overallScore = scoreProgression.length > 0
      ? Math.round(
          (scoreProgression.reduce((a, b) => a + b, 0) / scoreProgression.length) * 10
        )
      : 0;

    const rawTopWeakAreas = report.top_weak_areas || [];
    const topWeakAreas = Array.isArray(rawTopWeakAreas)
      ? rawTopWeakAreas
          .map((item) => {
            if (Array.isArray(item) && item.length >= 2) {
              return { area: item[0], severity: Number(item[1]) };
            }
            if (item && typeof item === 'object') {
              return {
                area: item.area ?? item.tag ?? "Unknown area",
                severity: Number(item.severity ?? item[1] ?? 0),
              };
            }
            return { area: String(item ?? "Unknown area"), severity: 0 };
          })
          .filter((item) => item.area && Number.isFinite(item.severity))
      : [];
    
    return {
      totalQuestions: maxQuestions,
      answeredQuestions: report.performance_history?.length || 0,
      avgByTopic: report.avg_by_topic || {},
      topWeakAreas,
      scoreProgression: scoreProgression,
      performanceHistory: report.performance_history || [],
      score: overallScore,
      overallScore: overallScore,
      feedback: {
        totalScore: overallScore,
      },
      timestamp: new Date().toISOString(),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-200">Starting your adaptive interview...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-slate-200 mb-4">No question available</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 z-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Adaptive AI Interview</h1>
            <p className="text-slate-400 text-sm">
              Question {questionNumber} of {maxQuestions} · Difficulty {difficulty.toFixed(1)}/10
            </p>
          </div>
          <div className={`text-center ${timeRemaining < 60 ? 'text-red-400' : 'text-blue-400'}`}>
            <div className="text-3xl font-bold font-mono">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-400">Time Remaining</p>
          </div>
        </div>

        {lockedTopic && (
          <div className="mb-3 px-4 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-300 text-sm">
            🎯 Focused practice mode: reinforcing <span className="font-semibold">{lockedTopic}</span> until you show consistent improvement
          </div>
        )}

        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className="bg-linear-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / maxQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              difficultyLabel === 'Easy' ? 'bg-green-900/30 text-green-300' :
              difficultyLabel === 'Medium' ? 'bg-yellow-900/30 text-yellow-300' :
              'bg-red-900/30 text-red-300'
            }`}>
              {difficultyLabel}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 capitalize">
              {currentQuestion.topic}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-500">
              {currentQuestion.source === 'leetcode' ? 'LeetCode' : 'AI-generated'}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">{currentQuestion.title}</h2>

          <button
            onClick={() => readCurrentQuestion()}
            disabled={isSpeaking}
            className={`mb-6 px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              isSpeaking ? 'bg-purple-600/50 text-purple-200 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isSpeaking ? 'Reading...' : '♪ Read Question Aloud'}
          </button>

          <p className="text-slate-300 text-lg leading-relaxed">{currentQuestion.description}</p>
        </div>

        {lastEvaluation && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mb-8 text-sm">
            <span className="text-slate-400">Previous answer: </span>
            <span className="font-semibold text-blue-300">{lastEvaluation.score}/10</span>
            <span className="text-slate-400"> — {lastEvaluation.feedback}</span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Your Answer</h3>
            {isDSAQuestion && (
              <div className="flex gap-2">
                <button
                  onClick={() => setAnswerMode('text')}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                    answerMode === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Text Answer
                </button>
                <button
                  onClick={() => setAnswerMode('code')}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                    answerMode === 'code' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
                className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
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
                {submitting ? 'Evaluating your code...' : 'Submit & Next Question →'}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={finishEarly}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all"
          >
            End Interview Early
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiBuddyInterviewSession;