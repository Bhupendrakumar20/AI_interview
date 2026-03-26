'use client';

import { useState } from 'react';
import { Play, Check, Bookmark, Share2, Trash2, Pin, Clock } from 'lucide-react';

export default function BookmarkedPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const questions = [
    { id: 1, title: 'Two Sum', number: 1, difficulty: 'easy', topics: ['Array', 'Hash Table'], solved: true },
    { id: 2, title: 'Median of Two Sorted Arrays', number: 4, difficulty: 'hard', topics: ['Array', 'Binary Search'], solved: false },
    { id: 3, title: 'Longest Substring Without Repeating', number: 3, difficulty: 'medium', topics: ['String', 'Sliding Window'], solved: true },
    { id: 4, title: 'Container With Most Water', number: 11, difficulty: 'medium', topics: ['Array', 'Two Pointers'], solved: true },
    { id: 5, title: 'Regular Expression Matching', number: 10, difficulty: 'hard', topics: ['String', 'DP'], solved: false },
    { id: 6, title: 'Merge K Sorted Lists', number: 23, difficulty: 'hard', topics: ['Linked List', 'Heap'], solved: true },
    { id: 7, title: 'Trapping Rain Water', number: 42, difficulty: 'hard', topics: ['Array', 'DP'], solved: false },
    { id: 8, title: 'Permutations', number: 46, difficulty: 'medium', topics: ['Backtracking'], solved: true },
  ];

  const stats = [
    { label: 'Bookmarked', value: '8', icon: Pin },
    { label: 'Solved', value: '5', icon: Check },
    { label: 'Remaining', value: '3', icon: Clock },
  ];

  const difficultyColors = {
    easy: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
    hard: 'bg-red-600/20 text-red-300 border-red-500/30',
  };

  const filteredQuestions = activeFilter === 'all' 
    ? questions 
    : questions.filter(q => q.difficulty === activeFilter);

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
    .question-row {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .question-row:hover {
      background: rgba(71, 85, 105, 0.3);
      padding-left: 1rem;
    }
    .q-actions {
      opacity: 0;
      transform: translateX(10px);
      transition: all 0.3s ease;
    }
    .question-row:hover .q-actions {
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
          <div className="text-sm text-slate-400 mb-2">Quick Access › <span className="text-slate-300">Bookmarked Questions</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">Bookmarked Questions</h1>
          <p className="text-slate-400">Your curated LeetCode practice questions</p>
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
                <div className="text-2xl"><stat.icon size={24} className="text-white" /></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'easy', 'medium', 'hard'].map((filter) => (
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

        {/* Questions List */}
        <div className="space-y-2">
          {filteredQuestions.map((q, idx) => (
            <div 
              key={q.id} 
              className={`bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-l-4 rounded-lg p-4 question-row group cursor-pointer hover:pl-2
                ${q.difficulty === 'easy' ? 'border-l-emerald-500 border-r-slate-700/50 border-y-slate-700/50 hover:border-r-emerald-500/40 hover:border-y-emerald-500/20' : 
                  q.difficulty === 'medium' ? 'border-l-amber-500 border-r-slate-700/50 border-y-slate-700/50 hover:border-r-amber-500/40 hover:border-y-amber-500/20' : 
                  'border-l-red-500 border-r-slate-700/50 border-y-slate-700/50 hover:border-r-red-500/40 hover:border-y-red-500/20'}`}
              style={{animation: `slideInUp 0.5s ease-out ${idx * 0.05}s both`, transition: 'all 0.3s ease'}}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono text-xs">{`LeetCode #${q.number}`}</span>
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{q.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${difficultyColors[q.difficulty]}`}>
                      {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                    </span>
                    {q.solved && <Check size={16} className="text-green-400 ml-auto" />}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {q.topics.map((topic, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded group-hover:bg-slate-600/50 group-hover:text-slate-200 transition-all">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="q-actions flex gap-2 ml-4">
                  <button 
                    onClick={() => showToast(`Solving ${q.title}`)}
                    className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded transition-all"
                    title="Solve"
                  >
                    <Play size={16} />
                  </button>
                  <button 
                    onClick={() => showToast('Unbookmarked')}
                    className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-amber-300 rounded transition-all"
                    title="Bookmark"
                  >
                    <Bookmark size={16} />
                  </button>
                  <button 
                    onClick={() => showToast('Question shared!')}
                    className="p-2 hover:bg-slate-600/40 text-slate-300 hover:text-green-300 rounded transition-all"
                    title="Share"
                  >
                    <Share2 size={16} />
                  </button>
                  <button 
                    onClick={() => showToast('Removed from bookmarks')}
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
  );
}
