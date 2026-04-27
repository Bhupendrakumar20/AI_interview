// AI Buddy Interview Session - Shows Questions and Tracks Answers
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getInterviewQuestions,
  speakQuestion,
  stopSpeech,
} from '@/lib/utils/ai-buddy-questions';
import { createFeedback } from '@/lib/actions/general.action';

const AiBuddyInterviewSession = ({
  sessionId,
  selectedTopics = [],
  difficulty = 'Medium',
  duration = 30,
  onSessionEnd,
  onClose,
}) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // Convert to seconds
  const [sessionStarted, setSessionStarted] = useState(false);

  // Initialize Interview
  useEffect(() => {
    const initializeInterview = async () => {
      try {
        setLoading(true);
        
        // Calculate question count based on duration
        const questionCount = Math.max(3, Math.ceil(duration / 10));
        
        // Get questions from LeetCode API (NOW ASYNC)
        const newQuestions = await getInterviewQuestions(
          selectedTopics,
          difficulty.toLowerCase(),
          questionCount
        );

        console.log('[Interview Buddy] Loaded LeetCode questions:', newQuestions);

        if (newQuestions.length === 0) {
          toast.error('No LeetCode questions found for selected topics');
          onClose?.();
          return;
        }

        setQuestions(newQuestions);
        setSessionStarted(true);
        toast.success('Interview Started with LeetCode Questions! Click the speaker icon to hear the question.');
        
        // Auto-read first question
        setTimeout(() => {
          if (newQuestions[0]) {
            readCurrentQuestion();
          }
        }, 500);
      } catch (error) {
        console.error('[Interview Buddy] Init error:', error);
        toast.error('Failed to initialize interview with LeetCode questions');
        onClose?.();
      } finally {
        setLoading(false);
      }
    };

    initializeInterview();
  }, [selectedTopics, difficulty, duration]);

  // Timer countdown
  useEffect(() => {
    if (!sessionStarted || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStarted, timeRemaining]);

  const readCurrentQuestion = () => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      setIsSpeaking(true);
      
      // Use Web Speech API
      if ('speechSynthesis' in window) {
        stopSpeech();
        
        const text = `Question ${currentQuestionIndex + 1}. ${currentQuestion.title}. ${currentQuestion.description}`;
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = 'en-US';

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => {
          setIsSpeaking(false);
          toast.error('Failed to read question');
        };

        speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        toast.error('Text-to-speech not supported in this browser');
      }
    }
  };

  const handleSessionEnd = async () => {
    setSessionStarted(false);
    stopSpeech();
    
    // Calculate results
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(userAnswers).length;
    
    try {
      // Create transcript for feedback generation
      const transcript = questions.map((q, idx) => ({
        role: 'system',
        content: `Question ${idx + 1}: ${q.title}. ${q.description}`,
        question: q.title,
        answer: userAnswers[idx] || '',
      }));

      // Generate real feedback using AI
      console.log('[Interview Buddy] Generating feedback for interview...');
      const feedbackResult = await createFeedback({
        interviewId: sessionId,
        userId: sessionId, // Use sessionId as userId for buddy interviews
        transcript: transcript,
      });

      if (feedbackResult.success) {
        console.log('[Interview Buddy] Feedback generated successfully:', feedbackResult);
        
        // Pass comprehensive results to parent
        const results = {
          totalQuestions,
          answeredQuestions,
          score: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
          feedback: feedbackResult, // Include actual AI-generated feedback
          transcript: transcript,
          timestamp: new Date().toISOString(),
        };
        
        toast.success('Interview completed! Generating detailed feedback...');
        onSessionEnd?.(results);
      } else {
        console.error('[Interview Buddy] Feedback generation failed:', feedbackResult.error);
        // Still end the session with basic results even if feedback failed
        toast.warning('Interview completed but feedback generation failed. Please try again.');
        const basicResults = {
          totalQuestions,
          answeredQuestions,
          score: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
          feedback: null,
          error: feedbackResult.error,
        };
        onSessionEnd?.(basicResults);
      }
    } catch (error) {
      console.error('[Interview Buddy] Error in handleSessionEnd:', error);
      toast.error('Failed to complete interview: ' + error.message);
      
      // Still call onSessionEnd with basic results
      const basicResults = {
        totalQuestions,
        answeredQuestions,
        score: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
        feedback: null,
        error: error.message,
      };
      onSessionEnd?.(basicResults);
    }
  };

  const handleRecordAnswer = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
    toast.success('Answer recorded');
  };

  const handleNextQuestion = () => {
    stopSpeech();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeout(() => readCurrentQuestion(), 300);
    } else {
      toast.info('No more questions');
    }
  };

  const handleSkipQuestion = () => {
    stopSpeech();
    handleNextQuestion();
    toast.info('Question skipped');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-200">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-slate-200 mb-2">No questions available</p>
          <p className="text-slate-400 text-sm mb-4">Selected topics might not have matching questions</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header with Timer and Progress */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 z-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Interview Session</h1>
            <p className="text-slate-400 text-sm">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>

          {/* Timer */}
          <div className={`text-center ${timeRemaining < 60 ? 'text-red-400' : 'text-blue-400'}`}>
            <div className="text-3xl font-bold font-mono">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-400">Time Remaining</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Question Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-8">
          {/* Difficulty Badge */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              currentQuestion.difficulty === 'Easy' ? 'bg-green-900/30 text-green-300' :
              currentQuestion.difficulty === 'Medium' ? 'bg-yellow-900/30 text-yellow-300' :
              'bg-red-900/30 text-red-300'
            }`}>
              {currentQuestion.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
              {currentQuestion.topic}
            </span>
          </div>

          {/* Question Title */}
          <h2 className="text-3xl font-bold text-white mb-4">
            {currentQuestion.title}
          </h2>

          {/* Read Question Button */}
          <button
            onClick={readCurrentQuestion}
            disabled={isSpeaking}
            className={`mb-6 px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              isSpeaking
                ? 'bg-purple-600/50 text-purple-200 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isSpeaking ? (
              <>
                <span className="inline-block animate-pulse">♪</span>
                Reading...
              </>
            ) : (
              <>
                <span>♪</span>
                Read Question Aloud
              </>
            )}
          </button>

          {/* Question Description */}
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            {currentQuestion.description}
          </p>

          {/* Complexity Info */}
          {currentQuestion.complexity && (
            <div className="bg-slate-800/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-slate-100">Time Complexity:</span> {currentQuestion.complexity.time}
              </p>
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-slate-100">Space Complexity:</span> {currentQuestion.complexity.space}
              </p>
            </div>
          )}
        </div>

        {/* Answer Recording Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-8">
          <h3 className="text-xl font-bold text-white mb-6">Your Answer</h3>

          <div className="space-y-4">
            {/* Recording Indicator */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <span className="text-slate-300">
                  {isRecording ? 'Recording your answer...' : 'Click below to record your answer'}
                </span>
              </div>
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>

            {/* Transcript Area */}
            <textarea
              placeholder="Your answer will appear here if you enable microphone, or you can type your answer..."
              className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
              defaultValue={userAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleRecordAnswer(currentQuestion.id, e.target.value)}
            ></textarea>
          </div>

          {/* Save Answer Button */}
          <button
            onClick={() => handleRecordAnswer(currentQuestion.id, 'answered')}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all"
          >
            ✓ Save Answer
          </button>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between items-center mb-8">
          <button
            onClick={() => {
              stopSpeech();
              if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prev => prev - 1);
                setTimeout(() => readCurrentQuestion(), 300);
              }
            }}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
          >
            ← Previous
          </button>

          <button
            onClick={handleSkipQuestion}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
          >
            Skip Question
          </button>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSessionEnd}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all"
            >
              Finish Interview
            </button>
          )}
        </div>

        {/* Answered Questions Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Session Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{questions.length}</p>
              <p className="text-sm text-slate-400">Total Questions</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{Object.keys(userAnswers).length}</p>
              <p className="text-sm text-slate-400">Questions Answered</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">
                {questions.length > 0 ? Math.round((Object.keys(userAnswers).length / questions.length) * 100) : 0}%
              </p>
              <p className="text-sm text-slate-400">Progress</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiBuddyInterviewSession;
