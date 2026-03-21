"use client";

import React, { useState } from "react";
import { Cpu, HelpCircle, Lightbulb } from "lucide-react";

export default function CopilotMode() {
  const [sessionState, setSessionState] = useState("setup"); // setup, active, evaluation
  const [question, setQuestion] = useState("");
  const [guidance, setGuidance] = useState(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [response, setResponse] = useState("");
  const [aiToolsUsed, setAiToolsUsed] = useState({
    chatgpt: false,
    copilot: false,
    docs: false,
    stackOverflow: false,
  });
  const [setupData, setSetupData] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [promptQuality, setPromptQuality] = useState(50);

  // Initialize Copilot Mode
  const initializeCopilot = async () => {
    try {
      const response = await fetch("/api/copilot/manage-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "setup",
          sessionId: "session_" + Date.now(),
          candidateId: "candidate_1",
        }),
      });

      const data = await response.json();
      setSetupData(data);
      setSessionState("active");
    } catch (error) {
      console.error("Failed to initialize:", error);
      alert("Failed to initialize Copilot mode");
    }
  };

  // Get AI Assistance
  const getAssistance = async () => {
    if (!question.trim()) {
      alert("Please enter a question");
      return;
    }

    setIsLoadingGuidance(true);

    try {
      const response = await fetch("/api/copilot/manage-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "assist",
          question,
          sessionId: "session_" + Date.now(),
          candidateId: "candidate_1",
        }),
      });

      const data = await response.json();
      setGuidance(data.assistance);
    } catch (error) {
      console.error("Failed to get assistance:", error);
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  // Evaluate Response
  const evaluateResponse = async () => {
    if (!response.trim()) {
      alert("Please provide a response");
      return;
    }

    try {
      const response_ = await fetch("/api/copilot/manage-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "evaluate",
          candidateResponse: response,
          aiToolsUsed: Object.keys(aiToolsUsed).filter((k) => aiToolsUsed[k]),
          promptQuality,
          aiDebugSkill: promptQuality,
          decisionMaking: promptQuality,
          efficiency: promptQuality,
          sessionId: "session_" + Date.now(),
          candidateId: "candidate_1",
        }),
      });

      const data = await response_.json();
      setEvaluation(data);
      setSessionState("evaluation");
    } catch (error) {
      console.error("Evaluation failed:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Cpu className="w-6 h-6" />
        AI Copilot Interview Mode
      </h2>

      {sessionState === "setup" ? (
        // Setup Phase
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold mb-3">About Copilot Mode</h3>
            <p className="text-sm text-gray-700 mb-3">
              In Copilot Mode, you can use AI tools (ChatGPT, Codex, etc.) during
              the interview. However, the system will evaluate:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Quality of prompts you write for AI</li>
              <li>How well you debug and validate AI suggestions</li>
              <li>Your critical thinking and decision-making</li>
              <li>Overall productivity and time efficiency</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Pro Tips
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Write specific, detailed prompts for better results</li>
              <li>Always understand and explain AI suggestions</li>
              <li>Validate generated code/solutions</li>
              <li>Show your problem-solving thought process</li>
            </ul>
          </div>

          <button
            onClick={initializeCopilot}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Start Copilot Mode
          </button>
        </div>
      ) : sessionState === "active" && !evaluation ? (
        // Active Interview Phase
        <div className="space-y-4">
          {/* Guidelines */}
          {setupData?.guidelines && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-bold mb-2">Allowed Tools:</p>
              <div className="flex flex-wrap gap-2">
                {setupData.guidelines.allowedTools.map((tool, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs"
                  >
                    {tool.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Interview Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste the interview question here..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Get Guidance Button */}
          <button
            onClick={getAssistance}
            disabled={isLoadingGuidance || !question.trim()}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            {isLoadingGuidance ? "Getting Guidance..." : "Get AI Guidance"}
          </button>

          {/* Guidance Display */}
          {guidance && (
            <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded-lg">
              <h3 className="font-bold mb-2">Structural Guidance</h3>
              <p className="text-sm text-gray-700 mb-3">{guidance.guidance}</p>

              {guidance.keyAreas && guidance.keyAreas.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-gray-600 mb-2">
                    Key Areas to Cover:
                  </p>
                  <div className="space-y-1">
                    {guidance.keyAreas.map((area, i) => (
                      <p key={i} className="text-xs text-gray-600">
                        • {area}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {guidance.recommendedPrompts &&
                guidance.recommendedPrompts.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">
                      Recommended AI Prompts:
                    </p>
                    <div className="space-y-2">
                      {guidance.recommendedPrompts.map((prompt, i) => (
                        <div
                          key={i}
                          className="p-2 bg-blue-100 rounded text-xs text-gray-700"
                        >
                          <p className="font-medium">{prompt.prompt}</p>
                          <p className="text-gray-600 mt-1">({prompt.purpose})</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* AI Tools Used */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-bold mb-2">Which AI Tools Did You Use?</p>
            <div className="space-y-2">
              {Object.entries(aiToolsUsed).map(([tool, used]) => (
                <label key={tool} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={used}
                    onChange={(e) =>
                      setAiToolsUsed((prev) => ({
                        ...prev,
                        [tool]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm capitalize">{tool}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Prompt Quality */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Prompt Quality Assessment (0-100)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={promptQuality}
              onChange={(e) => setPromptQuality(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-600 mt-1">
              Current: {promptQuality}/100
            </p>
          </div>

          {/* Response Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Final Response
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your response here (with or without AI assistance)..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={5}
            />
          </div>

          {/* Evaluate Button */}
          <button
            onClick={evaluateResponse}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Evaluate AI Usage & Response
          </button>
        </div>
      ) : (
        // Evaluation Phase
        evaluation && (
          <div className="space-y-4">
            {/* AI Literacy Score */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg text-center">
              <p className="text-gray-600 text-sm mb-2">AI Literacy Score</p>
              <p className="text-5xl font-bold text-blue-600">
                {evaluation.aiLiteracyScore}%
              </p>
              <p className="text-sm text-gray-600 mt-2 font-bold">
                Verdict: {evaluation.verdict}
              </p>
            </div>

            {/* Tool Usage Pattern */}
            {evaluation.toolsUsagePattern && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-2">AI Tool Usage Pattern</h3>
                <p className="text-sm mb-2">
                  <strong>Pattern:</strong> {evaluation.toolsUsagePattern.pattern}
                </p>
                <p className="text-sm text-gray-700">
                  {evaluation.toolsUsagePattern.analysis}
                </p>
              </div>
            )}

            {/* Detailed Evaluation */}
            {evaluation.evaluation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-bold mb-3">Detailed Assessment</h3>
                <div className="space-y-2 text-sm">
                  {evaluation.evaluation.promptEngineeringSkill && (
                    <div>
                      <p className="font-medium text-gray-700">
                        Prompt Engineering:
                      </p>
                      <p className="text-gray-600">
                        {evaluation.evaluation.promptEngineeringSkill}
                      </p>
                    </div>
                  )}
                  {evaluation.evaluation.debuggingAbility && (
                    <div>
                      <p className="font-medium text-gray-700">
                        Debugging Ability:
                      </p>
                      <p className="text-gray-600">
                        {evaluation.evaluation.debuggingAbility}
                      </p>
                    </div>
                  )}
                  {evaluation.evaluation.criticalThinking && (
                    <div>
                      <p className="font-medium text-gray-700">
                        Critical Thinking:
                      </p>
                      <p className="text-gray-600 capitalize">
                        {evaluation.evaluation.criticalThinking}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metrics */}
            {evaluation.metrics && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border rounded text-center">
                  <p className="text-xs text-gray-600">Prompt Quality</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {evaluation.metrics.promptQuality}
                  </p>
                </div>
                <div className="p-3 bg-white border rounded text-center">
                  <p className="text-xs text-gray-600">Efficiency</p>
                  <p className="text-2xl font-bold text-green-600">
                    {evaluation.metrics.efficiency}
                  </p>
                </div>
              </div>
            )}

            {/* Recommendation */}
            {evaluation.evaluation?.recommendation && (
              <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded-lg">
                <p className="text-sm font-bold text-gray-700">
                  {evaluation.evaluation.recommendation}
                </p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
