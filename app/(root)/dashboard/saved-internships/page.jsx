'use client';

import { useState } from 'react';
import { Clock, MapPin, Briefcase } from 'lucide-react';

export default function SavedInternshipsPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const internships = [
    { 
      id: 1, 
      company: 'Google', 
      role: 'Software Engineer Intern', 
      location: 'Mountain View, CA', 
      stipend: '$8000/month', 
      duration: '3 months',
      deadline: 'Mar 20, 2024',
      daysLeft: 5,
      tags: ['Backend', 'Python', 'Competitive'],
      logo: '🔍'
    },
    { 
      id: 2, 
      company: 'Microsoft', 
      role: 'Full Stack Intern', 
      location: 'Seattle, WA', 
      stipend: '$7500/month', 
      duration: '3 months',
      deadline: 'Apr 10, 2024',
      daysLeft: 26,
      tags: ['Frontend', 'React', 'Node.js'],
      logo: '💻'
    },
    { 
      id: 3, 
      company: 'Meta', 
      role: 'Frontend Intern', 
      location: 'Menlo Park, CA', 
      stipend: '$8500/month', 
      duration: '3 months',
      deadline: 'Mar 28, 2024',
      daysLeft: 13,
      tags: ['React', 'UI/UX', 'JavaScript'],
      logo: 'f'
    },
    { 
      id: 4, 
      company: 'Amazon', 
      role: 'DevOps Intern', 
      location: 'Seattle, WA', 
      stipend: '$7000/month', 
      duration: '4 months',
      deadline: 'Apr 5, 2024',
      daysLeft: 21,
      tags: ['AWS', 'Docker', 'Kubernetes'],
      logo: '🚀'
    },
  ];

  const filteredInternships = activeFilter === 'all' ? internships : internships.filter(isp => isp.tags.some(tag => tag.toLowerCase().includes(activeFilter)));

  const getDeadlineColor = (daysLeft) => {
    if (daysLeft < 15) return 'bg-red-600/20 text-red-300';
    if (daysLeft < 30) return 'bg-amber-600/20 text-amber-300';
    return 'bg-green-600/20 text-green-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="text-sm text-slate-400 mb-2">Quick Access › <span className="text-slate-300">Saved Internships</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">Saved Internships</h1>
          <p className="text-slate-400">Curated internship opportunities</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">4</div>
            <div className="text-sm text-slate-400 mt-1">Saved</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">$7,750</div>
            <div className="text-sm text-slate-400 mt-1">Avg Stipend</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">2</div>
            <div className="text-sm text-slate-400 mt-1">Urgent ({"<"} 15 days)</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">3.3</div>
            <div className="text-sm text-slate-400 mt-1">Avg Duration</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'backend', 'frontend', 'devops', 'react'].map((filter) => (
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

        {/* Internships Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredInternships.map((internship) => (
            <div key={internship.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600/80 transition group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {internship.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">{internship.role}</h3>
                  <p className="text-sm text-slate-400">{internship.company}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin size={14} />
                  {internship.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Briefcase size={14} />
                  {internship.duration} • {internship.stipend}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {internship.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getDeadlineColor(internship.daysLeft)}`}>
                    {internship.daysLeft} days left
                  </span>
                </div>
                <span className="text-xs text-slate-500">{internship.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
