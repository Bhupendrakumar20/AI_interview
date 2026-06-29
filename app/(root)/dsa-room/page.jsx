'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Code, Users } from 'lucide-react';

export default function DSARoomPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -z-10"></div>

      {/* Header */}
      <div className="max-w-7xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto text-center my-auto flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/10 animate-pulse">
          <Trophy size={40} className="text-emerald-400" />
        </div>

        <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full mb-4">
          Development in Progress
        </span>

        <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight bg-linear-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
          DSA Room Mode
        </h1>

        <p className="text-slate-300 text-lg mb-8 max-w-md">
          We are rebuilding the real-time multiplayer coding room experience with a new and highly optimized system. This feature will be back online soon!
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left mb-8">
          <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-emerald-400 mb-2">
              <Code size={20} />
            </div>
            <h3 className="font-bold text-white mb-1">Shared Coding Sessions</h3>
            <p className="text-xs text-slate-400">Solve LeetCode-style DSA challenges collaboratively or competitively in the same interface.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-emerald-400 mb-2">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-white mb-1">Multiplayer Lobbies</h3>
            <p className="text-xs text-slate-400">Invite up to 10 peers to join your room, view live scoreboards, and compare code structures.</p>
          </div>
        </div>

        <Link
          href="/interview/buddy"
          className="px-6 py-3 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition hover:scale-105"
        >
          Try AI Interview Buddy
        </Link>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500">
        PrepWise · Shaping the future of technical interview prep
      </div>
    </div>
  );
}
