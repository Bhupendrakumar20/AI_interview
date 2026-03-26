'use client';

export default function RoundsPage() {
  const liveRounds = [
    { id: 1, company: 'Google', round: 'Round 1', type: 'Technical', date: 'Today at 2 PM', icon: '🎯' },
    { id: 2, company: 'Microsoft', round: 'Round 2', type: 'HR', date: 'Tomorrow at 10 AM', icon: '💬' },
  ];

  const completedRounds = [
    { id: 3, company: 'Meta', round: 'Round 1', type: 'Technical', score: '92/100', status: 'pass', date: '3 days ago' },
    { id: 4, company: 'Amazon', round: 'Round 2', type: 'System Design', score: '78/100', status: 'pass', date: '5 days ago' },
    { id: 5, company: 'Apple', round: 'Round 1', type: 'Coding', score: '65/100', status: 'fail', date: '1 week ago' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">2</div>
            <div className="text-sm text-slate-400 mt-1">Live/Upcoming</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">12</div>
            <div className="text-sm text-slate-400 mt-1">Completed</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">85%</div>
            <div className="text-sm text-slate-400 mt-1">Pass Rate</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">87</div>
            <div className="text-sm text-slate-400 mt-1">Avg Score</div>
          </div>
        </div>

        {/* Live/Upcoming */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">🔴 Live / Upcoming</h2>
          <div className="space-y-3">
            {liveRounds.map((round) => (
              <div key={round.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 flex items-center gap-4 hover:border-slate-600/80 transition">
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center text-lg flex-shrink-0">
                  {round.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{round.company}</h3>
                  <p className="text-sm text-slate-400">{round.round} • {round.type}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-300">{round.date}</div>
                  <div className="text-xs text-slate-400">Scheduled</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">📜 Completed Rounds</h2>
          <div className="space-y-3">
            {completedRounds.map((round) => (
              <div key={round.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 flex items-center justify-between hover:border-slate-600/80 transition">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg flex-shrink-0 font-bold">
                    {round.score.split('/')[0][0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{round.company}</h3>
                    <p className="text-sm text-slate-400">{round.round} • {round.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${round.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                    {round.score}
                  </div>
                  <div className={`text-xs font-semibold ${round.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                    {round.status === 'pass' ? '✓ Passed' : '✗ Failed'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{round.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
