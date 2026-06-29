'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Video, MessageSquare } from 'lucide-react';

export default function BuddyInvitePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-br from-purple-500/10 to-transparent rounded-full blur-3xl -z-10"></div>

      {/* Header */}
      <div className="max-w-7xl mx-auto w-full">
        <button
          onClick={() => router.push('/interview/buddy')}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Interview Buddy
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto text-center my-auto flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/10 animate-pulse">
          <Users size={40} className="text-blue-400" />
        </div>

        <span className="text-xs font-bold tracking-widest text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full mb-4">
          Development in Progress
        </span>

        <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
          Human Buddy Mode
        </h1>

        <p className="text-slate-300 text-lg mb-8 max-w-md">
          We are upgrading our peer-to-peer connection systems. This feature is currently offline while we integrate a new video and chat solution.
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left mb-8">
          <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-blue-400 mb-2">
              <Video size={20} />
            </div>
            <h3 className="font-bold text-white mb-1">Peer Video Mock Sessions</h3>
            <p className="text-xs text-slate-400">Collaborate with peers in mock interviews with split screen layouts and role assignments.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-blue-400 mb-2">
              <MessageSquare size={20} />
            </div>
            <h3 className="font-bold text-white mb-1">Real-time Signals & Docs</h3>
            <p className="text-xs text-slate-400">Share signal cards and live feedback templates during peer mock interviews.</p>
          </div>
        </div>

        <button
          onClick={() => router.push('/interview/buddy')}
          className="px-6 py-3 rounded-lg bg-linear-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition hover:scale-105 cursor-pointer"
        >
          Go to AI Buddy Mode
        </button>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500">
        PrepWise · Shaping the future of technical interview prep
      </div>
    </div>
  );
}
