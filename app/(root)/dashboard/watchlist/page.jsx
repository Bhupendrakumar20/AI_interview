'use client';

import { useState } from 'react';
import { MapPin, DollarSign, Bookmark, Share2, Heart, ExternalLink } from 'lucide-react';

export default function WatchlistPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const watchlistItems = [
    { id: 1, company: 'Google', role: 'Senior Engineer', salary: '$200k - $250k', location: 'Mountain View', postedDate: '2 days ago' },
    { id: 2, company: 'Microsoft', role: 'Cloud Architect', salary: '$180k - $220k', location: 'Seattle', postedDate: '3 days ago' },
    { id: 3, company: 'Meta', role: 'Full Stack engineer', salary: '$190k - $240k', location: 'Menlo Park', postedDate: '5 days ago' },
    { id: 4, company: 'Amazon', role: 'DevOps Engineer', salary: '$160k - $200k', location: 'Seattle', postedDate: '1 week ago' },
    { id: 5, company: 'Apple', role: 'iOS Developer', salary: '$170k - $210k', location: 'Cupertino', postedDate: '1 week ago' },
    { id: 6, company: 'Netflix', role: 'Backend Engineer', salary: '$200k - $260k', location: 'Los Gatos', postedDate: '1 week ago' },
  ];

  const stats = [
    { label: 'Total Watchlist', value: '24', icon: '👁️' },
    { label: 'High Salary', value: '8', icon: '💰' },
    { label: 'New This Week', value: '4', icon: '✨' },
  ];

  const filteredItems = activeFilter === 'all' ? watchlistItems : watchlistItems.filter(item => item.company.toLowerCase().includes(activeFilter));

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
    .job-card {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .job-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .job-actions {
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    .job-card:hover .job-actions {
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
          <div className="text-sm text-slate-400 mb-2">Quick Access › <span className="text-slate-300">Watchlist</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">Watchlist</h1>
          <p className="text-slate-400">Job opportunities you're interested in</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex-1 bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 animate-slideInUp" style={{animationDelay: `${idx * 0.1}s`}}>
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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'google', 'microsoft', 'meta', 'amazon'].map((filter) => (
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

        {/* Watchlist Grid */}
        <div className="grid grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <div 
              key={item.id} 
              className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg overflow-hidden job-card group relative"
              style={{animation: `slideInUp 0.5s ease-out ${idx * 0.1}s both`}}
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-cyan-500/10 pointer-events-none transition-all duration-500"></div>

              <div className="relative z-10">
                <div className="h-24 bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center text-3xl font-bold group-hover:from-slate-600/60 group-hover:to-slate-700/60 transition-all">
                  {item.company[0]}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-blue-300 transition-colors">{item.role}</h3>
                  <p className="text-xs text-slate-400 mb-3 group-hover:text-slate-300 transition-colors">{item.company}</p>
                  <div className="space-y-2 mb-3 border-t border-slate-700/50 pt-3">
                    <div className="text-sm font-semibold text-green-400 flex items-center gap-1">
                      <DollarSign size={14} />
                      {item.salary}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={14} />
                      {item.location}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-3">{item.postedDate}</div>
                  <div className="job-actions flex gap-2">
                    <button 
                      onClick={() => showToast('Opening job details')}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/50"
                    >
                      <ExternalLink size={12} className="inline mr-1" /> Apply
                    </button>
                    <button 
                      onClick={() => showToast('Added to favorites!')}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-red-300 rounded transition-all"
                      title="Favorite"
                    >
                      <Heart size={14} />
                    </button>
                    <button 
                      onClick={() => showToast('Job shared!')}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-green-300 rounded transition-all"
                      title="Share"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
