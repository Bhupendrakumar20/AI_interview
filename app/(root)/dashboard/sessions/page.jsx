'use client';

import { useState } from 'react';
import { TrendingUp, Share2, Download, Eye, Play } from 'lucide-react';

export default function SessionsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const sessions = [
    { id: 1, mode: 'AI Mock Interview', date: 'Today at 2 PM', score: 87, accuracy: 92, duration: '45 min', icon: '🤖' },
    { id: 2, mode: 'DSA Practice', date: 'Yesterday', score: 92, accuracy: 98, duration: '60 min', icon: '💻' },
    { id: 3, mode: 'Group Discussion', date: 'Mar 24', score: 78, accuracy: 85, duration: '30 min', icon: '👥' },
    { id: 4, mode: 'AI Mock Interview', date: 'Mar 23', score: 91, accuracy: 95, duration: '50 min', icon: '🤖' },
    { id: 5, mode: 'System Design', date: 'Mar 22', score: 85, accuracy: 88, duration: '90 min', icon: '🏗️' },
    { id: 6, mode: 'DSA Practice', date: 'Mar 21', score: 88, accuracy: 94, duration: '55 min', icon: '💻' },
  ];

  const stats = [
    { label: 'Total Sessions', value: '24', icon: '📊' },
    { label: 'Avg Score', value: '87', icon: '⭐' },
    { label: 'Total Duration', value: '48h', icon: '⏱️' },
    { label: 'Current Streak', value: '7 days', icon: '🔥' },
  ];

  const filteredSessions = activeFilter === 'all' ? sessions : sessions.filter(s => s.mode.toLowerCase().includes(activeFilter));

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const styles = `
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .session-item {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .session-item:hover {
      background: rgba(71, 85, 105, 0.3);
      border-left: 3px solid #60a5fa;
      padding-left: 1rem;
      transform: translateX(4px);
    }
    .session-actions {
      opacity: 0;
      transform: translateX(10px);
      transition: all 0.3s ease;
    }
    .session-item:hover .session-actions {
      opacity: 1;
      transform: translateX(0);
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <style>{styles}</style>

      {toast && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fadeInScale z-50">
          {toast}
        </div>
      )}

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
            <div key={idx} className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 animate-slideInUp" style={{animationDelay: `${idx * 0.1}s`}}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
                <div className="text-2xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'mock', 'dsa', 'discussion', 'design'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${
                activeFilter === filter
                  ? 'bg-gradient-to-r from-blue-600/40 to-blue-500/20 border border-blue-400/60 text-blue-200 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-700/20 border border-slate-600/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.map((session, idx) => (
            <div 
              key={session.id} 
              className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 session-item group relative overflow-hidden"
              style={{animation: `slideInUp 0.5s ease-out ${idx * 0.05}s both`}}
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-cyan-500/10 pointer-events-none transition-all duration-500"></div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600/30">
                  {session.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{session.mode}</h3>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{session.date}</p>
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
                <div className="session-actions flex gap-2">
                  <button 
                    onClick={() => showToast('Playing session')}
                    className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded transition-all"
                  >
                    <Play size={16} />
                  </button>
                  <button 
                    onClick={() => showToast('Session details viewed')}
                    className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-blue-300 rounded transition-all"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    onClick={() => showToast('Downloading session')}
                    className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-green-300 rounded transition-all"
                  >
                    <Download size={16} />
                  </button>
                  <button 
                    onClick={() => showToast('Session shared!')}
                    className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-purple-300 rounded transition-all"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
