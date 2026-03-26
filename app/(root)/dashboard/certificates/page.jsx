'use client';

export default function CertificatesPage() {
  const certificates = [
    { id: 1, title: 'Professional Interview Master', issuer: 'InterviewBuddy', date: 'Mar 2024', icon: '🏆', color: 'from-amber-600/20' },
    { id: 2, title: 'DSA Excellence', issuer: 'Coding Academy', date: 'Feb 2024', icon: '🎖️', color: 'from-blue-600/20' },
    { id: 3, title: 'System Design Expert', issuer: 'TechMasters', date: 'Jan 2024', icon: '⭐', color: 'from-purple-600/20' },
    { id: 4, title: 'Full Stack Developer', issuer: 'DevPath', date: 'Dec 2023', icon: '🚀', color: 'from-green-600/20' },
    { id: 5, title: 'AI Interview Ready', issuer: 'InterviewBuddy', date: 'Nov 2023', icon: '🤖', color: 'from-pink-600/20' },
    { id: 6, title: 'Code Quality Master', issuer: 'CodeSchool', date: 'Oct 2023', icon: '✨', color: 'from-cyan-600/20' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">6</div>
            <div className="text-sm text-slate-400 mt-1">Certificates</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">8</div>
            <div className="text-sm text-slate-400 mt-1">Skills Verified</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">100%</div>
            <div className="text-sm text-slate-400 mt-1">Completion</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">2.5y</div>
            <div className="text-sm text-slate-400 mt-1">Valid Until</div>
          </div>
        </div>

        {/* Certificates Grid */}
        <div className="grid grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/80 transition group cursor-pointer">
              <div className={`bg-gradient-to-br ${cert.color} to-slate-800/50 h-32 flex flex-col items-center justify-center relative`}>
                <div className="text-5xl mb-2">{cert.icon}</div>
                <div className="text-xs font-semibold text-slate-300 opacity-70">{cert.issuer}</div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2">{cert.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Earned {cert.date}</span>
                  <button className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition">
                    View
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
