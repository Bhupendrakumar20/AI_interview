// Mock Test Page - PrepWise
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getMockTestQuestions,
  getAvailableFilters,
} from "@/lib/actions/mock-test.action";
import {
  MOCK_TEST_COMPANIES,
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
} from "@/lib/mock-test-constants";
import QuestionCard from "@/components/QuestionCard";
import { toast } from "sonner";

const TEST_TYPES = [
  { id: "technical", name: "Technical Round", emoji: "💻", desc: "Core technical concepts", color: "from-purple-500 to-indigo-600" },
  { id: "behavioral", name: "Behavioral Round", emoji: "🎤", desc: "Leadership & teamwork", color: "from-cyan-500 to-blue-600" },
  { id: "system-design", name: "System Design", emoji: "🏗️", desc: "Architecture & design", color: "from-amber-500 to-orange-600" },
  { id: "coding", name: "Coding Challenge", emoji: "⚡", desc: "Problem-solving skills", color: "from-red-500 to-pink-600" },
];

const CURATED_PACKS = [
  { id: 1, company: "Google", level: "Easy", questions: 15, rating: 4.8, trend: "↑" },
  { id: 2, company: "Meta", level: "Medium", questions: 20, rating: 4.7, trend: "↑" },
  { id: 3, company: "Amazon", level: "Hard", questions: 25, rating: 4.9, trend: "↓" },
  { id: 4, company: "Apple", level: "Medium", questions: 18, rating: 4.6, trend: "↑" },
  { id: 5, company: "Microsoft", level: "Hard", questions: 22, rating: 4.8, trend: "↑" },
  { id: 6, company: "Netflix", level: "Medium", questions: 17, rating: 4.7, trend: "→" },
];

export default function MockTestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState({
    company: searchParams.get("company") || "Google",
    role: searchParams.get("role") || "Software Engineer",
    difficulty: searchParams.get("difficulty") || "Medium",
    type: searchParams.get("type") || "Technical",
    count: parseInt(searchParams.get("count")) || 5,
  });

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [searchRole, setSearchRole] = useState(filters.role);
  const [selectedTestType, setSelectedTestType] = useState(TEST_TYPES[0]);
  const [testHistory, setTestHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  // Load questions on filter change
  useEffect(() => {
    loadQuestions();
  }, [filters]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Loading questions with filters:", filters);

      const result = await getMockTestQuestions({
        company: filters.company,
        role: filters.role,
        difficulty: filters.difficulty,
        questionType: filters.type,
        count: filters.count,
      });

      if (result.success) {
        setQuestions(result.questions || []);
        toast.success(
          `Loaded ${result.totalQuestions || 0} questions for ${filters.company}`
        );
      } else {
        toast.error(result.error || "Failed to load questions");
        setQuestions([]);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load mock test questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      params.set(k, v);
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleRoleSearch = (value) => {
    setSearchRole(value);
    handleFilterChange("role", value);
  };

  const handleQuestionClick = (index) => {
    setExpandedQuestion(expandedQuestion === index ? null : index);
  };

  const handleStartTest = () => {
    if (questions.length === 0) {
      toast.error("No questions loaded");
      return;
    }
    setShowModal(true);
    setCurrentQuestion(0);
  };

  const getDifficultyBadge = (diff) => {
    const badges = {
      "Easy": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      "Medium": "bg-amber-500/20 text-amber-300 border-amber-500/30",
      "Hard": "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };
    return badges[diff] || badges["Medium"];
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-dark-100 to-dark-200">
      {/* HERO SECTION */}
      <section className="relative pt-12 pb-8 px-8 border-b border-dark-300/50">
        <div className="max-w-7xl mx-auto">
          <div className="relative backdrop-blur-sm rounded-2xl border border-primary-200/20 bg-linear-to-br from-dark-150/50 via-dark-200/50 to-dark-250/50 p-8 overflow-hidden">
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200/10 rounded-full filter blur-3xl -z-10 opacity-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full filter blur-3xl -z-10 opacity-15" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-primary-200/15 border border-primary-200/30 rounded-full px-4 py-1.5 mb-4">
                  <span className="text-xs font-bold text-primary-200 uppercase tracking-widest">🎯 Practice Mode</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-3">
                  Mock Interview Tests
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-200 to-teal-400 ml-2">For PrepWise</span>
                </h1>

                <p className="text-light-100 text-lg max-w-md mb-6">
                  Master technical interviews with company-specific questions and real-time feedback
                </p>

                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={handleStartTest}
                    className="bg-linear-to-r from-primary-200 to-primary-300 hover:shadow-lg hover:shadow-primary-200/20 text-dark-100 font-bold px-6 py-2.5 rounded-xl transition-all"
                  >
                    ▶ Quick Start Test
                  </Button>
                  <Button className="bg-dark-300/50 hover:bg-dark-300 border border-primary-200/30 text-light-200 font-bold px-6 py-2.5 rounded-xl transition-all">
                    📊 View Results
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-200">{MOCK_TEST_COMPANIES.length}</div>
                  <div className="text-xs text-light-100 mt-1">Companies</div>
                </div>
                <div className="h-12 w-px bg-dark-300/50" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-teal-400">{questions.length}</div>
                  <div className="text-xs text-light-100 mt-1">Questions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        {/* TEST TYPE SELECTION */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-1">Select Test Type</h2>
          <p className="text-light-100 mb-6">Choose the type of interview round you want to practice</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEST_TYPES.map((type) => (
              <div
                key={type.id}
                onClick={() => setSelectedTestType(type)}
                className={`group cursor-pointer rounded-xl border-2 transition-all p-5 ${
                  selectedTestType.id === type.id
                    ? "border-primary-200 bg-dark-150 shadow-lg shadow-primary-200/20"
                    : "border-dark-300 bg-dark-200 hover:border-primary-200/50"
                }`}
              >
                <div className="text-3xl mb-3">{type.emoji}</div>
                <h3 className="font-bold text-light-200 mb-1">{type.name}</h3>
                <p className="text-xs text-light-100 mb-3">{type.desc}</p>
                <div
                  className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-primary-200 flex items-center justify-center transition-all ${
                    selectedTestType.id === type.id ? "bg-primary-200" : "opacity-0"
                  }`}
                >
                  {selectedTestType.id === type.id && <span className="text-dark-100 text-xs font-bold">✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONFIG PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Configuration Card */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-dark-300 bg-dark-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-300 flex items-center gap-3">
                <span className="text-2xl">⚙️</span>
                <div>
                  <h3 className="font-bold">Test Configuration</h3>
                  <p className="text-xs text-light-100">Customize your mock test settings</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company */}
                  <div>
                    <label className="text-xs font-bold text-light-100 uppercase tracking-wider mb-2 block">
                      Company
                    </label>
                    <select
                      value={filters.company}
                      onChange={(e) => handleFilterChange("company", e.target.value)}
                      className="w-full px-3 py-2.5 bg-dark-300 border border-dark-400 rounded-lg text-light-200 text-sm focus:outline-none focus:border-primary-200"
                    >
                      {MOCK_TEST_COMPANIES.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-xs font-bold text-light-100 uppercase tracking-wider mb-2 block">
                      Role
                    </label>
                    <Input
                      type="text"
                      placeholder="Software Engineer"
                      value={searchRole}
                      onChange={(e) => handleRoleSearch(e.target.value)}
                      className="bg-dark-300 border-dark-400 text-light-200 placeholder:text-light-100/40 text-sm h-10"
                    />
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="text-xs font-bold text-light-100 uppercase tracking-wider mb-2 block">
                      Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTY_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => handleFilterChange("difficulty", level)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            filters.difficulty === level
                              ? level === "Easy"
                                ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50"
                                : level === "Medium"
                                ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                                : "bg-rose-500/30 text-rose-300 border border-rose-500/50"
                              : "bg-dark-300 text-light-200 border border-dark-400 hover:border-dark-300"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Count */}
                  <div>
                    <label className="text-xs font-bold text-light-100 uppercase tracking-wider mb-2 block">
                      Questions
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="20"
                      value={filters.count}
                      onChange={(e) => handleFilterChange("count", parseInt(e.target.value))}
                      className="w-full h-2 bg-dark-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-right text-xs text-light-100 mt-1">{filters.count} questions</div>
                  </div>
                </div>

                <button
                  onClick={handleStartTest}
                  className="w-full bg-linear-to-r from-primary-200 to-primary-300 hover:shadow-lg hover:shadow-primary-200/30 text-dark-100 font-bold py-3 px-4 rounded-lg transition-all mt-4"
                >
                  🚀 Start Test Now
                </button>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="rounded-xl border border-dark-300 bg-dark-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-300 flex items-center gap-3">
              <span className="text-2xl">👁️</span>
              <div>
                <h3 className="font-bold">Test Preview</h3>
                <p className="text-xs text-light-100">Summary</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-dark-300/50 border border-dark-400/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-dark-400">
                  <span className="text-sm text-light-100">Company</span>
                  <span className="font-bold text-light-200">{filters.company}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dark-400">
                  <span className="text-sm text-light-100">Role</span>
                  <span className="font-bold text-light-200 truncate">{filters.role}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dark-400">
                  <span className="text-sm text-light-100">Difficulty</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${getDifficultyBadge(filters.difficulty)}`}>
                    {filters.difficulty}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-light-100">Questions</span>
                  <span className="font-bold text-primary-200">{filters.count}</span>
                </div>
              </div>

              <div className="bg-dark-300/50 border border-dark-400/50 rounded-lg p-3">
                <p className="text-xs text-light-100 mb-2">✓ Questions loaded</p>
                <p className="text-xs text-light-100 mb-2">✓ Timer enabled</p>
                <p className="text-xs text-light-100">✓ You can review</p>
              </div>
            </div>
          </div>
        </div>

        {/* CURATED PACKS */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Curated Packs</h2>
              <p className="text-light-100 text-sm">Popular test collections by community</p>
            </div>
            <Button className="text-primary-200 hover:text-primary-100">
              View All →
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CURATED_PACKS.map((pack) => (
              <div key={pack.id} className="rounded-lg border border-dark-300 bg-dark-200 p-4 hover:border-primary-200/50 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-light-200 group-hover:text-primary-200 transition-colors">{pack.company}</h3>
                    <p className="text-xs text-light-100 mt-0.5">{pack.questions} questions</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${
                    pack.level === "Easy" 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : pack.level === "Medium"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}>
                    {pack.level}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    <span className="text-sm font-bold text-light-200">{pack.rating}</span>
                  </div>
                  <span className={`text-sm font-bold ${pack.trend === "↑" ? "text-emerald-400" : pack.trend === "↓" ? "text-rose-400" : "text-light-100"}`}>
                    {pack.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUESTIONS LIST */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-1">Practice Questions</h2>
          <p className="text-light-100 mb-6">
            {questions.length} questions for {filters.company} - {filters.role} ({filters.difficulty})
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-lg border border-dark-300 bg-dark-200 p-8 text-center">
              <p className="text-light-100 mb-4">No questions loaded yet</p>
              <Button 
                onClick={handleStartTest}
                className="bg-primary-200 text-dark-100 font-bold hover:shadow-lg"
              >
                Load Questions
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.slice(0, 5).map((q, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-dark-300 bg-dark-200 p-5 hover:border-primary-200/50 transition-all cursor-pointer"
                  onClick={() => handleQuestionClick(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-primary-200">Q{index + 1}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getDifficultyBadge(q.difficulty)}`}>
                          {q.difficulty || "Medium"}
                        </span>
                      </div>
                      <p className="text-light-200 font-medium">{q.question}</p>
                    </div>
                    <span className="text-primary-200 text-xl ml-4">
                      {expandedQuestion === index ? "▼" : "▶"}
                    </span>
                  </div>

                  {expandedQuestion === index && (
                    <div className="mt-4 pt-4 border-t border-dark-300">
                      <p className="text-light-100 text-sm mb-3"><strong>Expected Answer:</strong></p>
                      <p className="text-light-100 text-sm">{q.expectedAnswer}</p>
                      {q.tips && q.tips.length > 0 && (
                        <div className="mt-4">
                          <p className="font-bold text-light-200 text-sm mb-2">💡 Tips:</p>
                          <ul className="space-y-1">
                            {q.tips.map((tip, i) => (
                              <li key={i} className="text-light-100 text-sm">• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
