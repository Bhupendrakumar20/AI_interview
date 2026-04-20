/**
 * DSA Room — Live Coding Component
 * ─────────────────────────────────
 * Real-time multiplayer DSA competitive coding with:
 *  • Monaco Editor + language switching
 *  • Server-synced timer
 *  • Real-time leaderboard
 *  • First blood celebrations
 *  • Post-match code review dashboard
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

let socketInstance = null;
function getSocket() {
  if (!socketInstance) {
    socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_IO_URL || "http://localhost:4001",
      { autoConnect: false, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000 }
    );
  }
  return socketInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { id: "javascript", label: "JS", monacoLang: "javascript" },
  { id: "python", label: "Python", monacoLang: "python" },
  { id: "java", label: "Java", monacoLang: "java" },
  { id: "cpp", label: "C++", monacoLang: "cpp" },
];

const STARTER_CODE = {
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function solve(nums, target) {
  // Your solution here
  return [];
}`,
  python: `def solve(nums: list[int], target: int) -> list[int]:
    # Your solution here
    return []`,
  java: `class Solution {
    public int[] solve(int[] nums, int target) {
        // Your solution here
        return new int[]{};
    }
}`,
  cpp: `#include <vector>
using namespace std;

vector<int> solve(vector<int>& nums, int target) {
    // Your solution here
    return {};
}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TimerBar({ remaining, total }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const urgent = remaining <= 120;
  const critical = remaining <= 30;
  const color = critical ? "#f87171" : urgent ? "#fbbf24" : "#4f8fff";

  return (
    <div className="flex-1 flex flex-col gap-1 px-4">
      <div className="flex items-baseline gap-2">
        <span style={{ color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
          {critical ? "⚠ " : "⏱ "}
          {formatTime(remaining)}
        </span>
        <span style={{ color: "#9ca3af", fontSize: 11 }}>remaining</span>
      </div>
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: critical
              ? "linear-gradient(90deg, #f87171, #ef4444)"
              : urgent
              ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
              : "linear-gradient(90deg, #4f8fff, #a78bfa)",
          }}
        />
      </div>
    </div>
  );
}

function QuestionPanel({ question }) {
  if (!question)
    return <div className="text-slate-400 text-center py-8">Loading question…</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-bold text-white">{question.title}</h2>
          <span
            className="px-3 py-1 text-xs font-bold rounded-full"
            style={{
              background:
                question.difficulty === "Easy"
                  ? "rgba(52,211,153,0.2)"
                  : "rgba(251,191,36,0.2)",
              color:
                question.difficulty === "Easy" ? "#34d399" : question.difficulty === "Medium"
                ? "#fbbf24"
                : "#f87171",
            }}
          >
            {question.difficulty}
          </span>
        </div>
        {question.tags && (
          <div className="flex gap-2 flex-wrap">
            {question.tags.map((t) => (
              <span key={t} className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-slate-300 text-sm leading-relaxed">{question.description}</p>

      {question.examples?.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-400 mb-2">EXAMPLES</div>
          <div className="space-y-2">
            {question.examples.map((ex, i) => (
              <div key={i} className="p-3 bg-slate-800/50 text-xs rounded text-slate-300">
                <div>
                  <span className="font-bold text-slate-400">Input:</span> {ex.input}
                </div>
                <div>
                  <span className="font-bold text-slate-400">Output:</span> {ex.output}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {question.constraints?.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-400 mb-2">CONSTRAINTS</div>
          <div className="text-xs text-slate-400 space-y-1">
            {question.constraints.map((c, i) => (
              <div key={i}>• {c}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardPanel({ entries, currentUserId, firstBlood }) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex justify-between items-center">
          <span className="font-bold text-white">Leaderboard</span>
          <span className="text-xs text-slate-400">{entries.length} players</span>
        </div>
      </div>

      {firstBlood && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-xs text-red-400">
          <strong>First Blood</strong> \u2014 {firstBlood.username} solved in{" "}
          {formatTime(firstBlood.timeTakenSecs)}!
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {entries.map((entry, idx) => {
          const medals = ["1st", "2nd", "3rd"];
          const rankStr = idx < 3 ? medals[idx] : `#${idx + 1}`;
          const isSolved = entry.status === "solved";
          const isMe = entry.userId === currentUserId;

          return (
            <div
              key={entry.userId}
              className={`px-3 py-2 border-b border-slate-800 text-sm flex items-center gap-2 ${
                isMe ? "bg-blue-500/10 border-l-2 border-l-blue-500" : ""
              }`}
            >
              <span className="w-6 text-center text-xs">{rankStr}</span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #4f8fff, #a78bfa)",
                }}
              >
                {entry.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">
                  {entry.username} {isMe && <span className="text-xs text-blue-400">YOU</span>}
                </div>
                <div className="text-xs text-slate-400">
                  {isSolved ? `✓ ${formatTime(entry.timeTakenSecs)} · ${entry.language}` : "Coding…"}
                </div>
              </div>
              <span
                className="font-bold text-sm"
                style={{ color: isSolved ? "#34d399" : "#6b7693" }}
              >
                {entry.points > 0 ? `+${entry.points}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmitResult({ result, onDismiss }) {
  if (!result) return null;

  const allPassed = result.passed;

  return (
    <div
      className="absolute top-3 left-3 right-3 z-10 rounded-lg border p-3 text-sm backdrop-blur-md"
      style={{
        background: allPassed ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
        borderColor: allPassed ? "#34d399" : "#f87171",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">
          {allPassed ? "All test cases passed!" : "Wrong Answer"}
          {result.isFirstBlood && " First Blood +50"}
          {allPassed && result.points && ` +${result.points} pts`}
        </span>
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-200">
          ✕
        </button>
      </div>
      {!allPassed && result.testResults && (
        <div className="text-xs space-y-1">
          {result.testResults.map((r, i) => (
            <div key={i}>
              <span style={{ color: r.status.includes("Accepted") ? "#34d399" : "#f87171" }}>
                {r.status.includes("Accepted") ? "✓" : "✗"} Test {r.testCase}
              </span>
              {r.stderr && <span className="ml-2 text-red-400">{r.stderr.slice(0, 60)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventFeed({ events }) {
  return (
    <div className="space-y-1 text-xs">
      {events.slice(-4).reverse().map((ev, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.2 }} className="text-slate-400">
          {ev}
        </div>
      ))}
    </div>
  );
}

function CodeReviewPanel({ submissions }) {
  const [openUser, setOpenUser] = useState(null);

  return (
    <div className="space-y-2">
      {submissions.map(({ user, submissions: subs }) => (
        <div key={user.id} className="bg-slate-800 rounded border border-slate-700 overflow-hidden">
          <div
            className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-700/50"
            onClick={() => setOpenUser(openUser === user.id ? null : user.id)}
          >
            <span className="font-medium text-white">{user.username}</span>
            <span style={{ color: subs.some((s) => s.passed) ? "#34d399" : "#f87171" }}>
              {subs.some((s) => s.passed) ? "✓ Solved" : "✗ DNF"}
            </span>
          </div>
          {openUser === user.id &&
            subs.map((sub, i) => (
              <div key={i} className="border-t border-slate-700 p-3">
                <div className="text-xs text-slate-400 mb-2">
                  {sub.language} · {sub.passed ? "✓ Accepted" : "✗ Wrong"} ·{" "}
                  {formatTime(sub.timeTakenSecs)}
                </div>
                <pre className="text-xs bg-slate-900 p-2 rounded overflow-x-auto text-slate-300">
                  {sub.sourceCode}
                </pre>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-MATCH DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function PostMatchDashboard({ data, submissions, userId }) {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Match Over</h1>
          <div className="text-slate-400 text-sm space-y-1">
            <div>
              {data.summary.totalParticipants} Players · {data.summary.totalSolved} Solved
              {data.summary.firstBlood && ` · First Blood: ${data.summary.firstBlood}`}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Final Leaderboard */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 font-bold text-white">
              Final Standings
            </div>
            <div className="divide-y divide-slate-700">
              {data.leaderboard.map((entry, i) => {
                const medals = ["1st", "2nd", "3rd"];
                return (
                  <div
                    key={entry.userId}
                    className={`px-4 py-3 flex items-center justify-between text-sm ${
                      entry.userId === userId ? "bg-blue-500/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{i < 3 ? medals[i] : `#${i + 1}`}</span>
                      <span className="font-medium text-white">
                        {entry.username}
                        {entry.userId === userId && (
                          <span className="ml-2 text-xs text-blue-400">YOU</span>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        style={{
                          color: entry.solvedAt ? "#34d399" : "#f87171",
                          fontWeight: 600,
                        }}
                      >
                        {entry.solvedAt ? "Solved" : "DNF"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {entry.timeTakenSecs ? formatTime(entry.timeTakenSecs) : "—"} ·{" "}
                        {entry.points > 0 ? `+${entry.points}` : "0"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Code Review */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="font-bold text-white mb-4">Code Review</div>
            <CodeReviewPanel submissions={submissions} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE ROOM COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function DSALiveRoom({ roomCode, username, userId }) {
  const [question, setQuestion] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_CODE.javascript);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [firstBlood, setFirstBlood] = useState(null);
  const [events, setEvents] = useState([]);
  const [roomStatus, setRoomStatus] = useState("active");
  const [postMatch, setPostMatch] = useState(null);
  const [reviewSubmissions, setReviewSubmissions] = useState([]);
  const socket = getSocket();

  const addEvent = useCallback((msg) => {
    setEvents((prev) => [...prev.slice(-19), msg]);
  }, []);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();

    // ✅ CRITICAL: Define all handlers BEFORE registering them
    const handleRoomStarted = ({ config, endsAt, leaderboard }) => {
      console.log("✅ [DSALiveRoom] Room started:", { config, endsAt, leaderboard });
      // Set timer from endsAt or config
      const now = Date.now();
      const timeLimitSecs = config?.timeLimitSecs || Math.round((endsAt - now) / 1000);
      if (timeLimitSecs > 0) {
        setTimerTotal(timeLimitSecs);
        setTimerRemaining(timeLimitSecs);
      }
      // Update leaderboard
      if (leaderboard) {
        setLeaderboard(leaderboard);
      }
      addEvent("Room started! Good luck. Waiting for question...");
    };

    // ✅ CRITICAL: Listen for individual question assignment (for non-owners)
    const handleQuestionAssigned = ({ question: q }) => {
      console.log("✅ [DSALiveRoom] Question received:", q);
      setQuestion(q);
      addEvent(`Question loaded: ${q?.title || "Unknown"}`);
    };

    const handleTimerTick = ({ remaining }) => {
      setTimerRemaining(remaining);
      if (remaining === 60) addEvent("⚠ 1 minute remaining!");
    };

    const handleLeaderboardUpdate = ({ leaderboard: lb, event: ev }) => {
      setLeaderboard(lb);
      if (ev.type === "solve" || ev.type === "first_blood") {
        addEvent(`${ev.isFirstBlood ? "FIRST BLOOD" : "SOLVED"} ${ev.username} solved! +${ev.points} pts`);
      }
    };

    const handleFirstBlood = (data) => {
      setFirstBlood(data);
      setTimeout(() => setFirstBlood(null), 8000);
    };

    const handleUserJudging = ({ username: uname }) => {
      addEvent(`${uname} submitted — judging…`);
    };

    const handleUserLeft = ({ username: uname }) => {
      addEvent(`${uname} disconnected.`);
    };

    const handleRoomEnded = ({ leaderboard: lb, codeReview, summary }) => {
      console.log("✅ [DSALiveRoom] Room ended");
      setRoomStatus("ended");
      setLeaderboard(lb);
      setReviewSubmissions(codeReview);
      setPostMatch({ leaderboard: lb, summary });
      addEvent("Room ended! Check results.");
    };

    // ✅ CRITICAL: Register ALL listeners ONCE
    socket.on("room_started", handleRoomStarted);
    socket.on("question_assigned", handleQuestionAssigned);
    socket.on("timer_tick", handleTimerTick);
    socket.on("leaderboard_update", handleLeaderboardUpdate);
    socket.on("first_blood", handleFirstBlood);
    socket.on("user_judging", handleUserJudging);
    socket.on("user_left", handleUserLeft);
    socket.on("room_ended", handleRoomEnded);

    socket.emit("set_language", { language: "javascript" });

    // ✅ CRITICAL: Clean up ALL listeners on unmount (must pass handler reference)
    return () => {
      socket.off("room_started", handleRoomStarted);
      socket.off("question_assigned", handleQuestionAssigned);
      socket.off("timer_tick", handleTimerTick);
      socket.off("leaderboard_update", handleLeaderboardUpdate);
      socket.off("first_blood", handleFirstBlood);
      socket.off("user_judging", handleUserJudging);
      socket.off("user_left", handleUserLeft);
      socket.off("room_ended", handleRoomEnded);
    };
  }, []);

  // ── Language change ────────────────────────────────────────────────────────
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(STARTER_CODE[lang]);
    socket.emit("set_language", { language: lang });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (isSubmitting || roomStatus !== "active") return;
    setIsSubmitting(true);
    setSubmitResult(null);

    socket.emit("code_submit", { sourceCode: code, language }, (result) => {
      setIsSubmitting(false);
      if (result.success) {
        setSubmitResult(result);
      } else {
        setSubmitResult({ error: result.error });
      }
    });
  }, [code, language, isSubmitting, roomStatus]);

  // ── Keyboard shortcut ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit]);

  // ── POST-MATCH VIEW ──────────────────────────────────────────────────────────
  if (roomStatus === "ended" && postMatch) {
    return <PostMatchDashboard data={postMatch} submissions={reviewSubmissions} userId={userId} />;
  }

  // ── LIVE ROOM VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Top Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4 flex-shrink-0">
        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-bold rounded">
          ⚔ {roomCode}
        </span>

        <div className="flex gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLanguageChange(l.id)}
              className={`px-3 py-1 text-sm rounded transition ${
                language === l.id
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <TimerBar remaining={timerRemaining} total={timerTotal} />

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`px-4 py-2 rounded font-bold whitespace-nowrap transition ${
            isSubmitting
              ? "bg-slate-600 text-slate-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-500 text-white"
          }`}
        >
          {isSubmitting ? "⚙ Judging…" : "▶ Submit ⌘↵"}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Question */}
        <div className="w-80 bg-slate-900 border-r border-slate-700 overflow-y-auto p-4">
          <QuestionPanel question={question} />
        </div>

        {/* Center - Editor */}
        <div className="flex-1 relative flex flex-col overflow-hidden bg-slate-950">
          <SubmitResult result={submitResult} onDismiss={() => setSubmitResult(null)} />
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-4 bg-slate-900 text-slate-100 font-mono text-sm border-0 outline-none resize-none"
            spellCheck="false"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        {/* Right Panel - Leaderboard */}
        <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
          <LeaderboardPanel
            entries={leaderboard}
            currentUserId={userId}
            firstBlood={firstBlood}
          />
          <div className="border-t border-slate-700 p-3 flex-shrink-0">
            <div className="text-xs font-bold text-slate-400 mb-2">Live Events</div>
            <EventFeed events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
