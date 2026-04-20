'use client';

import { useState } from 'react';
import { Calendar, MapPin, Briefcase, MessageSquare, FileText, Trash2, ExternalLink, Search, Code, Zap, ClipboardList, Clock, Sparkles, Star } from 'lucide-react';

export default function ApplicationsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const applications = [
    { id: 1, company: 'Google', role: 'Senior Software Engineer', status: 'Interview', appliedDate: '2024-03-15', logo: Search },
    { id: 2, company: 'Microsoft', role: 'Full Stack Developer', status: 'Screening', appliedDate: '2024-03-12', logo: Code },
    { id: 3, company: 'Amazon', role: 'Backend Engineer', status: 'Rejected', appliedDate: '2024-03-10', logo: Zap },
    { id: 4, company: 'Meta', role: 'Frontend Engineer', status: 'Offer', appliedDate: '2024-03-08', logo: Code },
  ];

  const stats = [
    { label: 'Total Applications', value: '24', icon: ClipboardList },
    { label: 'In Progress', value: '8', icon: Clock },
    { label: 'Offers Received', value: '2', icon: Sparkles },
    { label: 'Success Rate', value: '33%', icon: Star },
  ];

  const statusColors = {
    'Interview': 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    'Screening': 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
    'Rejected': 'bg-red-600/20 text-red-300 border-red-500/30',
    'Offer': 'bg-green-600/20 text-green-300 border-green-500/30',
  };

  const filteredApps = activeFilter === 'all' ? applications : applications.filter(app => app.status.toLowerCase() === activeFilter);

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
    .card-hover {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .card-hover:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      border-color: rgba(96, 165, 250, 0.5);
    }
    .action-buttons {
      opacity: 0;
      transform: translateX(15px);
      transition: all 0.3s ease;
    }
    .card-hover:hover .action-buttons {
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
          <div className="text-sm text-slate-400 mb-2">My Space › <span className="text-slate-300">My Applications</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">My Applications</h1>
          <p className="text-slate-400">Track your job applications across all companies</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 card-hover" style={{animation: `slideInUp 0.4s ease-out ${idx * 0.1}s both`}}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
                <div className="text-2xl"><stat.icon size={24} className="text-white" /></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'interview', 'screening', 'rejected', 'offer'].map((filter) => (
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

        {/* Applications Grid */}
        <div className="grid grid-cols-2 gap-6">
          {filteredApps.map((app, idx) => (
            <div 
              key={app.id} 
              className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-6 card-hover group relative overflow-hidden"
              style={{animation: `slideInUp 0.5s ease-out ${idx * 0.1}s both`}}
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-cyan-500/10 pointer-events-none transition-all duration-500"></div>

              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700/50 to-slate-600/30 flex items-center justify-center text-lg font-bold flex-shrink-0 transition-all duration-300 group-hover:from-blue-600/30 group-hover:to-blue-500/20 group-hover:scale-110">
                    <app.logo size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">{app.role}</h3>
                    <p className="text-sm text-slate-400">{app.company}</p>
                  </div>
                </div>

                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border transition-all ${statusColors[app.status]}`}>
                  {app.status}
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1 hover:text-blue-300 transition-colors">
                    <Calendar size={14} />
                    {app.appliedDate}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons flex gap-2">
                  <button 
                    onClick={() => showToast(`Viewing ${app.company} application`)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2 rounded-lg transition-all duration-300 font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink size={14} />
                  </button>
                  <button 
                    onClick={() => showToast('Message sent!')}
                    className="p-2 bg-slate-700/20 hover:bg-slate-600/40 text-slate-300 hover:text-green-300 rounded-lg transition-all border border-slate-600/50"
                    title="Message"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button 
                    onClick={() => showToast('Document downloaded')}
                    className="p-2 bg-slate-700/20 hover:bg-slate-600/40 text-slate-300 hover:text-amber-300 rounded-lg transition-all border border-slate-600/50"
                    title="Download"
                  >
                    <FileText size={16} />
                  </button>
                  <button 
                    onClick={() => showToast(`Removed ${app.company} application`)}
                    className="p-2 bg-slate-700/20 hover:bg-red-600/30 text-slate-300 hover:text-red-300 rounded-lg transition-all border border-slate-600/50"
                    title="Delete"
                  >
                    <Trash2 size={16} />
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
