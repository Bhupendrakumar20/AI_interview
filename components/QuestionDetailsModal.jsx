"use client";

import { useState } from "react";
import { X, Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuestionDetailsModal({ question, onClose }) {
  const [selectedLanguage, setSelectedLanguage] = useState("JavaScript");
  const [copiedLanguage, setCopiedLanguage] = useState(null);

  const handleCopyCode = (language) => {
    const code = question.solutions[language];
    navigator.clipboard.writeText(code);
    setCopiedLanguage(language);
    setTimeout(() => setCopiedLanguage(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {question.title}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                question.difficulty === "Easy"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : question.difficulty === "Medium"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}>
                {question.difficulty}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {question.topic}
              </span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  <strong>Time:</strong> {question.complexity.time}
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  <strong>Space:</strong> {question.complexity.space}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              Description
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {question.description}
            </p>
          </div>

          {/* External Links */}
          <div className="flex gap-3">
            <a
              href={question.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on LeetCode
            </a>
            <a
              href={question.dsaProblemLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on DSAProblem
            </a>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              Solutions
            </h3>

            {/* Language Selector */}
            <div className="flex gap-2 flex-wrap mb-4">
              {question.languages.map((language) => (
                <button
                  key={language}
                  onClick={() => setSelectedLanguage(language)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedLanguage === language
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>

            {/* Code Block */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden">
              <div className="absolute top-3 right-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyCode(selectedLanguage)}
                  className="flex items-center gap-2"
                >
                  {copiedLanguage === selectedLanguage ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <pre className="p-4 pt-12 text-sm text-slate-100 overflow-x-auto font-mono">
                <code>{question.solutions[selectedLanguage]}</code>
              </pre>
            </div>
          </div>

          {/* Algorithm Explanation */}
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-300 animate-pulse" /> Key Insights
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• This problem tests your understanding of {question.topic}</li>
              <li>• Time Complexity: {question.complexity.time}</li>
              <li>• Space Complexity: {question.complexity.space}</li>
              <li>• Practice multiple approaches to master the pattern</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
