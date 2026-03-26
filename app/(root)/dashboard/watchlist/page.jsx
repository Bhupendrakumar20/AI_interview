'use client';

import { useState } from 'react';

export default function WatchlistPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const watchlistItems = [
    { id: 1, company: 'Google', role: 'Senior Engineer', salary: '$200k - $250k', location: 'Mountain View', postedDate: '2 days ago' },
    { id: 2, company: 'Microsoft', role: 'Cloud Architect', salary: '$180k - $220k', location: 'Seattle', postedDate: '3 days ago' },
    { id: 3, company: 'Meta', role: 'Full Stack engineer', salary: '$190k - $240k', location: 'Menlo Park', postedDate: '5 days ago' },
    { id: 4, company: 'Amazon', role: 'DevOps Engineer', salary: '$160k - $200k', location: 'Seattle', postedDate: '1 week ago' },
    { id: 5, company: 'Apple', role: 'iOS Developer', salary: '$170k - $210k', location: 'Cupertino', postedDate: '1 week ago' },
    { id: 6, company: 'Netflix', role: 'Backend Engineer', salary: '$200k - $260k', location: 'Los Gatos', postedDate: '1 week ago' },
  ];

  const stats = [
    { label: 'Total Watchlist', value: '24' },
    { label: 'High Salary', value: '8' },
    { label: 'New This Week', value: '4' },
  ];

  const filteredItems = activeFilter === 'all' ? watchlistItems : watchlistItems.filter(item => item.company.toLowerCase().includes(activeFilter));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
        <div className="flex gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'google', 'microsoft', 'meta', 'amazon'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeFilter === filter
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                  : 'bg-slate-700/20 border border-slate-600/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Watchlist Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/80 transition group cursor-pointer">
              <div className="h-24 bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center text-2xl font-bold">
                {item.company[0]}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white text-sm mb-1">{item.role}</h3>
                <p className="text-xs text-slate-400 mb-3">{item.company}</p>
                <div className="space-y-2 mb-3 border-t border-slate-700 pt-3">
                  <div className="text-sm font-semibold text-green-400">{item.salary}</div>
                  <div className="text-xs text-slate-400">{item.location}</div>
                </div>
                <div className="text-xs text-slate-500">{item.postedDate}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
