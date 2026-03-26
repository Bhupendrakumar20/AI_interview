'use client';

import { useState } from 'react';
import { Download, Share2, ExternalLink, Zap } from 'lucide-react';

export default function CertificatesPage() {
  const [toast, setToast] = useState(null);

  const certificates = [
    { id: 1, title: 'Professional Interview Master', issuer: 'InterviewBuddy', date: 'Mar 2024', icon: '🏆', color: 'from-amber-600/20' },
    { id: 2, title: 'DSA Excellence', issuer: 'Coding Academy', date: 'Feb 2024', icon: '🎖️', color: 'from-blue-600/20' },
    { id: 3, title: 'System Design Expert', issuer: 'TechMasters', date: 'Jan 2024', icon: '⭐', color: 'from-purple-600/20' },
    { id: 4, title: 'Full Stack Developer', issuer: 'DevPath', date: 'Dec 2023', icon: '🚀', color: 'from-green-600/20' },
    { id: 5, title: 'AI Interview Ready', issuer: 'InterviewBuddy', date: 'Nov 2023', icon: '🤖', color: 'from-pink-600/20' },
    { id: 6, title: 'Code Quality Master', issuer: 'CodeSchool', date: 'Oct 2023', icon: '✨', color: 'from-cyan-600/20' },
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
    .cert-card {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .cert-card:hover {
      transform: translateY(-12px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .cert-actions {
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    .cert-card:hover .cert-actions {
      opacity: 1;
      transform: translateY(0);
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
          <div className="text-sm text-slate-400 mb-2">My Space › <span className="text-slate-300">My Certificates</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">My Certificates</h1>
          <p className="text-slate-400">Your professional achievements and credentials</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Certificates', value: '6', icon: '🏆' },
            { label: 'Skills Verified', value: '8', icon: '✅' },
            { label: 'Completion', value: '100%', icon: '🎯' },
            { label: 'Valid Until', value: '2.5y', icon: '⏰' }
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

        {/* Certificates Grid */}
        <div className="grid grid-cols-3 gap-6">
          {certificates.map((cert, idx) => (
            <div 
              key={cert.id} 
              className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg overflow-hidden cert-card group relative"
              style={{animation: `slideInUp 0.5s ease-out ${idx * 0.1}s both`}}
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/0 to-amber-500/0 group-hover:from-yellow-500/10 group-hover:via-yellow-500/5 group-hover:to-amber-500/10 pointer-events-none transition-all duration-500"></div>

              <div className={`bg-gradient-to-br ${cert.color} to-slate-800/50 h-32 flex flex-col items-center justify-center relative group-hover:to-slate-700/60 transition-all`}>
                <div className="text-5xl mb-2 transition-all group-hover:scale-110 group-hover:rotate-12">{cert.icon}</div>
                <div className="text-xs font-semibold text-slate-300 opacity-70 group-hover:opacity-100 transition-opacity">{cert.issuer}</div>
              </div>

              <div className="p-4 relative z-10">
                <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-yellow-300 transition-colors">{cert.title}</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Earned {cert.date}</span>
                  <span className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded">Active</span>
                </div>
                <div className="cert-actions flex gap-2">
                  <button 
                    onClick={() => showToast('Opening certificate')}
                    className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 py-2 rounded text-xs font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/50"
                  >
                    <ExternalLink size={14} className="inline mr-1" /> View
                  </button>
                  <button 
                    onClick={() => showToast('Downloading certificate')}
                    className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-green-300 rounded transition-all"
                  >
                    <Download size={14} />
                  </button>
                  <button 
                    onClick={() => showToast('Certificate shared!')}
                    className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-purple-300 rounded transition-all"
                  >
                    <Share2 size={14} />
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
