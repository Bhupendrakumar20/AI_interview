'use client';

import { useState } from 'react';
import DSARoomLobbyProd from '@/components/DSARoomLobbyProd';

export default function DSARoomPage() {
  const [showRoom, setShowRoom] = useState(false);
  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');

  if (showRoom && userName) {
    return <DSARoomLobbyProd userName={userName} onClose={() => setShowRoom(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-2">⚔ DSA Room</h1>
          <p className="text-lg text-slate-400">
            Real-time multiplayer competitive coding with friends
          </p>
        </div>

        {!showRoom ? (
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-6">🎮</div>
            <h2 className="text-2xl font-bold text-white mb-6">Ready to compete?</h2>

            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-4 focus:outline-none focus:border-blue-500"
            />

            <button
              onClick={() => {
                if (tempName.trim()) {
                  setUserName(tempName);
                  setShowRoom(true);
                }
              }}
              disabled={!tempName.trim()}
              className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Let's Go 🚀
            </button>

            <div className="mt-8 space-y-3 text-sm text-slate-400">
              <p>✅ Create rooms and invite friends</p>
              <p>✅ Vote on game settings (question mode, time limit)</p>
              <p>✅ Real-time code execution with Judge0</p>
              <p>✅ Live leaderboard with first blood bonuses</p>
              <p>✅ Post-match code review dashboard</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
