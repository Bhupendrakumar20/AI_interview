'use client';

import { useState } from 'react';

export default function BookmarkedPage() {
  const [activeFilter, setActiveFilter] = useState('all');

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
    { label: 'Bookmarked', value: '8' },
    { label: 'Solved', value: '5' },
    { label: 'Remaining', value: '3' },
  ];

  const difficultyColors = {
    easy: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
    hard: 'bg-red-600/20 text-red-300 border-red-500/30',
  };

  const filteredQuestions = activeFilter === 'all' 
    ? questions 
    : questions.filter(q => q.difficulty === activeFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
          {['all', 'easy', 'medium', 'hard'].map((filter) => (
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

        {/* Questions List */}
        <div className="space-y-2">
          {filteredQuestions.map((q) => (
            <div 
              key={q.id} 
              className={`bg-slate-800/40 border border-l-4 rounded-lg p-4 hover:bg-slate-700/20 transition group cursor-pointer flex items-center justify-between
                ${q.difficulty === 'easy' ? 'border-l-emerald-500 border-slate-700/50' : 
                  q.difficulty === 'medium' ? 'border-l-amber-500 border-slate-700/50' : 
                  'border-l-red-500 border-slate-700/50'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-xs">{`LeetCode #${q.number}`}</span>
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition">{q.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${difficultyColors[q.difficulty]}`}>
                    {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {q.topics.map((topic, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-4">
                {q.solved ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600/20 text-green-400">
                    ✓
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">Unsolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
