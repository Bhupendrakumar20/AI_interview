'use client';

import { useState } from 'react';
import { Filter, Download, Share2, Archive, Eye, ChevronRight, Mic, Code, BookOpen, Trophy, ClipboardList, BarChart3, Target, Sparkles, Award } from 'lucide-react';

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const activityData = [
    { id: 1, type: 'interview', title: 'Completed Google Interview', category: 'Interview', time: '2 hours ago', icon: Mic },
    { id: 2, type: 'question', title: 'Solved: Two Sum Problem', category: 'DSA', time: '4 hours ago', icon: Code },
    { id: 3, type: 'course', title: 'Completed Section 3 of Python Mastery', category: 'Course', time: '1 day ago', icon: BookOpen },
    { id: 4, type: 'certificate', title: 'Earned Professional Interview Certificate', category: 'Certificate', time: '2 days ago', icon: Trophy },
    { id: 5, type: 'application', title: 'Applied to Senior Developer at Microsoft', category: 'Application', time: '3 days ago', icon: ClipboardList },
    { id: 6, type: 'question', title: 'Solved: Merge K Sorted Lists', category: 'DSA', time: '4 days ago', icon: Code },
  ];

  const stats = [
    { label: 'Actions This Week', value: '47', dot: '#34d399', icon: BarChart3 },
    { label: 'Interviews Completed', value: '8', dot: '#4e7fff', icon: Target },
    { label: 'Problems Solved', value: '156', dot: '#a78bfa', icon: Sparkles },
    { label: 'Certificates Earned', value: '3', dot: '#f59e0b', icon: Award },
  ];

  const filteredData = activeFilter === 'all' ? activityData : activityData.filter(item => item.type === activeFilter);

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
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    .animate-slideInUp {
      animation: slideInUp 0.4s ease-out;
    }
    .animate-fadeInScale {
      animation: fadeInScale 0.3s ease-out;
    }
    .activity-item {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .activity-item:hover {
      background: rgba(71, 85, 105, 0.2);
      padding-left: 1rem;
      border-left: 3px solid #60a5fa;
    }
    .activity-actions {
      opacity: 0;
      transform: translateX(10px);
      transition: all 0.3s ease;
    }
    .activity-item:hover .activity-actions {
      opacity: 1;
      transform: translateX(0);
    }
    .stat-card {
      transition: all 0.3s ease;
    }
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <style>{styles}</style>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fadeInScale z-50">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="text-sm text-slate-400 mb-2">My Space › <span className="text-slate-300">My Activity</span></div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Activity</h1>
              <p className="text-slate-400">Track your progress and recent accomplishments</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-700 hover:scale-110 rounded-lg border border-slate-600 text-slate-300 transition-all duration-300" onClick={() => showToast('Filter opened')}>
                <Filter size={18} />
              </button>
              <button className="p-2 hover:bg-slate-700 hover:scale-110 rounded-lg border border-slate-600 text-slate-300 transition-all duration-300" onClick={() => showToast('Downloading activity report')}>
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stat Chips */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className="stat-card flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-600/50 rounded-lg"
              style={{animation: `slideInUp 0.4s ease-out ${idx * 0.1}s both`}}
            >
              <div className="text-xl">
                <stat.icon size={24} className="text-white" />
              </div>
              <div>
                <span className="font-semibold text-white text-lg">{stat.value}</span>
                <span className="text-slate-400 text-sm block">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'interview', 'question', 'course', 'certificate', 'application'].map((filter) => (
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

        {/* Activity Timeline */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-700/20 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-700/50">
            {filteredData.map((activity, idx) => (
              <div 
                key={activity.id} 
                className="p-4 activity-item hover:pl-2 group cursor-pointer"
                onMouseEnter={() => setHoveredId(activity.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{animation: `slideInUp 0.4s ease-out ${idx * 0.05}s both`}}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700/50 to-slate-600/30 flex items-center justify-center text-lg flex-shrink-0 group-hover:from-blue-600/30 group-hover:to-blue-500/20 transition-all duration-300 group-hover:scale-110">
                    <activity.icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{activity.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="px-2 py-1 bg-slate-700/50 rounded group-hover:bg-blue-600/30 group-hover:text-blue-200 transition-all">{activity.category}</span>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                  <div className="activity-actions flex gap-2">
                    <button 
                      onClick={() => showToast(`Viewed ${activity.title}`)}
                      className="p-2 hover:bg-slate-600/40 rounded text-slate-300 hover:text-blue-300 transition-all"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => showToast('Item archived')}
                      className="p-2 hover:bg-slate-600/40 rounded text-slate-300 hover:text-amber-300 transition-all"
                      title="Archive"
                    >
                      <Archive size={16} />
                    </button>
                    <button 
                      onClick={() => showToast('Activity shared!')}
                      className="p-2 hover:bg-slate-600/40 rounded text-slate-300 hover:text-green-300 transition-all"
                      title="Share"
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
    </div>
  );
}
