"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getAllDays } from "../constants/hundredDaysOfCode";
import { getQuestionTestCases, hasQuestionTestCases } from "../constants/dsaTestCaseBank";

const LANGUAGE_OPTIONS = ["javascript", "python", "cpp", "java"];

const DEFAULT_STARTER = {
  javascript: "// Write your solution here\n",
  python: "# Write your solution here\n",
  cpp: "// Write your solution here\n",
  java: "// Write your solution here\n",
};

const pickRandomQuestions = (questions, count) => {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const DSARoomManager = ({ 
  socket, 
  roomId, 
  roomCode, 
  userId, 
  username, 
  isOwner,
  onGameStart 
}) => {
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [questionMode, setQuestionMode] = useState("same");
  const [startCountdown, setStartCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showLoadingArena, setShowLoadingArena] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCopyNotice, setShowCopyNotice] = useState(false);
  const [submissionFeed, setSubmissionFeed] = useState([]);
  const [gameActivity, setGameActivity] = useState([]);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [language, setLanguage] = useState("javascript");
  const [codeByQuestion, setCodeByQuestion] = useState({});
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // ✅ FIX: Track approval state for non-owners
  const [isApproved, setIsApproved] = useState(isOwner); // owner is always approved

  const countdownStartedRef = useRef(false);

  // ─────────────────────────────────────────────
  // SOCKET LISTENERS
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    console.log("[DSA Room] Joining socket room:", roomId, "as user:", userId);
    socket.emit("join_room_socket", { roomId, userId, username });

    socket.on("members_list", (data) => {
      console.log("[DSA Room] Members list:", data);
      setMembers(data.approved || []);
      setPendingRequests(data.pending || []);
      setPendingApprovals(data.pending || []);

      // ✅ FIX: If non-owner appears in approved list, mark them approved
      if (!isOwner) {
        const selfInApproved = (data.approved || []).find((m) => m.userId === userId);
        if (selfInApproved) {
          setIsApproved(true);
        }
      }
    });

    socket.on("room_state", (data) => {
      console.log("[DSA Room] Room state:", data);
      if (data.success) {
        setMembers(data.members || []);
        setPendingRequests(data.pending || []);
        setPendingApprovals(data.pending || []);

        // ✅ FIX: Check approval status in room_state too
        if (!isOwner) {
          const selfInMembers = (data.members || []).find((m) => m.userId === userId);
          if (selfInMembers) {
            setIsApproved(true);
          }
        }
      }
    });

    socket.on("member_joined", (data) => {
      console.log("[DSA Room] New member:", data);
      setMembers((prev) => {
        // avoid duplicates
        if (prev.find((m) => m.userId === data.userId)) return prev;
        return [...prev, data];
      });
      toast.success(`${data.username} joined the room`);
    });

    socket.on("member_request", (data) => {
      console.log("[DSA Room] Member request:", data);
      setPendingRequests((prev) => [...prev, data]);
      toast.info(`${data.username} requests to join`);
    });

    // ✅ FIX: Listen for personal approval confirmation (server must emit this to the approved socket)
    socket.on("member_approved", (data) => {
      console.log("[DSA Room] ✓ I was approved!", data);
      setIsApproved(true);
      toast.success("You've been approved! Welcome to the room 🎉");

      // Re-fetch fresh room state now that we're a real member
      socket.emit("get_room_state", { roomId });
    });

    // ✅ FIX: Listen for rejection too so UI can reflect it
    socket.on("member_rejected", (data) => {
      console.log("[DSA Room] Request rejected", data);
      toast.error("Your join request was rejected.");
    });

    socket.on("game_starting", (data) => {
      console.log("[DSA Room] ✓ game_starting:", data.questions?.length, "questions");
      if (socket.timeoutId) {
        clearTimeout(socket.timeoutId);
        socket.timeoutId = null;
      }
      setGameStarted(true);
      setStartCountdown(5);
      setQuestions(data.questions || []);
      setLeaderboard(data.leaderboard || []);
      if (onGameStart) onGameStart(data);
    });

    socket.on("game_started", (data) => {
      console.log("[DSA Room] ✓ game_started:", data.questions?.length, "questions");
      if (socket.timeoutId) {
        clearTimeout(socket.timeoutId);
        socket.timeoutId = null;
      }
      setGameStarted(true);
      setStartCountdown(5);
      setQuestions(data.questions || []);
      setLeaderboard(data.leaderboard || []);
      if (onGameStart) onGameStart(data);
    });

    socket.on("leaderboard_update", (data) => {
      console.log("[DSA Room] Leaderboard update:", data);
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard);
        if (data.updatedPlayer) {
          const player = data.updatedPlayer;
          if (player.status === "completed") {
            toast.success(`${player.username} solved! +${player.points} pts`, { duration: 3000 });
          }
        }
      }
    });

    socket.on("submission_notification", (data) => {
      console.log("[DSA Room] Submission notification:", data);
      if (data.type === "success") {
        toast.success(data.message, { duration: 5000 });
        setGameActivity((prev) => [
          { id: `${Date.now()}_${Math.random()}`, type: "success", message: data.message, timestamp: new Date(), icon: data.icon },
          ...prev,
        ].slice(0, 10));
      } else {
        setGameActivity((prev) => [
          { id: `${Date.now()}_${Math.random()}`, type: "attempt", message: data.message, timestamp: new Date(), icon: data.icon },
          ...prev,
        ].slice(0, 10));
      }
    });

    return () => {
      socket.off("members_list");
      socket.off("member_joined");
      socket.off("member_request");
      socket.off("member_approved");   // ✅ cleanup
      socket.off("member_rejected");   // ✅ cleanup
      socket.off("game_starting");
      socket.off("game_started");
      socket.off("leaderboard_update");
      socket.off("submission_notification");
      socket.off("room_state");
    };
  }, [socket, roomId, userId, username, onGameStart, isOwner]);

  // ─────────────────────────────────────────────
  // Request room state on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;
    console.log("[DSA Room] Requesting room state for:", roomId);
    socket.emit("get_room_state", { roomId });
  }, [socket, roomId]);

  // ─────────────────────────────────────────────
  // ✅ FIX: Poll room state every 3s for non-owners who are not yet approved
  // This is a safety net in case member_approved event is missed
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId || isOwner || isApproved || gameStarted) return;

    const interval = setInterval(() => {
      console.log("[DSA Room] Polling room state (waiting for approval)...");
      socket.emit("get_room_state", { roomId });
    }, 3000);

    return () => clearInterval(interval);
  }, [socket, roomId, isOwner, isApproved, gameStarted]);

  // ─────────────────────────────────────────────
  // Countdown logic
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (startCountdown === null || startCountdown === undefined) return;
    countdownStartedRef.current = true;
    if (startCountdown <= 0) {
      setStartCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setStartCountdown((prev) => {
        if (prev === null || typeof prev !== "number") return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [startCountdown]);

  useEffect(() => {
    if (gameStarted && startCountdown === null) {
      setShowLoadingArena(true);
    }
  }, [gameStarted, startCountdown]);

  useEffect(() => {
    if (!countdownStartedRef.current) return;
    if (startCountdown !== null) return;
    if (gameStarted) return;
    const fallbackTimer = setTimeout(() => {
      console.log("[DSA Room] Fallback: Forcing game started after countdown");
      setGameStarted(true);
    }, 500);
    return () => clearTimeout(fallbackTimer);
  }, [startCountdown, gameStarted]);

  // ─────────────────────────────────────────────
  // OWNER: Approve / Reject members
  // ─────────────────────────────────────────────
  const handleApproveMember = (requestId, memberId, memberUsername) => {
    if (!socket) return;

    socket.emit("approve_member", { requestId, memberId, roomId });

    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    setMembers((prev) => {
      if (prev.find((m) => m.userId === memberId)) return prev;
      return [...prev, { userId: memberId, username: memberUsername, joinedAt: new Date() }];
    });
    toast.success(`${memberUsername} approved!`);
  };

  const handleRejectMember = (requestId) => {
    if (!socket) return;
    socket.emit("reject_member", { requestId, roomId });
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    toast.info("Member request rejected");
  };

  // ─────────────────────────────────────────────
  // OWNER: Start game
  // ─────────────────────────────────────────────
  const handleStartGame = () => {
    if (!socket || !isOwner) return;

    const totalPlayers = members.length + 1;
    if (totalPlayers < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }

    const allDays = getAllDays();
    const questionPool = allDays.flatMap((day) =>
      (day.questions || []).map((q) => ({
        ...q,
        sourceDay: day.day,
        hiddenTestCases: getQuestionTestCases(q),
      }))
    );
    const judgeableQuestions = questionPool.filter((q) => hasQuestionTestCases(q));
    const dayQuestions = pickRandomQuestions(judgeableQuestions, 3);

    if (dayQuestions.length === 0) {
      toast.error("No judgeable questions found from 100 days source");
      return;
    }

    console.log("[DSA Room] Owner emitting start_game with", dayQuestions.length, "questions");
    socket.emit("start_game", {
      roomId,
      questionMode,
      startTime: Date.now(),
      questions: dayQuestions,
    });

    const fallbackTimer = setTimeout(() => {
      console.log("[DSA Room] Server response timeout - starting game locally as fallback");
      toast.warning("Starting game locally (server delayed)");
      setGameStarted(true);
      setStartCountdown(5);
      setQuestions(dayQuestions);

      const localLeaderboard = [
        { userId, username, points: 0, solved: 0, isOwner: true, status: "idle" },
        ...members.map((m) => ({
          userId: m.userId,
          username: m.username,
          points: 0,
          solved: 0,
          isOwner: false,
          status: "idle",
        })),
      ];
      setLeaderboard(localLeaderboard);
    }, 7000);

    socket.timeoutId = fallbackTimer;
  };

  // ─────────────────────────────────────────────
  // CODE EDITOR helpers
  // ─────────────────────────────────────────────
  const activeQuestion = questions[selectedQuestionIdx];
  const activeQuestionId = activeQuestion?.id || `q_${selectedQuestionIdx}`;

  const getCurrentCode = () => {
    if (!activeQuestion) return "";
    if (codeByQuestion[activeQuestionId]?.[language]) {
      return codeByQuestion[activeQuestionId][language];
    }
    return activeQuestion?.starterCode?.[language] || DEFAULT_STARTER[language] || "// Write your solution\n";
  };

  const getLanguageId = (lang) => {
    const langMap = { javascript: "javascript", python: "python3", cpp: "cpp", java: "java" };
    return langMap[lang] || "javascript";
  };

  const executePiston = async (code, testCases, lang) => {
    try {
      const languageId = getLanguageId(lang);
      const results = [];
      let passedCount = 0;

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        try {
          const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: languageId,
              version: "*",
              files: [
                {
                  name: `solution.${languageId === "cpp" ? "cpp" : languageId === "java" ? "java" : languageId === "python3" ? "py" : "js"}`,
                  content: code,
                },
              ],
              stdin: testCase.input || "",
            }),
          });

          if (!response.ok) {
            results.push({ testCase: i + 1, status: "ERROR", error: "Piston API error", expected: testCase.output, actual: "ERROR" });
            continue;
          }

          const data = await response.json();
          const output = data.run?.output?.trim() || "";
          const expected = testCase.output?.trim() || "";
          const passed = output === expected;
          if (passed) passedCount++;

          results.push({
            testCase: i + 1,
            status: passed ? "PASSED" : "FAILED",
            expected,
            actual: output,
            runtime: data.run?.stdout ? "Executed" : "No output",
          });
        } catch (error) {
          results.push({ testCase: i + 1, status: "ERROR", error: error.message, expected: testCase.output, actual: "ERROR" });
        }
      }

      return { passed: passedCount === testCases.length, passedCount, totalCount: testCases.length, testResults: results };
    } catch (error) {
      console.error("[Piston] Execution error:", error);
      return {
        passed: false,
        passedCount: 0,
        totalCount: testCases.length || 1,
        testResults: [{ testCase: 1, status: "ERROR", error: error.message, expected: "N/A", actual: "ERROR" }],
      };
    }
  };

  const handleCodeChange = (value) => {
    if (!activeQuestion) return;
    setCodeByQuestion((prev) => ({
      ...prev,
      [activeQuestionId]: { ...(prev[activeQuestionId] || {}), [language]: value },
    }));
  };

  const handleSubmitCode = async () => {
    if (!socket || !activeQuestion) return;
    const sourceCode = getCurrentCode();
    if (!sourceCode.trim()) { toast.error("Code cannot be empty"); return; }

    setIsSubmittingCode(true);
    setSubmissionResult(null);

    try {
      const testCases = activeQuestion.hiddenTestCases || [];
      if (testCases.length === 0) {
        toast.error("No test cases available for this problem");
        setIsSubmittingCode(false);
        return;
      }

      console.log("[Piston] Executing code with", testCases.length, "test cases");
      const executionResult = await executePiston(sourceCode, testCases, language);
      console.log("[Piston] Execution result:", executionResult);

      setSubmissionResult(executionResult);

      if (executionResult.passed) {
        toast.success("All test cases passed! +100 pts");
        setQuestions((prev) =>
          prev.map((q, idx) => (idx === selectedQuestionIdx ? { ...q, solved: true } : q))
        );
      } else {
        toast.error(`${executionResult.totalCount - executionResult.passedCount} test case(s) failed`);
      }

      socket.emit(
        "code_submit",
        { roomId, userId, username, questionId: activeQuestion.id || activeQuestionId, sourceCode, language, executionResult },
        (response) => {
          console.log("[Socket] Code submit response:", response);
          if (!response?.success) console.warn("[Socket] Submission failed:", response?.error);
        }
      );
    } catch (error) {
      console.error("[Submit] Error:", error);
      toast.error("Submission error: " + error.message);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setShowCopyNotice(true);
      setTimeout(() => setShowCopyNotice(false), 2000);
      toast.success("Room code copied!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  // ─────────────────────────────────────────────
  // GAME VIEW
  // ─────────────────────────────────────────────
  if (gameStarted) {
    if (startCountdown !== null && startCountdown > 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              BABYLON DSA
            </h1>
            <div className="text-9xl font-mono font-black text-cyan-400 mb-8 animate-pulse">
              {startCountdown}
            </div>
            <p className="text-2xl font-bold text-purple-300 mb-4">Get Ready for Battle!</p>
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
              <span>Starting Arena in {startCountdown} seconds...</span>
            </div>
          </div>
        </div>
      );
    }

    if (!showLoadingArena) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-6 animate-spin">⟳</div>
            <h2 className="text-3xl font-black text-cyan-400 mb-4">ENTERING ARENA...</h2>
            <p className="text-slate-400">Loading your battle arena...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6">
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                BABYLON DSA ARENA
              </h1>
              <p className="text-cyan-300/70 text-sm mt-2">Real-time algorithmic combat</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-emerald-400 font-black">22:55</div>
              <div className="text-xs text-emerald-300">TIME REMAINING</div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Questions Panel */}
          <div className="w-[30%] min-w-[320px] bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">◆</div>
              <div>
                <h2 className="text-2xl font-black text-cyan-400">PROBLEMS</h2>
                <div className="text-xs text-cyan-300/50">{questions.length} CHALLENGES</div>
              </div>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-slate-900/50">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedQuestionIdx(idx)}
                  className={`p-4 bg-gradient-to-r from-slate-800/60 to-slate-800/30 rounded-lg border transition hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer group ${
                    selectedQuestionIdx === idx
                      ? "border-cyan-400/80 ring-1 ring-cyan-400/50"
                      : "border-purple-500/40 hover:border-cyan-400/60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-lg group-hover:scale-110 transition">#</div>
                      <h3 className="font-bold text-slate-100 group-hover:text-cyan-300 transition">{q.title}</h3>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ml-2 ${
                        q.difficulty === "easy"
                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50"
                          : q.difficulty === "medium"
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                          : "bg-red-500/30 text-red-300 border border-red-500/50"
                      }`}
                    >
                      {q.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition">{q.description}</p>
                  {q.solved && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      YOU SOLVED THIS
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Problem + Editor */}
          <div className="flex-1 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-emerald-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-emerald-500/10">
            {activeQuestion ? (
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-emerald-300">{activeQuestion.title}</h3>
                      <p className="text-sm text-slate-300 mt-2">{activeQuestion.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {activeQuestion.leetcodeUrl && (
                          <a
                            href={activeQuestion.leetcodeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 hover:text-cyan-200"
                          >
                            LeetCode Link
                          </a>
                        )}
                        {activeQuestion.sourceDay && (
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            Day {activeQuestion.sourceDay}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {(activeQuestion.difficulty || "medium").toUpperCase()}
                    </span>
                  </div>
                </div>

                {(activeQuestion.examples?.length || 0) > 0 && (
                  <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                    <div className="text-xs font-bold text-slate-400 mb-2">EXAMPLES</div>
                    <div className="space-y-2">
                      {activeQuestion.examples.map((ex, idx) => (
                        <div key={idx} className="text-xs text-slate-300 font-mono">
                          <div>Input: {ex.input}</div>
                          <div>Output: {ex.output}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(activeQuestion.constraints?.length || 0) > 0 && (
                  <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                    <div className="text-xs font-bold text-slate-400 mb-2">CONSTRAINTS</div>
                    <div className="text-xs text-slate-300 space-y-1">
                      {activeQuestion.constraints.map((constraint, idx) => (
                        <div key={idx}>• {constraint}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-400">LANGUAGE</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                    >
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSubmitCode}
                    disabled={isSubmittingCode}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 rounded font-bold text-sm disabled:opacity-60"
                  >
                    {isSubmittingCode ? "Judging..." : "Submit (Piston)"}
                  </button>
                </div>

                <textarea
                  value={getCurrentCode()}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="flex-1 min-h-[240px] bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  spellCheck={false}
                />

                {submissionResult && (
                  <div className={`mt-3 rounded-lg border p-3 text-sm ${
                    submissionResult.passed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}>
                    <div className="font-bold mb-2">
                      {submissionResult.passed
                        ? "✓ All tests passed!"
                        : `✗ ${submissionResult.totalCount - submissionResult.passedCount}/${submissionResult.totalCount} test(s) failed`}
                    </div>
                    {submissionResult.testResults?.length > 0 && (
                      <div className="mt-2 text-xs space-y-2">
                        {submissionResult.testResults.map((result, idx) => (
                          <div key={idx} className="border-t border-current pt-1 opacity-80">
                            <div className="font-semibold flex items-center gap-2">
                              <span>{result.status === "PASSED" ? "✓" : "✗"}</span>
                              Test Case {result.testCase}: {result.status}
                            </div>
                            {result.status !== "PASSED" && (
                              <div className="mt-1 ml-4 space-y-1">
                                <div>Expected: <span className="font-mono">{result.expected || "empty"}</span></div>
                                <div>Got: <span className="font-mono">{result.actual || "error"}</span></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Waiting for questions...
              </div>
            )}
          </div>

          {/* Leaderboard & Activity Panel */}
          <div className="w-96 space-y-6">
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-pink-500/30 p-6 backdrop-blur-sm sticky top-6 h-fit shadow-2xl shadow-pink-500/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl animate-bounce">★</div>
                <div>
                  <h2 className="text-2xl font-black text-pink-400">LEADERBOARD</h2>
                  <div className="text-xs text-pink-300/50">{leaderboard.length} COMPETITORS</div>
                </div>
              </div>
              <div className="space-y-2">
                {leaderboard.map((member, idx) => (
                  <div
                    key={member.userId}
                    className={`p-3 rounded-lg border transition backdrop-blur-sm ${
                      member.userId === userId
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800/50 border-pink-500/30 hover:border-pink-400/60"
                    } flex items-center justify-between group cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-yellow-500/50" :
                        idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-slate-950 shadow-lg shadow-gray-400/50" :
                        idx === 2 ? "bg-gradient-to-br from-orange-400 to-red-500 text-slate-950 shadow-lg shadow-orange-500/50" :
                        "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                      }`}>
                        {idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `#${idx + 1}`}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition">
                          {member.username}
                          {member.isOwner && <span className="ml-1 text-xs text-purple-300">[Owner]</span>}
                          {member.userId === userId && <span className="ml-1 text-xs text-cyan-300">(YOU)</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {member.status === "completed" ? "COMPLETED" : "IN PROGRESS"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-pink-400">{member.points || 0}</div>
                      <div className="text-xs text-pink-300/50 font-bold">PTS</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {pendingApprovals && pendingApprovals.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <span>⏳</span> Waiting for Approval ({pendingApprovals.length})
                </div>
                <div className="space-y-2">
                  {pendingApprovals.map((user) => (
                    <div
                      key={user.userId}
                      className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-between hover:border-orange-500 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center text-xs">U</div>
                        <div>
                          <div className="text-sm font-bold text-slate-100">{user.username}</div>
                          <div className="text-xs text-slate-400">
                            {user.requestedAt ? new Date(user.requestedAt).toLocaleTimeString() : "Just now"}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-orange-300 font-semibold">PENDING</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // LOBBY VIEW
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Room Info */}
        <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">BABYLON DSA</h1>
              <p className="text-cyan-300/70 text-sm mt-2">Member verification & game lobby</p>
            </div>
            {isOwner && (
              <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500 rounded-full text-emerald-300 text-xs font-bold">
                Room Owner
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="text-xs text-cyan-300/70 font-bold mb-2">ROOM CODE</div>
              <div className="text-4xl font-mono font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-wider">{roomCode}</div>
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg font-bold text-sm transition h-fit shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70"
            >
              {showCopyNotice ? "✓ COPIED!" : "COPY"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="text-lg">U</span>
              <div>
                <div className="text-sm font-bold text-cyan-300">{members.length + 1} MEMBERS</div>
                {isOwner && pendingRequests.length > 0 && (
                  <div className="text-xs text-purple-300/70">{pendingRequests.length} PENDING APPROVAL</div>
                )}
              </div>
            </div>
            {isOwner && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 rounded-full">
                <span>Owner</span>
                <span className="text-xs font-bold text-purple-300">ROOM OWNER</span>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests (Owner Only) */}
        {isOwner && pendingRequests.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-pink-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-pink-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl animate-bounce">●</div>
              <div>
                <h2 className="text-2xl font-black text-pink-400">PENDING REQUESTS</h2>
                <div className="text-xs text-pink-300/50">{pendingRequests.length} AWAITING APPROVAL</div>
              </div>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-gradient-to-r from-slate-800/60 to-slate-800/30 rounded-lg border border-pink-500/40 hover:border-pink-400/60 transition flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-100 group-hover:text-pink-300 transition">{req.username}</div>
                    <div className="text-xs text-slate-400">Requesting to join</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveMember(req.id, req.userId, req.username)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectMember(req.id)}
                      className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/40 rounded text-sm font-medium transition text-red-300"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="mb-8 bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-xl font-bold mb-4">Members ({members.length + 1})</h2>
          <div className="space-y-2 mb-4">
            <div className="p-3 bg-slate-800 rounded-lg border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold">O</div>
                <div>
                  <div className="font-bold text-slate-100">{username}</div>
                  <div className="text-xs text-slate-400">Room Owner</div>
                </div>
              </div>
              <span className="text-xs text-emerald-300">You</span>
            </div>

            {members.map((member) => (
              <div
                key={member.userId}
                className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">✓</div>
                  <div>
                    <div className="font-bold text-slate-100">{member.username}</div>
                    <div className="text-xs text-slate-400">Member</div>
                  </div>
                </div>
                <span className="text-xs text-emerald-300">Joined</span>
              </div>
            ))}
          </div>
        </div>

        {/* Owner Controls */}
        {isOwner && (
          <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-purple-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-purple-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">⚙️</div>
              <div>
                <h2 className="text-2xl font-black text-purple-400">GAME SETTINGS</h2>
                <div className="text-xs text-purple-300/50">CUSTOMIZE YOUR BATTLEFIELD</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-black text-purple-300 mb-3 tracking-wider">QUESTION MODE</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setQuestionMode("same")}
                  className={`p-4 rounded-lg border-2 transition ${
                    questionMode === "same"
                      ? "border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/30"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-cyan-500/60"
                  }`}
                >
                  <div className="font-bold text-sm mb-1">SAME QUESTION</div>
                  <div className="text-xs text-slate-400">Everyone solves identical problems</div>
                </button>
                <button
                  onClick={() => setQuestionMode("different")}
                  className={`p-4 rounded-lg border-2 transition ${
                    questionMode === "different"
                      ? "border-pink-400 bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-lg shadow-pink-500/30"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-pink-500/60"
                  }`}
                >
                  <div className="font-bold text-sm mb-1">DIFFERENT QUESTION</div>
                  <div className="text-xs text-slate-400">Unique problems for each player</div>
                </button>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              disabled={members.length + 1 < 2}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:via-green-400 hover:to-emerald-500 text-white rounded-xl font-black transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/70"
            >
              {startCountdown !== null ? (
                <>
                  <span className="text-2xl animate-spin">⟳</span>
                  <span>STARTING IN {startCountdown}S</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">▶</span>
                  <span>START ARENA BATTLE</span>
                </>
              )}
            </button>

            {members.length + 1 < 2 && (
              <div className="mt-3 text-xs text-slate-400 text-center font-semibold">
                ⏳ AWAITING PLAYERS... (Need 2+ members)
              </div>
            )}
          </div>
        )}

        {/* ✅ FIX: Waiting for Approval — non-owner, not yet approved */}
        {!isOwner && !isApproved && !gameStarted && (
          <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-orange-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-orange-500/10">
            <div className="text-center">
              <div className="text-6xl mb-6 animate-bounce">⏳</div>
              <h2 className="text-3xl font-black text-orange-400 mb-3">Waiting for Approval</h2>
              <p className="text-orange-300/70 text-sm mb-6">
                Your request to join has been sent to the room owner. Please wait for approval.
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0s" }}></div>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ FIX: Approved and waiting for game to start */}
        {!isOwner && isApproved && !gameStarted && (
          <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
            <div className="text-center">
              <div className="text-6xl mb-6 animate-pulse">✓</div>
              <h2 className="text-3xl font-black text-cyan-400 mb-3">Approved! Ready for Battle</h2>
              <p className="text-cyan-300/70 text-sm">
                You're in the room. Waiting for the owner to start the game...
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DSARoomManager;
