// AI Buddy Interview Results Screen - reads the adaptive session report directly
'use client';

import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

const AiBuddyResultsScreen = ({ results = {}, onClose, onRetry }) => {
  const {
    overallScore = 0,
    totalQuestions = 0,
    answeredQuestions = 0,
    avgByTopic = {},
    topWeakAreas = [],
    scoreProgression = [],
    performanceHistory = [],
  } = results;

  const performanceLabel =
    overallScore >= 80 ? 'Excellent Performance!' :
    overallScore >= 70 ? 'Good Job!' :
    overallScore >= 60 ? 'Fair Performance' : 'Keep Practicing';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-6 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Interview Complete</h1>
            <p className="text-slate-400 text-sm mt-2">Adaptive session report — per-question scoring, not a single holistic grade</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Overall score */}
          <div className="bg-linear-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-2xl p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Overall Score</h2>
            <div className="text-center">
              <div className="text-7xl font-black bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                {overallScore}%
              </div>
              <p className="text-slate-300 text-lg">{performanceLabel}</p>

              <div className="mt-8 pt-8 border-t border-slate-700 space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Questions Answered</span>
                  <span className="text-white font-bold">{answeredQuestions} / {totalQuestions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Per-topic averages */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Score by Topic</h2>
            {Object.entries(avgByTopic).map(([topic, avg]) => (
              <div key={topic} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-sm capitalize">{topic}</span>
                  <span className="text-blue-400 font-bold">{avg}/10</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-linear-to-r from-blue-500 to-blue-400 h-2 rounded-full" style={{ width: `${(avg / 10) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

       {scoreProgression.length > 0 && (
  <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-12">
    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
      <TrendingUp className="w-5 h-5 text-blue-400" /> Score Progression
    </h2>
    <div className="flex items-end gap-2" style={{ height: '128px' }}>
      {scoreProgression.map((score, idx) => {
        const safeScore = Number.isFinite(score) ? score : 0;
        const barHeightPx = Math.max(4, (safeScore / 10) * 128); // 128px = container height
        return (
          <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: '128px' }}>
            <div
              className="w-full bg-linear-to-t from-blue-600 to-blue-400 rounded-t"
              style={{ height: `${barHeightPx}px` }}
            ></div>
            <span className="text-xs text-slate-500 absolute mt-1">Q{idx + 1}</span>
          </div>
        );
      })}
    </div>
    <div className="flex gap-2 mt-1">
      {scoreProgression.map((_, idx) => (
        <div key={idx} className="flex-1 text-center">
          <span className="text-xs text-slate-500">Q{idx + 1}</span>
        </div>
      ))}
    </div>
  </div>
)}
        {/* Top weak areas */}
        {topWeakAreas.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-12">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" /> Areas to Focus On
            </h2>
            <div className="space-y-3">
              {topWeakAreas.map(([tag, severity], idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-yellow-500 flex justify-between items-center">
                  <span className="font-semibold text-yellow-300 capitalize">{tag}</span>
                  <span className="text-xs text-slate-400">severity {severity.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-question breakdown */}
{performanceHistory.length > 0 && (
  <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-12">
    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
      <Target className="w-5 h-5 text-blue-400" /> Question-by-Question Breakdown
    </h2>
    <div className="space-y-4">
      {performanceHistory.map((item, idx) => (
        <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-blue-300 capitalize">{item.topic}</h3>
            <span className="text-sm font-bold text-slate-300">{item.score}/10</span>
          </div>

          <p className="text-slate-300 text-sm mb-3">{item.question}</p>

          {/* NEW — candidate's actual answer */}
          <div className="bg-slate-900/60 rounded-lg p-3 mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your answer</p>
            <p className="text-slate-400 text-sm italic">
              {item.answer?.trim() ? `"${item.answer}"` : '(No answer provided)'}
            </p>
          </div>

          {item.feedback && (
            <p className="text-xs text-slate-500 mb-2">
              <span className="text-slate-400 font-medium not-italic">Feedback: </span>
              {item.feedback}
            </p>
          )}

          {item.weak_tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {item.weak_tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-300 rounded-full capitalize">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}

        <div className="flex gap-4 justify-center mb-12">
          <button onClick={onRetry} className="px-8 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 text-white font-semibold rounded-lg transition-all">
            Practice Again
          </button>
          <button onClick={onClose} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiBuddyResultsScreen;