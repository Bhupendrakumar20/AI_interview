'use client';

import { useState } from 'react';
import { Eye, BookmarkPlus, Share2, Trash2, Code, BookOpen, Briefcase, HelpCircle, Monitor, Mic, Database } from 'lucide-react';

export default function RecentlyViewedPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const recentItems = [
    { id: 1, title: 'Two Sum LeetCode Problem', type: 'Question', date: '2 hours ago', icon: Code },
    { id: 2, title: 'Google Interview Guide', type: 'Article', date: '4 hours ago', icon: BookOpen },
    { id: 3, title: 'System Design Masterclass', type: 'Course', date: '1 day ago', icon: BookOpen },
    { id: 4, title: 'Senior Developer at Microsoft', type: 'Job', date: '2 days ago', icon: Briefcase },
    { id: 5, title: 'Behavioral Questions Collection', type: 'Question', date: '3 days ago', icon: HelpCircle },
    { id: 6, title: 'Operating Systems Tutorial', type: 'Course', date: '4 days ago', icon: Monitor },
    { id: 7, title: 'Mock Interview Practice', type: 'Session', date: '5 days ago', icon: Mic },
    { id: 8, title: 'Database Design Patterns', type: 'Article', date: '1 week ago', icon: Database },
  ];

  const filteredItems = activeFilter === 'all' 
    ? recentItems 
    : recentItems.filter(item => item.type.toLowerCase() === activeFilter.toLowerCase());

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
    .item-row {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .item-row:hover {
      background: rgba(71, 85, 105, 0.3);
      padding-left: 1rem;
      border-left: 3px solid #60a5fa;
    }
    .item-actions {
      opacity: 0;
      transform: translateX(10px);
      transition: all 0.3s ease;
    }
    .item-row:hover .item-actions {
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

        {/* Recent Items Card */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-700/20 border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-700/50">
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id} 
                className="p-4 item-row group cursor-pointer hover:pl-2"
                style={{animation: `slideInUp 0.5s ease-out ${idx * 0.05}s both`}}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700/50 to-slate-600/30 flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:from-blue-600/30 group-hover:to-blue-500/20">
                    <item.icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="px-2 py-1 bg-slate-700/50 rounded group-hover:bg-blue-600/30 group-hover:text-blue-200 transition-all">{item.type}</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                  <div className="item-actions flex gap-2">
                    <button 
                      onClick={() => showToast(`Viewed ${item.title}`)}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-blue-300 rounded transition-all"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => showToast('Added to bookmarks!')}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-amber-300 rounded transition-all"
                      title="Bookmark"
                    >
                      <BookmarkPlus size={16} />
                    </button>
                    <button 
                      onClick={() => showToast('Item shared!')}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-green-300 rounded transition-all"
                      title="Share"
                    >
                      <Share2 size={16} />
                    </button>
                    <button 
                      onClick={() => showToast('Item removed')}
                      className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-red-300 rounded transition-all"
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
    </div>
  );
}
