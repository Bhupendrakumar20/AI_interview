'use client';

import { useState } from 'react';

export default function RecentlyViewedPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const recentItems = [
    { id: 1, title: 'Two Sum LeetCode Problem', type: 'Question', date: '2 hours ago', icon: '💻' },
    { id: 2, title: 'Google Interview Guide', type: 'Article', date: '4 hours ago', icon: '📖' },
    { id: 3, title: 'System Design Masterclass', type: 'Course', date: '1 day ago', icon: '📚' },
    { id: 4, title: 'Senior Developer at Microsoft', type: 'Job', date: '2 days ago', icon: '💼' },
    { id: 5, title: 'Behavioral Questions Collection', type: 'Question', date: '3 days ago', icon: '❓' },
    { id: 6, title: 'Operating Systems Tutorial', type: 'Course', date: '4 days ago', icon: '🖥️' },
    { id: 7, title: 'Mock Interview Practice', type: 'Session', date: '5 days ago', icon: '🎤' },
    { id: 8, title: 'Database Design Patterns', type: 'Article', date: '1 week ago', icon: '🗄️' },
  ];

  const filteredItems = activeFilter === 'all' 
    ? recentItems 
    : recentItems.filter(item => item.type.toLowerCase() === activeFilter.toLowerCase());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="text-sm text-slate-400 mb-2">Quick Access › <span className="text-slate-300">Recently Viewed</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">Recently Viewed</h1>
          <p className="text-slate-400">Quick access to items you've recently viewed</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'question', 'article', 'course', 'job', 'session'].map((filter) => (
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

        {/* Recent Items Card */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-700">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-700/20 transition group cursor-pointer flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="px-2 py-1 bg-slate-700/50 rounded">{item.type}</span>
                    <span>{item.date}</span>
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
