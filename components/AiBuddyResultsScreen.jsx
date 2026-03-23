// AI Buddy Interview Results Screen
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const AiBuddyResultsScreen = ({
  sessionId,
  results = {},
  sessionDetails = {},
  onClose,
  onRetry,
}) => {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        // Simulate fetching detailed feedback
        const generatedFeedback = {
          clarity: 82,
          technicalAccuracy: 78,
          communication: 85,
          confidence: 80,
          pacing: 84,
          fillerWords: 12,
          overallScore: results.score || 0,
        };
        setFeedback(generatedFeedback);
      } catch (error) {
        console.error('Error fetching results:', error);
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, results]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-200">Calculating your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-6 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">🎉 Interview Complete!</h1>
            <p className="text-slate-400 text-sm mt-2">Here's your detailed performance report</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold transition-all"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Overall Score */}
        <div className="mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Score Card */}
            <div className="bg-linear-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-2xl p-8">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Overall Score</h2>
              <div className="text-center">
                <div className="text-7xl font-black bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  {feedback?.overallScore || 0}%
                </div>
                <p className="text-slate-300 text-lg">
                  {feedback?.overallScore >= 80
                    ? '🌟 Excellent Performance!'
                    : feedback?.overallScore >= 70
                    ? '👍 Good Job!'
                    : feedback?.overallScore >= 60
                    ? '📈 Fair Performance'
                    : '💪 Keep Practicing'}
                </p>

                {/* Questions Summary */}
                <div className="mt-8 pt-8 border-t border-slate-700 space-y-3 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Questions</span>
                    <span className="text-white font-bold">{results.totalQuestions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Questions Answered</span>
                    <span className="text-green-400 font-bold">{results.answeredQuestions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Completion Rate</span>
                    <span className="text-blue-400 font-bold">
                      {results.totalQuestions > 0
                        ? Math.round((results.answeredQuestions / results.totalQuestions) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="space-y-4">
              {/* Clarity */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-sm">Clarity</span>
                  <span className="text-blue-400 font-bold">{feedback?.clarity}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                      className="bg-linear-to-r from-blue-500 to-blue-400 h-2 rounded-full"
                    style={{ width: `${feedback?.clarity}%` }}
                  ></div>
                </div>
              </div>

              {/* Technical Accuracy */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-sm">Technical Accuracy</span>
                  <span className="text-purple-400 font-bold">{feedback?.technicalAccuracy}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                      className="bg-linear-to-r from-purple-500 to-purple-400 h-2 rounded-full"
                    style={{ width: `${feedback?.technicalAccuracy}%` }}
                  ></div>
                </div>
              </div>

              {/* Communication */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-sm">Communication</span>
                  <span className="text-emerald-400 font-bold">{feedback?.communication}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                      className="bg-linear-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                    style={{ width: `${feedback?.communication}%` }}
                  ></div>
                </div>
              </div>

              {/* Confidence */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-sm">Confidence</span>
                  <span className="text-yellow-400 font-bold">{feedback?.confidence}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                      className="bg-linear-to-r from-yellow-500 to-yellow-400 h-2 rounded-full"
                    style={{ width: `${feedback?.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* More Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Pacing */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Pacing</h3>
              <span className="text-2xl font-bold text-orange-400">{feedback?.pacing}%</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              You maintained good speed throughout the interview
            </p>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className="bg-linear-to-r from-orange-500 to-orange-400 h-3 rounded-full"
                style={{ width: `${feedback?.pacing}%` }}
              ></div>
            </div>
          </div>

          {/* Filler Words */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Filler Words</h3>
              <span className="text-2xl font-bold text-red-400">{feedback?.fillerWords}</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              {feedback?.fillerWords < 5
                ? '✅ Excellent control of filler words'
                : feedback?.fillerWords < 15
                ? '👍 Good - could reduce slightly'
                : '📈 Work on reducing filler words'}
            </p>
            <div className="text-xs text-slate-500">Lower is better</div>
          </div>

          {/* Strengths */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Key Strength</h3>
            <div className="text-3xl mb-2">
              {feedback?.clarity >= 85 ? '🎯' : feedback?.communication >= 85 ? '💬' : '🧠'}
            </div>
            <p className="text-sm text-slate-300">
              {feedback?.clarity >= 85
                ? 'Excellent Clarity in explaining concepts'
                : feedback?.communication >= 85
                ? 'Strong Communication Skills'
                : 'Good Technical Knowledge'}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-12">
          <h2 className="text-xl font-bold text-white mb-6">📋 Recommendations for Improvement</h2>
          <div className="space-y-4">
            {feedback?.clarity < 80 && (
              <div className="flex gap-4">
                <div className="text-2xl">💡</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Improve Clarity</h3>
                  <p className="text-slate-400 text-sm">
                    Try to explain your thought process more clearly. Break down complex ideas into simpler steps.
                  </p>
                </div>
              </div>
            )}

            {feedback?.technicalAccuracy < 80 && (
              <div className="flex gap-4">
                <div className="text-2xl">🔧</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Deepen Technical Knowledge</h3>
                  <p className="text-slate-400 text-sm">
                    Review the data structures and algorithms you struggled with. Practice similar problems.
                  </p>
                </div>
              </div>
            )}

            {feedback?.communication < 80 && (
              <div className="flex gap-4">
                <div className="text-2xl">🗣️</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Enhance Communication</h3>
                  <p className="text-slate-400 text-sm">
                    Practice articulating your thoughts more fluently. Record yourself and listen back.
                  </p>
                </div>
              </div>
            )}

            {feedback?.fillerWords > 15 && (
              <div className="flex gap-4">
                <div className="text-2xl">🎙️</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Reduce Filler Words</h3>
                  <p className="text-slate-400 text-sm">
                    Use pause instead of "um", "uh", "like". Practice speaking with comfortable silences.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <div className="text-2xl">⏱️</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Practice More Sessions</h3>
                <p className="text-slate-400 text-sm">
                  Consistency is key. Try to practice at least 2-3 sessions per week for continuous improvement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-12">
          <button
            onClick={onRetry}
            className="px-8 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            🔄 Practice Again
          </button>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiBuddyResultsScreen;
