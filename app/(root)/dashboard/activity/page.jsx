'use client';

import { useState } from 'react';
import { Filter, Download } from 'lucide-react';

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const activityData = [
    { id: 1, type: 'interview', title: 'Completed Google Interview', category: 'Interview', time: '2 hours ago', icon: '🎤' },
    { id: 2, type: 'question', title: 'Solved: Two Sum Problem', category: 'DSA', time: '4 hours ago', icon: '💻' },
    { id: 3, type: 'course', title: 'Completed Section 3 of Python Mastery', category: 'Course', time: '1 day ago', icon: '📚' },
    { id: 4, type: 'certificate', title: 'Earned Professional Interview Certificate', category: 'Certificate', time: '2 days ago', icon: '🏆' },
    { id: 5, type: 'application', title: 'Applied to Senior Developer at Microsoft', category: 'Application', time: '3 days ago', icon: '📋' },
    { id: 6, type: 'question', title: 'Solved: Merge K Sorted Lists', category: 'DSA', time: '4 days ago', icon: '💻' },
  ];

  const stats = [
    { label: 'Actions This Week', value: '47', dot: '#34d399' },
    { label: 'Interviews Completed', value: '8', dot: '#4e7fff' },
    { label: 'Problems Solved', value: '156', dot: '#a78bfa' },
    { label: 'Certificates Earned', value: '3', dot: '#f59e0b' },
  ];

  const filteredData = activeFilter === 'all' ? activityData : activityData.filter(item => item.type === activeFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
              <button className="p-2 hover:bg-slate-700 rounded-lg border border-slate-600 text-slate-300">
                <Filter size={18} />
              </button>
              <button className="p-2 hover:bg-slate-700 rounded-lg border border-slate-600 text-slate-300">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stat Chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-slate-700/30 border border-slate-600/50 rounded-full">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.dot }}></div>
              <span className="font-semibold text-white">{stat.value}</span>
              <span className="text-slate-400">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'interview', 'question', 'course', 'certificate', 'application'].map((filter) => (
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

        {/* Activity Timeline */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-700">
            {filteredData.map((activity, idx) => (
              <div key={activity.id} className="p-4 hover:bg-slate-700/20 transition group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-xl flex-shrink-0">
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition">{activity.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="px-2 py-1 bg-slate-700/50 rounded">{activity.category}</span>
                      <span>{activity.time}</span>
                    </div>
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
