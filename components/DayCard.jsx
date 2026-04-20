"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuestionDetailsModal from "@/components/QuestionDetailsModal";

export default function DayCard({ day, isExpanded, onToggleExpand, getDifficultyColor }) {
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        {/* Day Header */}
        <button
          onClick={onToggleExpand}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{day.day}</span>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Day {day.day} - {day.topics.join(", ")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {day.questions.length} questions
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Questions List */}
        {isExpanded && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="space-y-3">
              {day.questions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedQuestion(question)}
                      className="w-full text-left group"
                    >
                      <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
                        {question.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
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
