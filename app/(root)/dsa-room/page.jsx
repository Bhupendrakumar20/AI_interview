'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, Code, Users, Zap } from 'lucide-react';
import { auth } from '@/firebase/client';
import { toast } from 'sonner';

export default function DSARoomPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(2);

  useEffect(() => {
    // Prefill username if logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUsername(user.displayName || user.email?.split('@')[0] || `user_${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        setUsername(`guest_${Math.floor(1000 + Math.random() * 9000)}`);
      }
    });
    return unsubscribe;
  }, []);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      toast.error('Please enter a display name.');
      return;
    }

    // Generate unique 6 character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    router.push(`/interview/dsa/${code}?username=${encodeURIComponent(username.trim())}&difficulty=${difficulty}&questionCount=${questionCount}&host=true`);
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      toast.error('Please enter a display name.');
      return;
    }
    if (!roomCode.trim()) {
      toast.error('Please enter a room code.');
      return;
    }

    const cleanCode = roomCode.trim().toUpperCase();
    router.push(`/interview/dsa/${cleanCode}?username=${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-6 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -z-10"></div>

      {/* Header */}
      <div className="max-w-7xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto my-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Side: Info */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <Zap size={14} className="animate-pulse" /> LIVE DUEL MODE
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Prove Your <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">DSA Skills</span> in Real-Time
          </h1>
          
          <p className="text-slate-400 text-lg leading-relaxed">
            Create or join a competitive room with up to 3 peers. Solve the same LeetCode challenge simultaneously and climb the live leaderboard.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-start">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400">
                <Code size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-200">Real LeetCode Problems</h4>
                <p className="text-sm text-slate-400">Fetched live from LeetCode with full constraints and examples.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400">
                <Users size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-200">3-Player Hard Limit</h4>
                <p className="text-sm text-slate-400">Perfect size for quick coding duels and focused peer interview practice.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Join/Create Cards */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl space-y-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white tracking-tight">Enter Lobby</h2>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Display Name</label>
            <input
              type="text"
              placeholder="e.g. Codestar"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition animate-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <hr className="border-slate-800/80" />

          {/* Create Room */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Difficulty</label>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition ${
                      difficulty === diff
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-transparent text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">No. of Questions</label>
              <div className="flex gap-2">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuestionCount(num)}
                    className={`px-3.5 py-1 rounded text-xs font-semibold border transition ${
                      questionCount === num
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-transparent text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {num} Qs
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02]"
            >
              Create Room
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 font-bold justify-center">
            <span className="h-[1px] bg-slate-800 flex-1"></span>
            <span>OR JOIN EXISTING</span>
            <span className="h-[1px] bg-slate-800 flex-1"></span>
          </div>

          {/* Join Room */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter 6-char Room Code (e.g. 7F3A9K)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition text-center uppercase tracking-widest font-mono"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button
              onClick={handleJoinRoom}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-600">
        PrepWise · Competitive Multiplayer Coding Simulator
      </div>
    </div>
  );
}
