'use client';

import { useState } from 'react';
import { Clock, MapPin, Briefcase, Share2, Trash2, Eye, Bookmark, Search, Code } from 'lucide-react';

export default function SavedInternshipsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [toast, setToast] = useState(null);

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
      logo: Search
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
      logo: Code
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
      logo: Code
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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShare = (company) => {
    showToast(`Shared "${company}" opportunity!`);
  };

  const handleDelete = (company) => {
    showToast(`Removed "${company}" from saved internships`);
  };

  const styles = `
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
      }
    }

    .animate-slideInUp {
      animation: slideInUp 0.4s ease-out;
    }

    .animate-fadeInScale {
      animation: fadeInScale 0.3s ease-out;
    }

    .card-hover {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
    }

    .card-hover:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .button-group {
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }

    .card-hover:hover .button-group {
      opacity: 1;
      transform: translateY(0);
    }

    .icon-button {
      transition: all 0.2s ease;
    }

    .icon-button:hover {
      transform: scale(1.1) rotate(5deg);
      color: #60a5fa;
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
          <div className="text-sm text-slate-400 mb-2">Quick Access › <span className="text-slate-300">Saved Internships</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">Saved Internships</h1>
          <p className="text-slate-400">Curated internship opportunities</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Saved', value: '4' },
            { label: 'Avg Stipend', value: '$7,750' },
            { label: 'Urgent (< 15 days)', value: '2' },
            { label: 'Avg Duration', value: '3.3 mo' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 animate-slideInUp card-hover" style={{animationDelay: `${idx * 0.1}s`}}>
              <div className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'backend', 'frontend', 'devops', 'react'].map((filter, idx) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition duration-300 hover:scale-105 ${
                activeFilter === filter
                  ? 'bg-gradient-to-r from-blue-600/40 to-blue-500/20 border border-blue-400/60 text-blue-200 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-700/20 border border-slate-600/50 text-slate-400 hover:text-slate-200 hover:border-slate-500'
              }`}
              style={{transition: 'all 0.3s ease'}}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Internships Grid */}
        <div className="grid grid-cols-2 gap-6">
          {filteredInternships.map((internship, idx) => (
            <div 
              key={internship.id} 
              className="relative"
              onMouseEnter={() => setHoveredCard(internship.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{animation: `slideInUp 0.5s ease-out ${idx * 0.1}s both`}}
            >
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-6 card-hover group h-full overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-cyan-500/10 pointer-events-none transition-all duration-500"></div>

                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg font-bold flex-shrink-0 transition-all duration-300 group-hover:bg-blue-600/30 group-hover:scale-110">
                      <internship.logo size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">{internship.role}</h3>
                      <p className="text-sm text-slate-400">{internship.company}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pb-4 border-b border-slate-700/50 group-hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-2 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      <MapPin size={14} />
                      {internship.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      <Briefcase size={14} />
                      {internship.duration} • <span className="font-semibold text-green-400">{internship.stipend}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {internship.tags.map((tag, tagIdx) => (
                      <span 
                        key={tagIdx} 
                        className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded transition-all hover:bg-blue-600/40 hover:text-blue-200 cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full transition-all ${getDeadlineColor(internship.daysLeft)}`}>
                        {internship.daysLeft} days
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{internship.deadline}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="button-group flex gap-2 pt-2">
                    <button 
                      onClick={() => showToast(`Applied to ${internship.company}`)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2 rounded-lg transition-all duration-300 font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/50 transform hover:scale-105"
                    >
                      Apply Now
                    </button>
                    <button 
                      onClick={() => showToast(`Viewing ${internship.company} details`)}
                      className="p-2 bg-slate-700/20 hover:bg-slate-600/40 text-slate-300 hover:text-blue-300 rounded-lg icon-button border border-slate-600/50"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleShare(internship.company)}
                      className="p-2 bg-slate-700/20 hover:bg-slate-600/40 text-slate-300 hover:text-green-300 rounded-lg icon-button border border-slate-600/50"
                      title="Share"
                    >
                      <Share2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(internship.company)}
                      className="p-2 bg-slate-700/20 hover:bg-red-600/30 text-slate-300 hover:text-red-300 rounded-lg icon-button border border-slate-600/50"
                      title="Remove"
                    >
                      <Trash2 size={16} />
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
