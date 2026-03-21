"use client";

import React, { useState, useRef } from "react";
import { AlertIcon, CheckCircle, TrendingUp } from "lucide-react";

export default function AICheatDetector() {
  const [answer, setAnswer] = useState("");
  const [detectionReport, setDetectionReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const textareaRef = useRef(null);
  const [typingPattern, setTypingPattern] = useState({
    intervals: [],
    lastTime: null,
  });

  const handleTextChange = (e) => {
    const now = Date.now();

    if (typingPattern.lastTime) {
      const interval = now - typingPattern.lastTime;
      setTypingPattern((prev) => ({
        intervals: [...prev.intervals, interval],
        lastTime: now,
      }));
    } else {
      setTypingPattern((prev) => ({
        ...prev,
        lastTime: now,
      }));
    }

    setAnswer(e.target.value);
  };

  const analyzeAnswer = async () => {
    if (!answer.trim()) {
      alert("Please enter an answer");
      return;
    }

    setIsAnalyzing(true);

    try {
      const detection = {
        answer,
        typingPattern,
        responseLatency: typingPattern.intervals.reduce((a, b) => a + b, 0) || 0,
        previousAnswers: [],
        questionContext: "Technical interview question",
        sessionId: "session_" + Date.now(),
        candidateId: "candidate_1",
      };

      const response = await fetch("/api/cheating/detect-ai-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detection),
      });

      const report = await response.json();
      setDetectionReport(report);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze answer");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getVerdictColor = (verdict) => {
    if (verdict === "AUTHENTIC") return "bg-green-100 text-green-800";
    if (verdict === "QUESTIONABLE") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-6 h-6" />
        AI Usage Detection System
      </h2>

      <div className="space-y-4">
        {/* Answer Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Your Answer</label>
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={handleTextChange}
            placeholder="Type your answer here (typing patterns are monitored)..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
          />
          <p className="text-xs text-gray-500 mt-2">
            Typing patterns are automatically tracked for authenticity analysis
          </p>
        </div>

        {/* Analyze Button */}
        <button
          onClick={analyzeAnswer}
          disabled={isAnalyzing || !answer.trim()}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Authenticity"}
        </button>

        {/* Report */}
        {detectionReport && (
          <div className="space-y-4 mt-6">
            {/* Score Section */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-center">
                <p className="text-gray-600 text-sm">Authenticity Score</p>
                <p className={`text-4xl font-bold ${getScoreColor(detectionReport.authenticityScore)}`}>
                  {detectionReport.authenticityScore}%
                </p>
                <p className={`mt-2 px-3 py-1 rounded-full inline-block text-sm font-bold ${getVerdictColor(detectionReport.verdict)}`}>
                  {detectionReport.verdict}
                </p>
              </div>
            </div>

            {/* Signals */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-3">Analysis Signals</h3>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(detectionReport.signals).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 p-2 bg-white rounded"
                  >
                    {value.includes("✔") ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {key.replace(/([A-Z])/g, " $1")}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className={`p-4 rounded-lg ${getVerdictColor(detectionReport.verdict)} bg-opacity-20`}>
              <h3 className="font-bold mb-2">Recommendation</h3>
              <p className="text-sm">{detectionReport.recommendation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
