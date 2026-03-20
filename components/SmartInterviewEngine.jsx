"use client";

import React, { useState, useRef } from "react";
import { Zap, MessageCircle, AlertCircle } from "lucide-react";

export default function SmartInterviewEngine() {
  const [resume, setResume] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewPhase, setInterviewPhase] = useState("initial");
  const [phases] = useState([
    "initial",
    "technical",
    "behavioral",
    "closing",
  ]);

  const startInterview = async () => {
    if (!resume.trim() || !jobDesc.trim()) {
      alert("Please provide resume and job description");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/interview/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription: jobDesc,
          previousAnswers: answers,
          questionHistory: [],
          candidateSkills: ["JavaScript", "React", "Node.js"],
          interviewPhase,
          sessionId: "session_" + Date.now(),
          candidateId: "candidate_1",
        }),
      });

      const data = await response.json();
      setCurrentQuestion(data.currentQuestion);
    } catch (error) {
      console.error("Failed to generate question:", error);
      alert("Failed to generate question");
    } finally {
      setIsGenerating(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer");
      return;
    }

    // Add to answers
    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    setCurrentAnswer("");

    // Generate next question
    setIsGenerating(true);

    try {
      // Move to next phase if enough answers
      const nextPhase =
        answers.length % 3 === 2
          ? phases[Math.min(phases.indexOf(interviewPhase) + 1, phases.length - 1)]
          : interviewPhase;

      const response = await fetch("/api/interview/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription: jobDesc,
          previousAnswers: newAnswers,
          questionHistory: currentQuestion? [currentQuestion.question] : [],
          candidateSkills: ["JavaScript", "React", "Node.js"],
          interviewPhase: nextPhase,
          sessionId: "session_" + Date.now(),
          candidateId: "candidate_1",
        }),
      });

      const data = await response.json();
      setCurrentQuestion(data.currentQuestion);
      setInterviewPhase(nextPhase);
    } catch (error) {
      console.error("Failed to generate next question:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Zap className="w-6 h-6" />
        Smart AI Interview Engine
      </h2>

      {!currentQuestion ? (
        // Setup Phase
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Resume</label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume here..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Job Description
            </label>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          <button
            onClick={startInterview}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isGenerating ? "Generating Questions..." : "Start Interview"}
          </button>
        </div>
      ) : (
        // Interview Phase
        <div className="space-y-4">
          {/* Phase Indicator */}
          <div className="flex gap-2 mb-4">
            {phases.map((phase) => (
              <div
                key={phase}
                className={`flex-1 py-2 rounded text-center text-sm font-medium capitalize ${
                  interviewPhase === phase
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {phase}
              </div>
            ))}
          </div>

          {/* Question */}
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
            <p className="text-sm text-gray-600 mb-2">
              Question {answers.length + 1} - {currentQuestion.type}
            </p>
            <p className="text-lg font-semibold">{currentQuestion.question}</p>
            {currentQuestion.expectedKeyPoints && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 font-medium">Key Points:</p>
                <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                  {currentQuestion.expectedKeyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Answer Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Answer</label>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={5}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={submitAnswer}
            disabled={isGenerating || !currentAnswer.trim()}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {isGenerating ? "Generating Next Question..." : "Submit & Next Question"}
          </button>

          {/* Follow-up Opportunities */}
          {currentQuestion.followUpOpportunities && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Potential Follow-ups:
              </p>
              <ul className="space-y-1">
                {currentQuestion.followUpOpportunities.map((followup, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-blue-600">•</span>
                    {followup}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Answer Count */}
          <p className="text-sm text-gray-600 text-center">
            Answers submitted: {answers.length}
          </p>
        </div>
      )}
    </div>
  );
}
