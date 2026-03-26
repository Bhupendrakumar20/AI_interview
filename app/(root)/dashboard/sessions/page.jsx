'use client';

import { useState } from 'react';

export default function SessionsPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const sessions = [
    { id: 1, mode: 'AI Mock Interview', date: 'Today at 2 PM', score: 87, accuracy: 92, duration: '45 min', icon: '🤖' },
    { id: 2, mode: 'DSA Practice', date: 'Yesterday', score: 92, accuracy: 98, duration: '60 min', icon: '💻' },
    { id: 3, mode: 'Group Discussion', date: 'Mar 24', score: 78, accuracy: 85, duration: '30 min', icon: '👥' },
    { id: 4, mode: 'AI Mock Interview', date: 'Mar 23', score: 91, accuracy: 95, duration: '50 min', icon: '🤖' },
    { id: 5, mode: 'System Design', date: 'Mar 22', score: 85, accuracy: 88, duration: '90 min', icon: '🏗️' },
    { id: 6, mode: 'DSA Practice', date: 'Mar 21', score: 88, accuracy: 94, duration: '55 min', icon: '💻' },
  ];

  const stats = [
    { label: 'Total Sessions', value: '24' },
    { label: 'Avg Score', value: '87' },
    { label: 'Total Duration', value: '48h' },
    { label: 'Current Streak', value: '7 days' },
  ];

  const filteredSessions = activeFilter === 'all' ? sessions : sessions.filter(s => s.mode.toLowerCase().includes(activeFilter));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="text-sm text-slate-400 mb-2">My Space › <span className="text-slate-300">My Sessions</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">My Sessions</h1>
          <p className="text-slate-400">Review your interview and practice sessions</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'mock', 'dsa', 'discussion', 'design'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeFilter === filter
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                  : 'bg-slate-700/20 border border-slate-600/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div key={session.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600/80 transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center text-xl flex-shrink-0">
                {session.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{session.mode}</h3>
                <p className="text-sm text-slate-400 mt-1">{session.date}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <div className="font-semibold text-white">{session.score}/100</div>
                  <div className="text-xs text-slate-400">Score</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-400">{session.accuracy}%</div>
                  <div className="text-xs text-slate-400">Accuracy</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-300">{session.duration}</div>
                  <div className="text-xs text-slate-400">Duration</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
