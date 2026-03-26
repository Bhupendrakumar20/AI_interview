'use client';

import { useState } from 'react';
import { Calendar, Clock, Zap, CheckCircle, AlertCircle, Edit2, Share2 } from 'lucide-react';

export default function RoundsPage() {
  const [toast, setToast] = useState(null);

  const liveRounds = [
    { id: 1, company: 'Google', round: 'Round 1', type: 'Technical', date: 'Today at 2 PM', icon: '🎯', priority: 'urgent' },
    { id: 2, company: 'Microsoft', round: 'Round 2', type: 'HR', date: 'Tomorrow at 10 AM', icon: '💬', priority: 'high' },
  ];

  const completedRounds = [
    { id: 3, company: 'Meta', round: 'Round 1', type: 'Technical', score: '92/100', status: 'pass', date: '3 days ago' },
    { id: 4, company: 'Amazon', round: 'Round 2', type: 'System Design', score: '78/100', status: 'pass', date: '5 days ago' },
    { id: 5, company: 'Apple', round: 'Round 1', type: 'Coding', score: '65/100', status: 'fail', date: '1 week ago' },
  ];

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
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .animate-slideInUp {
      animation: slideInUp 0.4s ease-out;
    }
    .animate-pulse-ring {
      animation: pulse-ring 2s infinite;
    }
    .round-card {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .round-card:hover {
      transform: translateX(8px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    .urgent-badge {
      animation: pulse-ring 2s infinite;
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
          <div className="text-sm text-slate-400 mb-2">My Space › <span className="text-slate-300">My Rounds</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">My Rounds</h1>
          <p className="text-slate-400">Monitor your interview rounds and scores</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Live/Upcoming', value: '2', icon: '🔴' },
            { label: 'Completed', value: '12', icon: '✅' },
            { label: 'Pass Rate', value: '85%', icon: '🎯' },
            { label: 'Avg Score', value: '87', icon: '⭐' }
          ].map((stat, idx) => (
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

        {/* Live/Upcoming */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Live / Upcoming
          </h2>
          <div className="space-y-3">
            {liveRounds.map((round, idx) => (
              <div 
                key={round.id} 
                className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 round-card group hover:border-red-500/40 relative overflow-hidden"
                style={{animation: `slideInUp 0.5s ease-out ${idx * 0.1}s both`}}
              >
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-orange-500/0 group-hover:from-red-500/5 group-hover:via-red-500/5 group-hover:to-orange-500/5 pointer-events-none transition-all duration-500"></div>

                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 group-hover:bg-red-600/30 group-hover:scale-110">
                    {round.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-red-300 transition-colors">{round.company}</h3>
                    <p className="text-sm text-slate-400">{round.round} • {round.type}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-red-400 flex items-center gap-1">
                      <Zap size={16} />
                      {round.date}
                    </div>
                    <div className="text-xs text-slate-400">Scheduled</div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button 
                      onClick={() => showToast(`Editing ${round.company} round`)}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-amber-300 rounded transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => showToast('Round shared!')}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-blue-300 rounded transition-all"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">📜 Completed Rounds</h2>
          <div className="space-y-3">
            {completedRounds.map((round, idx) => (
              <div 
                key={round.id} 
                className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 round-card group hover:border-slate-600/80 relative overflow-hidden"
                style={{animation: `slideInUp 0.5s ease-out ${(2 + idx) * 0.1}s both`}}
              >
                {/* Glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${round.status === 'pass' ? 'from-green-500/0 via-green-500/0 to-emerald-500/0 group-hover:from-green-500/5' : 'from-red-500/0 via-red-500/0 to-pink-500/0 group-hover:from-red-500/5'} group-hover:via-${round.status === 'pass' ? 'green' : 'red'}-500/5 group-hover:to-${round.status === 'pass' ? 'emerald' : 'pink'}-500/5 pointer-events-none transition-all duration-500`}></div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg flex-shrink-0 font-bold transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-600/50">
                      {round.score.split('/')[0][0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{round.company}</h3>
                      <p className="text-sm text-slate-400">{round.round} • {round.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold flex items-center gap-1 ${round.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                      {round.status === 'pass' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                      {round.score}
                    </div>
                    <div className={`text-xs font-semibold ${round.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                      {round.status === 'pass' ? '✓ Passed' : '✗ Failed'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{round.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
