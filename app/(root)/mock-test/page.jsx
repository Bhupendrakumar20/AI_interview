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
import {
  clearMockTestPreparation,
  loadMockTestPreparation,
  saveMockTestPreparation,
} from "@/lib/mock-test-preparation-storage";
import { toast } from "sonner";
import { Laptop, Mic, Layers, Zap, Settings, Eye, Play, Target, Star, Wind } from "lucide-react";

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

const PREPARATION_TIPS = [
  "Explain your reasoning, not just your final answer.",
  "For coding questions, consider edge cases before optimizing.",
  "For system design, clarify requirements before drawing components.",
  "Use specific examples to make behavioral answers memorable.",
  "A brief pause to organize your thoughts is perfectly fine.",
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
  const initialTestType = TEST_TYPES.find((type) =>
    type.name.toLowerCase().startsWith(filters.type.toLowerCase())
  ) || TEST_TYPES[0];
  const [selectedTestType, setSelectedTestType] = useState(initialTestType);
  const [isTestActive, setIsTestActive] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [showAllResults, setShowAllResults] = useState(false);
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [preparationTipIndex, setPreparationTipIndex] = useState(0);
  const [breathingSeconds, setBreathingSeconds] = useState(30);
  const [isBreathing, setIsBreathing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCheckingSavedPreparation, setIsCheckingSavedPreparation] = useState(true);

  useExitConfirmation(loading || isTestActive);

  // Tracks the "current" request so stale/overlapping responses can be ignored
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  const preparationConfigRef = useRef(null);
  const preparationStartedAtRef = useRef(null);
  const estimateStartedAtRef = useRef(null);
  const estimateStartingQuestionCountRef = useRef(0);
  const testStartedRef = useRef(false);
  const storageWarningShownRef = useRef(false);
  const notificationPermissionRequestRef = useRef(null);
  const initialConfigRef = useRef({
    filters: { ...filters },
    round: selectedTestType,
  });

  const loadedQuestionCount = questions.filter(
    (question) => !question.isStreaming && question.question?.trim()
  ).length;
  const targetQuestionCount = preparationConfigRef.current?.filters.count || filters.count;
  const canStartTest = loadedQuestionCount > 0;
  const isPreparingTest = loading || questions.length > 0;
  const questionProgress = targetQuestionCount > 0
    ? Math.min(100, Math.round((loadedQuestionCount / targetQuestionCount) * 100))
    : 0;
  const questionsCompletedThisRun = Math.max(
    0,
    loadedQuestionCount - estimateStartingQuestionCountRef.current
  );
  const estimatedSecondsRemaining = loading && questionsCompletedThisRun > 0
    ? Math.max(
        0,
        Math.ceil((Math.max(elapsedSeconds, 1) / questionsCompletedThisRun) * (targetQuestionCount - loadedQuestionCount))
      )
    : null;
  const remainingTimeLabel = estimatedSecondsRemaining === null
    ? "Estimating remaining time…"
    : estimatedSecondsRemaining < 60
    ? "Under a minute left"
    : `About ${Math.ceil(estimatedSecondsRemaining / 60)} min left`;
  const preparationStage = !loading && loadedQuestionCount < targetQuestionCount
    ? "Ready to continue"
    : !loading
    ? "Almost ready!"
    : loadedQuestionCount === 0
    ? "Selecting questions…"
    : loadedQuestionCount >= targetQuestionCount
    ? "Setting up your timer…"
    : `Generating questions · ${loadedQuestionCount} ready`;

  useEffect(() => () => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!loading) return undefined;
    const tipInterval = setInterval(() => {
      setPreparationTipIndex((current) => (current + 1) % PREPARATION_TIPS.length);
    }, 6000);
    return () => clearInterval(tipInterval);
  }, [loading]);

  useEffect(() => {
    if (!loading || !estimateStartedAtRef.current) return undefined;
    const elapsedInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - estimateStartedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(elapsedInterval);
  }, [loading]);

  useEffect(() => {
    if (!isBreathing) return undefined;
    const breathingInterval = setInterval(() => {
      setBreathingSeconds((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    const breathingTimeout = setTimeout(() => {
      setBreathingSeconds(0);
      setIsBreathing(false);
    }, 30000);
    return () => {
      clearInterval(breathingInterval);
      clearTimeout(breathingTimeout);
    };
  }, [isBreathing]);

  const startBreathingExercise = () => {
    setBreathingSeconds(30);
    setIsBreathing(true);
  };

  const refreshResults = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/interview-sessions?mode=mock-test&limit=50&excludeActive=true",
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

  const persistPreparationSnapshot = useCallback(async (preparation) => {
    if (testStartedRef.current) return;
    try {
      await saveMockTestPreparation(preparation);
    } catch (error) {
      console.error("Could not save mock-test preparation progress:", error);
      if (!storageWarningShownRef.current) {
        storageWarningShownRef.current = true;
        toast.warning("Question progress could not be saved on this browser.");
      }
    }
  }, []);

  const requestReadyNotificationPermission = async () => {
    if (!window.isSecureContext || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "default") return false;
    try {
      return (await Notification.requestPermission()) === "granted";
    } catch (error) {
      console.warn("Could not request test-ready notification permission:", error);
      return false;
    }
  };

  const notifyMockTestReady = (activeFilters) => {
    if (!window.isSecureContext || !("Notification" in window) || Notification.permission !== "granted") {
      return false;
    }
    try {
      const notification = new Notification("Your mock test is ready", {
        body: `${activeFilters.count} questions for ${activeFilters.role} are ready.`,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch (error) {
      console.warn("Could not show the mock-test ready notification:", error);
      toast.warning("Could not display a browser notification. The test is ready in this tab.");
      return false;
    }
  };

  const loadQuestions = useCallback(async (activeFilters, activeRound, savedQuestions = []) => {
    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const myRequestId = ++requestIdRef.current;

    if (!savedQuestions.length) {
      preparationStartedAtRef.current = Date.now();
    }
    estimateStartedAtRef.current = Date.now();
    estimateStartingQuestionCountRef.current = savedQuestions.length;
    setElapsedSeconds(0);
    setLoading(true);
    setQuestions(savedQuestions);
    let loadedQuestions = [...savedQuestions];
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
          startIndex: loadedQuestions.length,
          previousQuestions: loadedQuestions.map((item) => item.question),
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

      const processLine = async (line) => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.error) throw new Error(event.error);
        if (myRequestId !== requestIdRef.current) return;

        if (event.type === "question_start") {
          loadedQuestions = [
            ...loadedQuestions,
            { question: "", difficulty: event.difficulty, isStreaming: true },
          ];
          setQuestions((current) => [
            ...current,
            { question: "", difficulty: event.difficulty, isStreaming: true },
          ]);
        } else if (event.type === "question_reset") {
          loadedQuestions = loadedQuestions.map((question, index) =>
            index === event.index
              ? { ...question, question: "", isStreaming: true }
              : question
          );
          setQuestions((current) =>
            current.map((question, index) =>
              index === event.index
                ? { ...question, question: "", isStreaming: true }
                : question
            )
          );
        } else if (event.type === "question_token") {
          loadedQuestions = loadedQuestions.map((question, index) =>
            index === event.index
              ? { ...question, question: question.question + event.text }
              : question
          );
          setQuestions((current) =>
            current.map((question, index) =>
              index === event.index
                ? { ...question, question: question.question + event.text }
                : question
            )
          );
        } else if (event.type === "question_complete") {
          loadedQuestions = loadedQuestions.map((question, index) =>
            index === event.index
              ? { ...event.question, isStreaming: false }
              : question
          );
          setQuestions((current) =>
            current.map((question, index) =>
              index === event.index
                ? { ...event.question, isStreaming: false }
                : question
            )
          );
          if (loadedQuestions.filter((question) => !question.isStreaming).length === 1) {
            toast.info("Your first question is ready. You can start now while the rest load.");
          }
          await persistPreparationSnapshot({
            filters: activeFilters,
            roundId: activeRound.id,
            roundName: activeRound.name,
            questions: loadedQuestions
              .filter((question) => !question.isStreaming && question.question?.trim())
              .map(({ question, difficulty }) => ({ question, difficulty })),
            startedAt: preparationStartedAtRef.current,
          });
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) await processLine(line);
        if (done) break;

        // If a newer request has started, stop applying this one's results
        if (myRequestId !== requestIdRef.current) {
          await reader.cancel();
          return;
        }
      }
      if (buffer.trim()) await processLine(buffer);

      if (myRequestId === requestIdRef.current) {
        if (
          loadedQuestions.length !== Number(activeFilters.count) ||
          loadedQuestions.some((question) => question.isStreaming)
        ) {
          throw new Error("Question generation finished before all questions were ready.");
        }
        toast.success(`Loaded questions for ${activeFilters.company}`);
        const permissionRequest = notificationPermissionRequestRef.current;
        if (permissionRequest) {
          permissionRequest.then((granted) => {
            if (granted) notifyMockTestReady(activeFilters);
          });
        } else {
          notifyMockTestReady(activeFilters);
        }
        return loadedQuestions;
      }
      return null;
    } catch (error) {
      if (error.name === "AbortError") return null; // expected when superseded — not a real error
      console.error("Error loading questions:", error);
      toast.error("Failed to load mock test questions");
      if (myRequestId === requestIdRef.current) {
        const completedQuestions = loadedQuestions
          .filter((question) => !question.isStreaming && question.question?.trim())
          .map(({ question, difficulty }) => ({ question, difficulty }));
        setQuestions(completedQuestions);
        await persistPreparationSnapshot({
          filters: activeFilters,
          roundId: activeRound.id,
          roundName: activeRound.name,
          questions: completedQuestions,
          startedAt: preparationStartedAtRef.current,
        });
      }
      return null;
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }, [persistPreparationSnapshot]);

  useEffect(() => {
    let active = true;

    const restorePreparation = async () => {
      try {
        const saved = await loadMockTestPreparation();
        if (!active || !saved) return;

        const { filters: savedFilters, roundId, questions: savedQuestions } = saved;
        const initialConfig = initialConfigRef.current;
        const matchesCurrentConfig = savedFilters &&
          ["company", "role", "difficulty", "type", "count"].every(
            (key) => savedFilters[key] === initialConfig.filters[key]
          ) &&
          roundId === initialConfig.round.id;

        if (!matchesCurrentConfig || !Array.isArray(savedQuestions)) {
          await clearMockTestPreparation();
          return;
        }

        const validQuestions = savedQuestions
          .filter((item) =>
            item &&
            typeof item.question === "string" &&
            item.question.trim() &&
            !item.isStreaming
          )
          .slice(0, Number(savedFilters.count));
        if (!validQuestions.length) {
          await clearMockTestPreparation();
          return;
        }

        const startedAt = Number.isFinite(saved.startedAt) ? saved.startedAt : saved.savedAt;
        preparationConfigRef.current = {
          filters: savedFilters,
          round: initialConfig.round,
        };
        preparationStartedAtRef.current = Number.isFinite(startedAt) ? startedAt : Date.now();
        estimateStartedAtRef.current = null;
        estimateStartingQuestionCountRef.current = validQuestions.length;
        setElapsedSeconds(0);
        setQuestions(validQuestions);
      } catch (error) {
        console.error("Could not restore mock-test preparation:", error);
        toast.warning("Saved mock-test progress could not be restored.");
      } finally {
        if (active) setIsCheckingSavedPreparation(false);
      }
    };

    restorePreparation();
    return () => {
      active = false;
    };
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setQuestions([]);
    preparationConfigRef.current = null;
    clearMockTestPreparation().catch((error) => {
      console.error("Could not clear previous mock-test preparation:", error);
    });

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
    if (isStartingTest || isCheckingSavedPreparation) return;

    if (!isPreparingTest) {
      const activeFilters = { ...filters };
      const activeRound = selectedTestType;
      testStartedRef.current = false;
      preparationConfigRef.current = { filters: activeFilters, round: activeRound };
      notificationPermissionRequestRef.current = requestReadyNotificationPermission();
      notificationPermissionRequestRef.current.then((granted) => {
        if (!granted) {
          toast.info("Browser notifications are unavailable or blocked. You'll still see an in-app alert when the test is ready.");
        }
      });
      await loadQuestions(activeFilters, activeRound);
      return;
    }

    if (!canStartTest) return;

    const shouldResumeQuestionLoading = !loading && loadedQuestionCount < targetQuestionCount;
    const savedQuestions = questions.filter(
      (question) => !question.isStreaming && question.question?.trim()
    );
    setIsStartingTest(true);
    try {
      const activeFilters = preparationConfigRef.current?.filters || { ...filters };
      const activeRound = preparationConfigRef.current?.round || selectedTestType;
      const response = await startInterviewModeSessionAction({
        mode: "mock-test",
        details: {
          company: activeFilters.company,
          role: activeFilters.role,
          difficulty: activeFilters.difficulty,
          type: activeRound.name,
          roundId: activeRound.id,
          roundName: activeRound.name,
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
      testStartedRef.current = true;
      clearMockTestPreparation().catch((error) => {
        console.error("Could not clear prepared questions after test start:", error);
      });
      if (shouldResumeQuestionLoading && savedQuestions.length > 0) {
        void loadQuestions(activeFilters, activeRound, savedQuestions);
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

  const handleResumeQuestionLoad = async () => {
    if (loading || isStartingTest || isCheckingSavedPreparation) return;
    const savedConfig = preparationConfigRef.current;
    if (!savedConfig) return;

    notificationPermissionRequestRef.current = requestReadyNotificationPermission();
    notificationPermissionRequestRef.current.then((granted) => {
      if (!granted) {
        toast.info("Browser notifications are unavailable or blocked. You'll still see an in-app alert when the test is ready.");
      }
    });
    await loadQuestions(
      savedConfig.filters,
      savedConfig.round,
      questions.filter((question) => !question.isStreaming && question.question?.trim())
    );
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
        questionCount={Number(preparationConfigRef.current?.filters.count || filters.count)}
        isLoadingQuestions={loading}
        sessionId={activeSessionId}
        onResumeQuestions={handleResumeQuestionLoad}
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
                    disabled={isCheckingSavedPreparation || isStartingTest || (isPreparingTest && !canStartTest)}
                    className="btn-primary flex items-center gap-2 px-6 py-2.5"
                  >
                    <Play size={16} />
                    {isCheckingSavedPreparation
                      ? "Checking saved progress..."
                      : isStartingTest
                      ? "Starting..."
                      : loading && !canStartTest
                      ? "Preparing Test..."
                      : isPreparingTest && canStartTest
                      ? `Start Test (${loadedQuestionCount}/${targetQuestionCount})`
                      : isPreparingTest
                      ? "Start Test"
                      : "Quick Start Test"}
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
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Recent Mock Test Results</h2>
          {recentResults.length > 2 && (
            <Button
              variant="outline"
              onClick={() => setShowAllResults((current) => !current)}
              className="shrink-0"
            >
              {showAllResults ? "Show recent only" : "View all results"}
            </Button>
          )}
        </div>
        {recentResults.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {(showAllResults ? recentResults : recentResults.slice(0, 2)).map((session) => (
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

              <fieldset disabled={loading || isStartingTest || isCheckingSavedPreparation} className="p-6 space-y-5 disabled:opacity-70">
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
                  disabled={isCheckingSavedPreparation || isStartingTest || (isPreparingTest && !canStartTest)}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 px-4 mt-4 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Play size={16} />
                  {isCheckingSavedPreparation
                    ? "Checking saved progress..."
                    : isStartingTest
                    ? "Starting..."
                    : loading && !canStartTest
                    ? "Preparing Test..."
                    : isPreparingTest && canStartTest
                    ? `Start Test (${loadedQuestionCount}/${targetQuestionCount})`
                    : isPreparingTest
                    ? "Start Test"
                    : "Start Test Now"}
                </button>
              </fieldset>
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

        {isPreparingTest && (
          <section className="mb-10 rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    {loading ? "Step 1 · Preparing" : "Step 2 · Ready"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isOnline ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                    Internet {isOnline ? "connected" : "offline"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {preparationStage}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {loading
                    ? loadedQuestionCount === 0
                      ? "Selecting your questions now. We'll enable Start Test as soon as the first one is ready."
                      : loadedQuestionCount < targetQuestionCount
                      ? `Your test is being prepared. You can start with the ${loadedQuestionCount} ready ${loadedQuestionCount === 1 ? "question" : "questions"} or wait for the full set.`
                      : "All questions are ready. Finishing the test setup."
                    : loadedQuestionCount < targetQuestionCount
                    ? "Saved progress restored. Resume question loading or start with the questions already ready."
                    : "Questions are ready. Start when you feel prepared."}
                </p>
              </div>
              {!loading && loadedQuestionCount < targetQuestionCount && (
                <Button
                  onClick={handleResumeQuestionLoad}
                  disabled={isStartingTest || isCheckingSavedPreparation}
                  variant="outline"
                  className="shrink-0"
                >
                  Resume question loading
                </Button>
              )}
              {canStartTest && (
                <Button
                  onClick={handleStartTest}
                  disabled={isStartingTest || isCheckingSavedPreparation}
                  className="btn-primary shrink-0"
                >
                  <Play size={16} />
                  {isStartingTest ? "Starting..." : `Start Test (${loadedQuestionCount}/${targetQuestionCount})`}
                </Button>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  Loaded {loadedQuestionCount} / {targetQuestionCount} questions
                </span>
                <span className="font-semibold text-primary">
                  {loading ? remainingTimeLabel : `${questionProgress}% complete`}
                </span>
              </div>
              <div
                className="relative h-3 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label="Mock test question generation progress"
                aria-valuemin={0}
                aria-valuemax={targetQuestionCount}
                aria-valuenow={loadedQuestionCount}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                  style={{ width: `${questionProgress}%` }}
                />
                {loading && questionProgress < 100 && (
                  <div
                    className="absolute bottom-0 top-0 rounded-full bg-primary/30 animate-pulse"
                    style={{
                      left: `${questionProgress}%`,
                      width: `${Math.min(12, 100 - questionProgress)}%`,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
              {loading && loadedQuestionCount > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Time estimate is based on the questions generated so far and may change.
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <h3 className="text-sm font-bold text-foreground">Test instructions</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Answer each question before moving on. You can review previous questions, and submit the full test when every answer is ready.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <h3 className="text-sm font-bold text-foreground">Marking scheme</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Responses are assessed for correctness, clarity, problem-solving approach, technical depth, and how well you explain trade-offs.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <h3 className="text-sm font-bold text-foreground">Helpful tip</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Explain your reasoning as you work. This practice test is not proctored, so camera and microphone access are not required.
                </p>
              </div>
            </div>

            {loading && (
              <div className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4" aria-live="polite">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">Quick tip</p>
                  <p className="mt-2 min-h-10 text-sm font-medium text-foreground">
                    {PREPARATION_TIPS[preparationTipIndex]}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Wind size={16} className="text-primary" />
                        Calm your nerves
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isBreathing
                          ? breathingSeconds === 0
                            ? "Nice work. You're ready when you are."
                            : (30 - breathingSeconds) % 12 < 4
                            ? "Breathe in slowly"
                            : (30 - breathingSeconds) % 12 < 6
                            ? "Hold gently"
                            : "Breathe out slowly"
                          : "Try a guided 30-second breathing reset."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startBreathingExercise}
                      className="shrink-0 rounded-lg border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10"
                    >
                      {isBreathing ? `${breathingSeconds}s left` : breathingSeconds === 0 ? "Again" : "Start"}
                    </button>
                  </div>
                  <div className="mt-4 flex h-14 items-center justify-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ${isBreathing ? "ring-4 ring-primary/10" : ""}`}
                      style={{
                        transform: isBreathing && (30 - breathingSeconds) % 12 < 6 ? "scale(1.2)" : "scale(0.85)",
                        transition: "transform 2s ease-in-out",
                      }}
                      aria-hidden="true"
                    >
                      {isBreathing ? breathingSeconds : "Breathe"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* QUESTIONS LIST */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-1 tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>Practice Questions</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {loadedQuestionCount} of {targetQuestionCount} questions loaded for {filters.company} - {filters.role} ({filters.difficulty})
          </p>

          {isPreparingTest && loadedQuestionCount < targetQuestionCount ? (
            <div
              className="grid animate-pulse grid-cols-1 gap-4 py-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]"
              aria-label="Test workspace loading"
            >
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-5 h-3 w-1/3 rounded bg-muted" />
                <div className="mb-3 h-5 w-4/5 rounded bg-muted" />
                <div className="mb-2 h-3 w-full rounded bg-muted" />
                <div className="mb-6 h-3 w-2/3 rounded bg-muted" />
                <div className="mb-3 h-9 w-full rounded bg-muted" />
                <div className="h-9 w-full rounded bg-muted" />
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((item) => (
                      <div key={item} className="h-5 w-5 rounded-full bg-muted" />
                    ))}
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-5/6 rounded bg-muted" />
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="mt-6 h-24 rounded-lg bg-muted" />
                </div>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
              <p className="text-muted-foreground mb-4">
                Questions will be generated when you start the test.
              </p>
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
            </div>
          )}
        </div>
      </section>
    </div>
  );
}