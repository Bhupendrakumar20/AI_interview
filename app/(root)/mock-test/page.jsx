"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MOCK_TEST_COMPANIES,
  DIFFICULTY_LEVELS,
} from "@/lib/mock-test-constants";
import QuestionCard from "@/components/QuestionCard";
import ActiveInterviewSessions from "@/components/ActiveInterviewSessions";
import MockTestWorkspace from "@/components/MockTestWorkspace";
import {
  finishInterviewModeSessionAction,
  startInterviewModeSessionAction,
} from "@/lib/actions/interview-session.action";
import { useExitConfirmation } from "@/lib/hooks/useExitConfirmation";
import { toast } from "sonner";
import { Laptop, Mic, Layers, Zap, Settings, Eye, Play, Target, Star } from "lucide-react";
import { DotsGridWave } from "@/components/ui/LoadingAnimations";

const TEST_TYPES = [
  { id: "technical", name: "Technical Round", icon: Laptop, desc: "Core technical concepts", color: "from-purple-500 to-indigo-600" },
  { id: "behavioral", name: "Behavioral Round", icon: Mic, desc: "Leadership & teamwork", color: "from-cyan-500 to-blue-600" },
  { id: "system-design", name: "System Design", icon: Layers, desc: "Architecture & design", color: "from-amber-500 to-orange-600" },
  { id: "coding", name: "Coding Challenge", icon: Zap, desc: "Problem-solving skills", color: "from-red-500 to-pink-600" },
];

const CURATED_PACKS = [
  { id: 1, company: "Google", level: "Easy", questions: 15, rating: 4.8, trend: "up" },
  { id: 2, company: "Meta", level: "Medium", questions: 20, rating: 4.7, trend: "up" },
  { id: 3, company: "Amazon", level: "Hard", questions: 25, rating: 4.9, trend: "down" },
  { id: 4, company: "Apple", level: "Medium", questions: 18, rating: 4.6, trend: "up" },
  { id: 5, company: "Microsoft", level: "Hard", questions: 22, rating: 4.8, trend: "up" },
  { id: 6, company: "Netflix", level: "Medium", questions: 17, rating: 4.7, trend: "flat" },
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
  const [searchRole, setSearchRole] = useState(filters.role);
  const [selectedTestType, setSelectedTestType] = useState(TEST_TYPES[0]);
  const [isTestActive, setIsTestActive] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [isStartingTest, setIsStartingTest] = useState(false);

  useExitConfirmation(loading || isTestActive);

  // Tracks the "current" request so stale/overlapping responses can be ignored
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
  }, []);

  const refreshResults = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/interview-sessions?mode=mock-test&limit=10&excludeActive=true",
        { cache: "no-store" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch mock test results");
      setRecentResults(data.sessions);
    } catch (error) {
      console.error("Failed to refresh mock test results:", error);
    }
  }, []);

  useEffect(() => {
    refreshResults();
  }, [refreshResults]);

  const loadQuestions = useCallback(async (activeFilters, activeRound) => {
    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const myRequestId = ++requestIdRef.current;

    setLoading(true);
    setQuestions([]);
    try {
      const res = await fetch("/api/mock-test/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: activeFilters.company,
          role: activeFilters.role,
          difficulty: activeFilters.difficulty,
          questionType: activeFilters.type,
          count: activeFilters.count,
          roundId: activeRound.id,
          roundName: activeRound.name,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast.warning(errorData.error || "Another interview round is currently active or loading.");
          return;
        }
        throw new Error(errorData.error || "Failed to start question stream");
      }
      if (!res.body) throw new Error("Question stream returned no response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line) => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.error) throw new Error(event.error);
        if (myRequestId !== requestIdRef.current) return;

        if (event.type === "question_start") {
          setQuestions((current) => [
            ...current,
            { question: "", difficulty: event.difficulty, isStreaming: true },
          ]);
        } else if (event.type === "question_reset") {
          setQuestions((current) =>
            current.map((question, index) =>
              index === event.index
                ? { ...question, question: "", isStreaming: true }
                : question
            )
          );
        } else if (event.type === "question_token") {
          setQuestions((current) =>
            current.map((question, index) =>
              index === event.index
                ? { ...question, question: question.question + event.text }
                : question
            )
          );
        } else if (event.type === "question_complete") {
          setQuestions((current) =>
            current.map((question, index) =>
              index === event.index
                ? { ...event.question, isStreaming: false }
                : question
            )
          );
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) processLine(line);
        if (done) break;

        // If a newer request has started, stop applying this one's results
        if (myRequestId !== requestIdRef.current) {
          await reader.cancel();
          return;
        }
      }
      if (buffer.trim()) processLine(buffer);

      if (myRequestId === requestIdRef.current) {
        toast.success(`Loaded questions for ${activeFilters.company}`);
      }
    } catch (error) {
      if (error.name === "AbortError") return; // expected when superseded — not a real error
      console.error("Error loading questions:", error);
      toast.error("Failed to load mock test questions");
      if (myRequestId === requestIdRef.current) setQuestions([]);
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // Debounced trigger: fires ~500ms after filters stop changing
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadQuestions(filters, selectedTestType);
    }, 500);

    return () => clearTimeout(debounceTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedTestType]);

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

  const handleStartTest = async () => {
    if (questions.length === 0) {
      toast.error("No questions loaded");
      return;
    }
    if (questions.some((question) => question.isStreaming)) {
      toast.error("Please wait for the questions to finish generating");
      return;
    }

    setIsStartingTest(true);
    try {
      const response = await startInterviewModeSessionAction({
        mode: "mock-test",
        details: {
          company: filters.company,
          role: filters.role,
          difficulty: filters.difficulty,
          type: selectedTestType.name,
          roundId: selectedTestType.id,
          roundName: selectedTestType.name,
        },
      });
      if (!response.success) {
        if (response.activeRound) {
          toast.warning(response.error);
        } else {
          toast.error(response.error || "Could not start mock test");
        }
        return;
      }
      console.info("[Interview session]", {
        page: "/mock-test",
        user_id: response.userId,
        thread_id: response.sessionId,
        mode: "mock-test",
      });
      setActiveSessionId(response.sessionId);
      setIsTestActive(true);
    } catch (error) {
      console.error("Error starting mock test:", error);
      toast.error(error.message || "Could not start mock test");
    } finally {
      setIsStartingTest(false);
    }
  };

  const handleCloseTest = async (result = {}) => {
    if (activeSessionId) {
      const response = await finishInterviewModeSessionAction({
        sessionId: activeSessionId,
        status: "abandoned",
        result: { ...result, company: filters.company, role: filters.role },
      });
      if (!response.success) {
        toast.error(response.error || "Could not close mock test");
        return;
      }
    }
    setIsTestActive(false);
    setActiveSessionId(null);
    await refreshResults();
  };

  const getDifficultyBadge = (diff) => {
    const badges = {
      Easy: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      Medium: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
      Hard: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
    };
    return badges[diff] || badges["Medium"];
  };

  if (isTestActive) {
    return (
      <MockTestWorkspace
        filters={{ ...filters, type: selectedTestType.name }}
        questions={questions}
        sessionId={activeSessionId}
        onClose={handleCloseTest}
        onSessionComplete={refreshResults}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-8 pt-6">
        <ActiveInterviewSessions />
      </div>
      {/* HERO SECTION */}
      <section className="relative pt-12 pb-8 px-8 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="relative backdrop-blur-sm rounded-2xl border border-border bg-card p-8 overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl -z-10 opacity-30" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/5 rounded-full filter blur-3xl -z-10 opacity-20" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
                  <Target size={14} className="text-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Practice Mode</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-3">
                  Mock Interview Tests
                  <span className="text-primary ml-2">For PrepWise</span>
                </h1>

                <p className="text-muted-foreground text-base max-w-md mb-6 leading-relaxed">
                  Master technical interviews with company-specific questions and real-time feedback
                </p>

                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={handleStartTest}
                    disabled={isStartingTest}
                    className="btn-primary flex items-center gap-2 px-6 py-2.5"
                  >
                    <Play size={16} /> {isStartingTest ? "Starting..." : "Quick Start Test"}
                  </Button>
                  <Button
                    className="btn-secondary flex items-center gap-2 px-6 py-2.5"
                    onClick={() => document.getElementById("mock-test-results")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    View Results
                  </Button>
                </div>
              </div>

              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{MOCK_TEST_COMPANIES.length}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">Companies</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{questions.length}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">Questions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mock-test-results" className="max-w-7xl mx-auto px-8 pt-8">
        <h2 className="text-xl font-bold mb-4">Recent Mock Test Results</h2>
        {recentResults.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recentResults.map((session) => (
              <article key={session.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {session.details?.company || session.result?.company || "Mock Test"} ·{" "}
                      {session.details?.role || session.result?.role || "Interview"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {session.status === "completed" ? "Completed" : "Ended early"} ·{" "}
                      {session.completedAt ? new Date(session.completedAt).toLocaleString() : ""}
                    </p>
                  </div>
                  {typeof session.result?.evaluation?.score === "number" && (
                    <span className="text-lg font-bold text-primary">
                      {session.result.evaluation.score}/100
                    </span>
                  )}
                </div>
                {session.result?.evaluation?.detailedReview && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                    {session.result.evaluation.detailedReview}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Completed tests will appear here on all your signed-in devices.</p>
        )}
      </section>

      {/* MAIN CONTENT */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        {/* TEST TYPE SELECTION */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-1 tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>Select Test Type</h2>
          <p className="text-muted-foreground text-sm mb-6">Choose the type of interview round you want to practice</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEST_TYPES.map((type) => (
              <div
                key={type.id}
                onClick={() => {
                  if (type.id === selectedTestType.id) return;
                  if (loading) {
                    toast.warning(`Questions for ${selectedTestType.name} are still loading.`);
                    return;
                  }
                  setSelectedTestType(type);
                  const typeMapping = {
                    technical: "Technical",
                    behavioral: "Behavioral",
                    "system-design": "System Design",
                    coding: "Coding",
                  };
                  handleFilterChange("type", typeMapping[type.id] || "Technical");
                }}
                className={`group cursor-pointer rounded-xl border-2 transition-all p-5 relative overflow-hidden ${
                  selectedTestType.id === type.id
                    ? "border-primary bg-secondary/50 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="mb-3 p-2 w-fit rounded-lg bg-primary/10 text-primary">
                  <type.icon size={24} />
                </div>
                <h3 className="font-bold text-foreground mb-1">{type.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{type.desc}</p>
                <div
                  className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center transition-all ${
                    selectedTestType.id === type.id ? "bg-primary scale-100" : "opacity-0 scale-90"
                  }`}
                >
                  {selectedTestType.id === type.id && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONFIG PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <Settings size={20} className="text-primary" />
                <div>
                  <h3 className="font-bold text-foreground">Test Configuration</h3>
                  <p className="text-xs text-muted-foreground">Customize your mock test settings</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Company
                    </label>
                    <select
                      value={filters.company}
                      onChange={(e) => handleFilterChange("company", e.target.value)}
                      className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary"
                    >
                      {MOCK_TEST_COMPANIES.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Role
                    </label>
                    <Input
                      type="text"
                      placeholder="Software Engineer"
                      value={searchRole}
                      onChange={(e) => handleRoleSearch(e.target.value)}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 text-sm h-10"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTY_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => handleFilterChange("difficulty", level)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            filters.difficulty === level
                              ? level === "Easy"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : level === "Medium"
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              : "bg-secondary text-foreground border border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Questions
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="20"
                      value={filters.count}
                      onChange={(e) => handleFilterChange("count", parseInt(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="text-right text-xs text-muted-foreground mt-1">{filters.count} questions</div>
                  </div>
                </div>

                <button
                  onClick={handleStartTest}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 px-4 mt-4"
                >
                  <Play size={16} /> Start Test Now
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <Eye size={20} className="text-primary" />
              <div>
                <h3 className="font-bold text-foreground">Test Preview</h3>
                <p className="text-xs text-muted-foreground">Summary</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-secondary/40 border border-border/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Company</span>
                  <span className="font-bold text-foreground">{filters.company}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className="font-bold text-foreground truncate">{filters.role}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Difficulty</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${getDifficultyBadge(filters.difficulty)}`}>
                    {filters.difficulty}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Questions</span>
                  <span className="font-bold text-primary">{filters.count}</span>
                </div>
              </div>

              <div className="bg-secondary/40 border border-border/50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">✓ Questions stream in live</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">✓ Answer & tips on demand</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">✓ You can review</p>
              </div>
            </div>
          </div>
        </div>

        {/* CURATED PACKS */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>Curated Packs</h2>
              <p className="text-muted-foreground text-sm">Popular test collections by community</p>
            </div>
            <Button className="text-primary hover:text-primary/80">
              View All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CURATED_PACKS.map((pack) => (
              <div key={pack.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{pack.company}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{pack.questions} questions</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${
                    pack.level === "Easy"
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : pack.level === "Medium"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  }`}>
                    {pack.level}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={14} className="fill-amber-500" />
                    <span className="text-sm font-bold text-foreground">{pack.rating}</span>
                  </div>
                  <span className={`text-sm font-bold capitalize ${pack.trend === "up" ? "text-emerald-500" : pack.trend === "down" ? "text-rose-500" : "text-muted-foreground"}`}>
                    {pack.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUESTIONS LIST */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-1 tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>Practice Questions</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {questions.length} of {filters.count} questions for {filters.company} - {filters.role} ({filters.difficulty})
          </p>

          {loading && questions.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <DotsGridWave size="md" color="indigo" label="Synthesizing interview questions..." />
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
              <p className="text-muted-foreground mb-4">No questions loaded yet</p>
              <Button
                onClick={handleStartTest}
                className="btn-primary"
              >
                Load Questions
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.slice(0, 5).map((q, index) => (
                <QuestionCard
                  key={index}
                  question={q}
                  index={index}
                  company={filters.company}
                  role={filters.role}
                  isStreaming={q.isStreaming}
                />
              ))}
              {loading && questions.length < filters.count && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                 Generating question {(questions.findIndex((question) => question.isStreaming) + 1) || questions.length + 1} of {filters.count}…
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}