// components/DSARoomResultsBoard.jsx
"use client";

import { CheckCircle2, Clock, Crown, Trophy, XCircle } from "lucide-react";
import { formatDsaDuration } from "@/lib/dsa-room-results";

export default function DSARoomResultsBoard({
  roomCode,
  results = [],
  currentUserId = null,
  currentUsername = null,
  title,
}) {
  if (!results || results.length === 0) return null;

  return (
    <div className="bg-slate-900/40 border border-slate-800/90 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {title || `Saved Test Results · Room #${roomCode}`}
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          {results.length} submission{results.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        {results.map((entry, idx) => {
          const isLeader = idx === 0 && entry.questionsSolved > 0;
          const isYou =
            (currentUserId && entry.userId === currentUserId) ||
            (currentUsername && entry.username === currentUsername);

          return (
            <div
              key={entry.id || `${entry.userId}-${idx}`}
              className={`bg-slate-950/90 p-4 rounded-xl border space-y-3 ${
                isLeader
                  ? "border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.08)]"
                  : "border-slate-800/90"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                      isLeader ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-sm text-slate-100 truncate">
                    {entry.username}
                  </span>
                  {isYou && (
                    <span className="text-[10px] font-semibold text-emerald-400">(You)</span>
                  )}
                  {isLeader && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                  {entry.finishedBeforeTime && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                      Finished Early
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                    Score: {entry.score}/100
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Solved</p>
                  <p className="font-bold text-emerald-400 mt-0.5">
                    {entry.questionsSolved}/{entry.totalQuestions} Qs
                  </p>
                </div>

                <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Final Time</p>
                  <p className="font-bold text-slate-100 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    {formatDsaDuration(entry.finalTimeMs)}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Wrong Attempts</p>
                  <p className="font-bold text-rose-400 mt-0.5">
                    {entry.wrongAttempts || 0} wrong
                  </p>
                </div>

                <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Attempts</p>
                  <p className="font-bold text-slate-200 mt-0.5">
                    {entry.totalAttempts || 0} tries
                  </p>
                </div>
              </div>

              {Array.isArray(entry.questionBreakdown) && entry.questionBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-900">
                  {entry.questionBreakdown.map((q, qIdx) => (
                    <div
                      key={q.questionId || qIdx}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                        q.solved
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                      title={q.title}
                    >
                      {q.solved ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-slate-500" />
                      )}
                      <span className="font-bold">{q.label || `Q${qIdx + 1}`}</span>
                      <span>
                        {q.solved ? formatDsaDuration(q.timeTakenMs) : "Unsolved"}
                      </span>
                      <span className="text-[10px] opacity-80">
                        · {q.wrongAttempts || 0} wrong
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
