"use client";

import React, { useState } from "react";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

export default function ResumeVerification() {
  const [resume, setResume] = useState("");
  const [verification, setVerification] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const analyzeResume = async () => {
    if (!resume.trim()) {
      alert("Please paste your resume");
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/resume/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          sessionId: "session_" + Date.now(),
          candidateId: "candidate_1",
        }),
      });

      const data = await response.json();
      setVerification(data);
      setIsAnswering(true);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitAnswer = () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer");
      return;
    }

    setAnswers([
      ...answers,
      {
        question: verification.verificationQuestions[currentQuestion],
        answer: currentAnswer,
      },
    ]);

    if (currentQuestion < verification.verificationQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentAnswer("");
    } else {
      // All questions answered
      setIsAnswering(false);
    }
  };

  const getTrustScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getRedFlagSeverityColor = (severity) => {
    if (severity === "high") return "bg-red-100 border-red-500";
    if (severity === "medium") return "bg-yellow-100 border-yellow-500";
    return "bg-blue-100 border-blue-500";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Shield className="w-6 h-6" />
        AI Resume Verification Engine
      </h2>

      {!verification ? (
        // Resume Input Phase
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste Your Resume
            </label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume in any format..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8}
            />
          </div>

          <button
            onClick={analyzeResume}
            disabled={isAnalyzing || !resume.trim()}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isAnalyzing ? "Analyzing Resume..." : "Analyze & Generate Questions"}
          </button>
        </div>
      ) : !isAnswering ? (
        // Results Phase
        <div className="space-y-6">
          {/* Trust Score */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <p className="text-gray-600 text-sm mb-2">Resume Trust Score</p>
            <p className={`text-5xl font-bold ${getTrustScoreColor(verification.trustScore)}`}>
              {verification.trustScore}%
            </p>
            <p className="text-sm text-gray-600 mt-3">
              Action Required:{" "}
              <span className="font-bold">{verification.summary.recommendedAction}</span>
            </p>
          </div>

          {/* Red Flags */}
          {verification.redFlags.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Potential Issues Found
              </h3>
              {verification.redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className={`p-4 border-l-4 rounded ${getRedFlagSeverityColor(flag.severity)}`}
                >
                  <p className="font-bold text-sm capitalize">{flag.type}</p>
                  <p className="text-sm mt-1">{flag.description}</p>
                  <p className="text-xs text-gray-600 mt-2 italic">
                    {flag.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Claims Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-3">Claims by Category</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(verification.summary.claimsByType).map(
                ([type, count]) => (
                  <div key={type} className="bg-white p-3 rounded">
                    <p className="text-xs text-gray-600 capitalize">{type}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Start Verification */}
          <button
            onClick={() => {
              setIsAnswering(true);
              setCurrentQuestion(0);
            }}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Answer Verification Questions ({verification.verificationQuestions.length})
          </button>
        </div>
      ) : (
        // Verification Questions Phase
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
            <span>
              Question {currentQuestion + 1} of{" "}
              {verification.verificationQuestions.length}
            </span>
            <div className="w-32 bg-gray-200 rounded-full h-2 ml-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((currentQuestion + 1) / verification.verificationQuestions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-lg">
            <p className="text-lg font-semibold">
              {verification.verificationQuestions[currentQuestion]?.question}
            </p>
            {verification.verificationQuestions[currentQuestion]?.expectedKeywords &&
              verification.verificationQuestions[currentQuestion].expectedKeywords
                .length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Expected Keywords:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {verification.verificationQuestions[currentQuestion].expectedKeywords.map(
                      (keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded"
                        >
                          {keyword}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* Answer Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Answer</label>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your detailed answer..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={submitAnswer}
            disabled={!currentAnswer.trim()}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {currentQuestion <
            verification.verificationQuestions.length - 1
              ? "Next Question"
              : "Complete Verification"}
          </button>

          {/* Completed Answers */}
          {answers.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-bold mb-3">Answered: {answers.length}</p>
              {answers.map((ans, idx) => (
                <div key={idx} className="mb-3 pb-3 border-b">
                  <p className="text-xs font-bold text-blue-600 mb-1">
                    Q{idx + 1}
                  </p>
                  <p className="text-xs text-gray-600">{ans.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
