"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, Code, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuestionDetailsModal from "@/components/QuestionDetailsModal";

export default function DayCard({
  day,
  isExpanded,
  onToggleExpand,
  getDifficultyColor,
  isCompleted = false,
  isUpdating = false,
  canTrackProgress = false,
  onMarkComplete,
  onUndoComplete,
}) {
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        {/* Day Header */}
        <div className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-4 flex-1 min-w-0 text-left cursor-pointer"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                isCompleted
                  ? "bg-linear-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25"
                  : "bg-linear-to-br from-blue-500 to-blue-600"
              }`}
            >
              <span className="text-white font-bold text-lg">{day.day}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                Day {day.day} - {day.topics.join(", ")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {day.questions.length} questions{isCompleted ? " · Completed" : ""}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            {isCompleted && onUndoComplete && (
              <button
                type="button"
                disabled={!canTrackProgress || isUpdating}
                onClick={onUndoComplete}
                title="Revert day completion"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-500/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>{isUpdating ? "Reverting..." : "Undo"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={isExpanded ? `Collapse Day ${day.day}` : `Expand Day ${day.day}`}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-600/60 transition-colors cursor-pointer"
            >
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Questions List */}
        {isExpanded && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="mb-4 flex items-center justify-end gap-2.5">
              {isCompleted ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Day completed
                  </span>
                  {onUndoComplete && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canTrackProgress || isUpdating}
                      onClick={onUndoComplete}
                      className="rounded-full border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-500/40 cursor-pointer transition-all"
                    >
                      <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                      {isUpdating ? "Reverting..." : "Undo"}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  disabled={!canTrackProgress || isUpdating}
                  onClick={onMarkComplete}
                  className="rounded-full cursor-pointer"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isUpdating ? "Saving..." : "Mark day complete"}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {day.questions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex-1">
                    <button
                      onClick={() => setSelectedQuestion(question)}
                      className="text-left group"
                    >
                      <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {question.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className={`font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {question.topic}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">
                          {question.complexity.time}
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedQuestion(question)}
                      className="hover:bg-blue-100 dark:hover:bg-blue-900"
                      title="View solutions"
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                    {question.geeksforgeeksUrl && (
                      <a
                        href={question.geeksforgeeksUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors"
                        title="GeeksforGeeks solution"
                      >
                        <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </a>
                    )}
                    <a
                      href={question.leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                      title="LeetCode problem"
                    >
                      <ExternalLink className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Question Details Modal */}
      {selectedQuestion && (
        <QuestionDetailsModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </>
  );
}
