'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Database, ShieldAlert, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DSAAdminPanelPage() {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [timeLimit, setTimeLimit] = useState(5000);
  const [testCases, setTestCases] = useState([
    { stdin: '', expectedOutput: '', isHidden: false },
    { stdin: '', expectedOutput: '', isHidden: false }
  ]);
  const [saving, setSaving] = useState(false);

  const handleAddCase = () => {
    setTestCases([...testCases, { stdin: '', expectedOutput: '', isHidden: false }]);
  };

  const handleRemoveCase = (index) => {
    const updated = testCases.filter((_, i) => i !== index);
    setTestCases(updated);
  };

  const handleCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!slug.trim() || !title.trim()) {
      toast.error("Please enter a valid question slug and title.");
      return;
    }

    setSaving(true);
    toast.info("Saving question registry to Firestore...");

    try {
      const res = await fetch('/api/admin/dsa-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: slug.trim().toLowerCase(),
          title: title.trim(),
          difficulty,
          timeLimitMs: timeLimit,
          testCases: testCases.filter(tc => tc.stdin.trim() || tc.expectedOutput.trim())
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");

      toast.success(data.message || "Question and test cases saved successfully!");
      
      // Reset form
      setSlug('');
      setTitle('');
      setTestCases([
        { stdin: '', expectedOutput: '', isHidden: false },
        { stdin: '', expectedOutput: '', isHidden: false }
      ]);
    } catch (err) {
      toast.error(err.message || "Failed to save data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 font-sans text-slate-100 min-h-[90vh]">
      {/* Back to lobby */}
      <div className="flex justify-between items-center">
        <Link 
          href="/dsa-room" 
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={16} /> BACK TO LOBBY
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
          <ShieldAlert size={14} /> Admin Seeding Console
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
          <Database /> DSA Database Seeder
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Create new coding challenges and register public/hidden test cases securely in Firestore. 
          Once registered, players in duels will be judged strictly against these backend test cases.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Question Metadata */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-900 pb-2">
            1. Problem Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Question Slug (Matches LeetCode Slug)</label>
              <input 
                type="text" 
                placeholder="e.g. two-sum"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-200"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Display Title</label>
              <input 
                type="text" 
                placeholder="e.g. Two Sum"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-200"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-200"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Execution Time Limit (ms)</label>
              <input 
                type="number" 
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-200"
                required
              />
            </div>
          </div>
        </div>

        {/* Test Cases Builder */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              2. Test Cases Builder
            </h3>
            <button 
              type="button" 
              onClick={handleAddCase}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg transition"
            >
              <Plus size={14} /> Add Test Case
            </button>
          </div>

          <div className="space-y-4">
            {testCases.map((tc, index) => (
              <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-900/80 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">CASE #{index + 1}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={tc.isHidden}
                        onChange={(e) => handleCaseChange(index, 'isHidden', e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-950"
                      />
                      Is Hidden case?
                    </label>
                    {testCases.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCase(index)}
                        className="text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Input (stdin)</span>
                    <textarea 
                      placeholder="Line-separated parameters (e.g. [2,7,11,15]\n9)"
                      value={tc.stdin}
                      onChange={(e) => handleCaseChange(index, 'stdin', e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-950 rounded-lg p-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected Output</span>
                    <textarea 
                      placeholder="Expected string result (e.g. [0,1])"
                      value={tc.expectedOutput}
                      onChange={(e) => handleCaseChange(index, 'expectedOutput', e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-950 rounded-lg p-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : <><Sparkles size={16} /> Register & Seed to Database</>}
        </button>
      </form>
    </div>
  );
}
