'use client';

import { useState } from 'react';
import { Calendar, MapPin, Briefcase } from 'lucide-react';

export default function ApplicationsPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const applications = [
    { id: 1, company: 'Google', role: 'Senior Software Engineer', status: 'Interview', appliedDate: '2024-03-15', logo: '🔍' },
    { id: 2, company: 'Microsoft', role: 'Full Stack Developer', status: 'Screening', appliedDate: '2024-03-12', logo: '💻' },
    { id: 3, company: 'Amazon', role: 'Backend Engineer', status: 'Rejected', appliedDate: '2024-03-10', logo: '🚀' },
    { id: 4, company: 'Meta', role: 'Frontend Engineer', status: 'Offer', appliedDate: '2024-03-08', logo: 'f' },
  ];

  const stats = [
    { label: 'Total Applications', value: '24' },
    { label: 'In Progress', value: '8' },
    { label: 'Offers Received', value: '2' },
    { label: 'Success Rate', value: '33%' },
  ];

  const statusColors = {
    'Interview': 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    'Screening': 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
    'Rejected': 'bg-red-600/20 text-red-300 border-red-500/30',
    'Offer': 'bg-green-600/20 text-green-300 border-green-500/30',
  };

  const filteredApps = activeFilter === 'all' ? applications : applications.filter(app => app.status.toLowerCase() === activeFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
            <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'interview', 'screening', 'rejected', 'offer'].map((filter) => (
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

        {/* Applications Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredApps.map((app) => (
            <div key={app.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600/80 transition group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {app.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">{app.role}</h3>
                  <p className="text-sm text-slate-400">{app.company}</p>
                </div>
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[app.status]}`}>
                {app.status}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {app.appliedDate}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
