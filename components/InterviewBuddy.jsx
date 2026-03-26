"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Briefcase, Users, Rocket, Award, FolderOpen, AlertCircle, FileText, Brain, Radio, BarChart3, Code, Video, FileJson, Film, Trophy, Cpu } from "lucide-react";
import AiBuddyInterviewSession from "./AiBuddyInterviewSession";
import AiBuddyResultsScreen from "./AiBuddyResultsScreen";
import DSARoomLobby from "./DSARoomLobby";

const InterviewBuddy = ({ userId }) => {
  const [currentMode, setCurrentMode] = useState("human");
  const [selectedPersona, setSelectedPersona] = useState("hiring-manager");
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [sessionDuration, setSessionDuration] = useState(30);
  const [selectedTopics, setSelectedTopics] = useState(["DSA", "System Design", "OOP"]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionCode, setSessionCode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  const [dsaRoomActive, setDsaRoomActive] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    avgScore: 0,
    totalPracticeTime: 0,
    topicsCovered: [],
    sessionsByMode: { human: 0, ai: 0 },
    sessionsByDifficulty: { easy: 0, medium: 0, hard: 0 },
    recentSessions: [],
  });

  // Fetch user stats on component mount
  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/interview-buddy/stats?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Show fallback stats
    }
  };

  const handleCreateSession = async () => {
    if (!userId) {
      toast.error("Please log in first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/interview-buddy/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mode: currentMode,
          persona: selectedPersona,
          topics: selectedTopics,
          difficulty: selectedDifficulty,
          duration: sessionDuration,
        }),
      });

      if (!response.ok) throw new Error("Failed to create session");
      const data = await response.json();

      setActiveSessionId(data.sessionId);
      setSessionCode(data.sessionCode);

      // If AI mode, start interview immediately
      if (currentMode === "ai") {
        setIsInterviewActive(true);
        setIsModalOpen(false);
        toast.success("AI Interview started! Questions are loading...");
      } else {
        // If human mode, show session code
        setIsModalOpen(true);
        toast.success("Session created! Share the code with your buddy.");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = async (code) => {
    if (!userId) {
      toast.error("Please log in first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/interview-buddy/join-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionCode: code,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join session");
      }

      const data = await response.json();
      setSessionCode(data.sessionCode);
      toast.success("Joined session! Waiting for buddy...");
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error(error.message || "Failed to join session");
    } finally {
      setIsLoading(false);
    }
  };

  const personas = [
    { id: "hiring-manager", icon: Briefcase, name: "Hiring Manager", style: "Technical depth" },
    { id: "hr-partner", icon: Users, name: "HR Partner", style: "Behavioral focus" },
    { id: "startup-founder", icon: Rocket, name: "Startup Founder", style: "Culture & vision" },
    { id: "drill-sergeant", icon: Award, name: "Drill Sergeant", style: "High pressure" },
  ];

  const topics = [
    "DSA", "System Design", "Behavioral", "SQL", "OOP", 
    "React / JS", "HR Round", "Leadership", "Case Study", "Negotiation"
  ];

  // Format stats for display
  const displayStats = [
    { 
      value: stats.completedSessions, 
      label: "Sessions Done", 
      color: "bg-emerald-500" 
    },
    { 
      value: `${stats.avgScore}%`, 
      label: "Avg Score", 
      color: "bg-blue-500" 
    },
    { 
      value: stats.totalPracticeTime > 60 
        ? `${Math.floor(stats.totalPracticeTime / 60)}h ${stats.totalPracticeTime % 60}m`
        : `${stats.totalPracticeTime}m`,
      label: "Total Practice", 
      color: "bg-purple-500" 
    },
    { 
      value: stats.topicsCovered.length, 
      label: "Unique Topics", 
      color: "bg-yellow-500" 
    },
  ];

  // Format recent sessions for display
  const recentSessions = (stats.recentSessions || []).map(session => ({
    type: session.mode,
    title: `${session.mode === 'ai' ? 'AI Buddy' : 'Human Buddy'} · ${session.topics?.[0] || 'Interview'} Round`,
    meta: `${session.persona || session.mode} · ${session.difficulty} · ${session.duration} min · ${new Date(session.createdAt).toLocaleDateString()}`,
    score: `${session.score || 0}%`,
    scoreType: session.score >= 80 ? "good" : "mid",
    label: "Overall Score",
  }));

  const features = [
    {
      type: "human",
      icon: FolderOpen,
      title: "Co-Pilot Question Queue",
      desc: "Interviewer drags questions into a live queue. Tag-team mode lets partners pass the mic for panel simulation.",
    },
    {
      type: "human",
      icon: AlertCircle,
      title: "Signal Cards",
      desc: "Non-verbal cues: Yellow (off-topic), Red (move on), Green (excellent — elaborate). Non-disruptive to the flow.",
    },
    {
      type: "human",
      icon: FileText,
      title: "Shared Live Notes",
      desc: "A mini-realtime doc both users type in during the session. Auto-formats into a structured Recap PDF at the end.",
    },
    {
      type: "ai",
      icon: Brain,
      title: "Adaptive AI Questioning",
      desc: "If your answer is weak, the AI re-prompts with a follow-up. 'Safe to fail' — retry your answer immediately.",
    },
    {
      type: "ai",
      icon: Radio,
      title: "Live Sentiment Analysis",
      desc: "Real-time gauges for Confidence, Pacing, and Filler Words. On-screen STAR method nudges appear contextually.",
    },
    {
      type: "ai",
      icon: BarChart3,
      title: "Radar Chart Report",
      desc: "Post-session breakdown: Clarity, Technical Accuracy, Behavioral Storytelling, Confidence. Color-coded transcript.",
    },
    {
      type: "shared",
      icon: Code,
      title: "Integrated Code Editor",
      desc: "Full syntax-highlighted editor for coding rounds. Live or AI-observed. Supports multiple languages.",
    },
    {
      type: "shared",
      icon: Film,
      title: "Bookmarked Recording",
      desc: "Session recordings with automatic bookmarks at signal card moments, feedback events, and key question timestamps.",
    },
    {
      type: "shared",
      icon: FileJson,
      title: "JD-Based Questions",
      desc: "Upload a job description. AI generates role-specific questions tailored to the exact requirements and company culture.",
    },
  ];

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleStartSession = () => {
    handleCreateSession();
  };

  const copyCode = async () => {
    if (!sessionCode) {
      toast.error("No session code generated");
      return;
    }
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sessionCode);
        toast.success("Session code copied!");
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = sessionCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast.success("Session code copied!");
      }
    } catch (error) {
      toast.error("Failed to copy code");
      console.error("Copy error:", error);
    }
  };

  const handleSessionEnd = (results) => {
    setSessionResults(results);
    setShowResults(true);
    setIsInterviewActive(false);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setSessionResults(null);
    setActiveSessionId(null);
    fetchStats(); // Refresh stats after closing results
  };

  const handleRetryInterview = () => {
    setShowResults(false);
    setSessionResults(null);
    setActiveSessionId(null);
    // Optionally auto-start another session
    handleCreateSession();
  };

  return (
    <>
      {dsaRoomActive ? (
        <DSARoomLobby
          userId={userId}
          username={`User_${userId?.slice(0, 8) || 'Guest'}`}
          onRoomJoined={(roomData) => {
            toast.success("Room joined! Starting DSA competition...");
            // Room data contains socket connection for further use
          }}
          onClose={() => setDsaRoomActive(false)}
        />
      ) : showResults && sessionResults ? (
        <AiBuddyResultsScreen
          sessionId={activeSessionId}
          results={sessionResults}
          onClose={handleCloseResults}
          onRetry={handleRetryInterview}
        />
      ) : isInterviewActive && activeSessionId ? (
        <AiBuddyInterviewSession
          sessionId={activeSessionId}
          selectedTopics={selectedTopics}
          difficulty={selectedDifficulty}
          duration={sessionDuration}
          onSessionEnd={handleSessionEnd}
          onClose={() => {
            setIsInterviewActive(false);
            setActiveSessionId(null);
          }}
        />
      ) : (
        <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* HEADER */}
      <div className="relative px-10 pt-9 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-0 left-48 w-72 h-48 bg-linear-to-br from-purple-500/8 to-transparent rounded-full blur-3xl -z-10"></div>

        <div className="text-xs text-slate-400 mb-4 flex items-center gap-2">
          <span>Practice</span> <span className="opacity-40">›</span> Interview Buddy
        </div>

        <div className="flex items-start justify-between gap-5 mb-8">
          <div>
            <h1 className="text-5xl font-black mb-3 leading-tight">
              Interview<br />
              <span className="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Buddy
              </span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed max-w-md">
              Practice with a human partner or an AI interviewer. Get real-time coaching, adaptive questions, and a detailed post-session performance report.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button className="px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium hover:bg-slate-700 transition hover:shadow-md hover:shadow-slate-700/50">
              View Past Reports
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/40 hover:scale-105 transition"
            >
              New Session
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="px-10 pb-6 flex gap-3 overflow-x-auto">
        {displayStats.map((stat, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-2 whitespace-nowrap">
            <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
            <span className="font-bold text-slate-100">{stat.value}</span>
            <span className="text-xs text-slate-400">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="h-px bg-slate-800 mx-10 mb-8"></div>

      {/* MODE SELECTOR */}
      <div className="px-10 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Choose Your Mode</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Human Mode Card */}
          <div
            onClick={() => setCurrentMode("human")}
            className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
              currentMode === "human"
                ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/20"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
            }`}
          >
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center text-sm font-bold">
              {currentMode === "human" ? "✓" : ""}
            </div>
            <div className="mb-3 text-blue-400">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Human Buddy Mode</h3>
            <p className="text-sm text-slate-300 mb-3">
              Connect with a peer via video call. One plays Interviewer, one plays Candidate. Real pressure, real collaboration, shared notes.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Video Call", "Shared Editor", "Co-Pilot Tools", "Panel Sim"].map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* AI Mode Card */}
          <div
            onClick={() => setCurrentMode("ai")}
            className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
              currentMode === "ai"
                ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/20"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
            }`}
          >
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center text-sm font-bold">
              {currentMode === "ai" ? "✓" : ""}
            </div>
            <div className="mb-3 text-purple-400">
              <Cpu size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">AI Buddy Mode</h3>
            <p className="text-sm text-slate-300 mb-3">
              Your always-available AI interviewer. Adaptive questions, live sentiment analysis, on-screen coaching, and a granular performance report.
            </p>
            <div className="flex flex-wrap gap-2">
              {["TTS Questions", "Live Coaching", "Adaptive AI", "24/7 Available"].map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* DSA Room Mode Card */}
          <div
            onClick={() => setDsaRoomActive(true)}
            className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
              dsaRoomActive
                ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/20"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
            }`}
          >
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center text-sm font-bold">
              {dsaRoomActive ? "✓" : ""}
            </div>
            <div className="mb-3 text-emerald-400">
              <Trophy size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">DSA Room Mode</h3>
            <p className="text-sm text-slate-300 mb-3">
              Multiplayer competitive coding. Solve problems in real-time, compete on live leaderboards, and earn speed bonuses with up to 10 players.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Multiplayer", "Live Leaderboard", "Speed Bonus", "20+ Languages"].map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIG SECTION */}
      <div className="px-10 mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          {/* AI Persona */}
          {currentMode === "ai" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">AI Persona</h3>
              <div className="grid grid-cols-2 gap-3">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPersona === persona.id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">{persona.emoji}</div>
                    <div className="text-sm font-bold">{persona.name}</div>
                    <div className="text-xs text-slate-400">{persona.style}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Human Invite */}
          {currentMode === "human" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Invite a Buddy</h3>
              <p className="text-sm text-slate-400 mb-4">
                Generate a unique session code and share it with your interview partner. Once they join, roles are assigned in the lobby.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                Session code auto-expires in 24h
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 font-bold text-blue-400 text-center text-lg tracking-widest">
                  {sessionCode}
                </div>
                <button
                  onClick={copyCode}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition"
                >
                  Copy
                </button>
              </div>
              <button className="w-full mt-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition">
                Share Link Instead
              </button>
            </div>
          )}

          {/* Topics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Topic Focus</h3>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTopics.includes(topic)
                      ? "bg-blue-500/30 border border-blue-500 text-blue-300"
                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty & Duration */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Difficulty</h3>
              <div className="flex gap-3">
                {["Easy", "Medium", "Hard"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedDifficulty(level.toLowerCase())}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDifficulty === level.toLowerCase()
                        ? level === "Easy"
                          ? "bg-emerald-500/30 border border-emerald-500 text-emerald-300"
                          : level === "Medium"
                          ? "bg-yellow-500/30 border border-yellow-500 text-yellow-300"
                          : "bg-red-500/30 border border-red-500 text-red-300"
                        : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">⧖ Session Duration</h3>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                  className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-sm font-bold text-blue-400 min-w-max">{sessionDuration}m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-800 mx-10 mb-8"></div>

      {/* FEATURES GRID */}
      <div className="px-10 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-xl border transition-all hover:-translate-y-1 ${
                feature.type === "human"
                  ? "border-blue-500/30 bg-blue-500/5"
                  : feature.type === "ai"
                  ? "border-purple-500/30 bg-purple-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
              }`}
            >
              <div className="text-2xl mb-2 text-slate-400">
                <feature.icon size={24} />
              </div>
              <h4 className="font-bold text-sm mb-1">{feature.title}</h4>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">{feature.desc}</p>
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                  feature.type === "human"
                    ? "bg-blue-500/20 text-blue-300"
                    : feature.type === "ai"
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {feature.type === "human" ? "Human Mode" : feature.type === "ai" ? "AI Mode" : "Both Modes"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-800 mx-10 mb-8"></div>

      {/* RECENT SESSIONS */}
      <div className="px-10 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">Recent Sessions</h2>
          <button className="px-4 py-2 text-sm font-medium hover:text-blue-400 transition">
            View All →
          </button>
        </div>

        <div className="space-y-3">
          {recentSessions.map((session, idx) => (
            <div
              key={idx}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    session.type === "human" ? "bg-blue-500" : "bg-purple-500"
                  }`}
                ></div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{session.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{session.meta}</div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`font-bold text-lg ${
                      session.scoreType === "good" ? "text-emerald-400" : "text-yellow-400"
                    }`}
                  >
                    {session.score}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{session.label}</div>
                </div>
                <div className="flex gap-2">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                    Stats
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                    ▶️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg mx-4 p-8 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition text-slate-400"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black mb-2">Start New Session</h2>
            <p className="text-sm text-slate-400 mb-6">
              {currentMode === "human"
                ? "Setting up a Human Buddy session. Share the code with your interview partner."
                : "Your AI interviewer is ready. Confirm settings and go live instantly."}
            </p>

            {currentMode === "human" ? (
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <div className="text-sm font-bold">Share your session code</div>
                      <div className="text-xs text-slate-400">
                        Send this code or link to your buddy. They enter it on their PrepPath dashboard.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 font-bold text-blue-400 text-center tracking-widest">
                    {sessionCode || "IB-XXXXX"}
                  </div>
                  <button
                    onClick={copyCode}
                    disabled={!sessionCode || isLoading}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Loading..." : "Copy"}
                  </button>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <div className="text-sm font-bold">Assign roles in the Lobby</div>
                      <div className="text-xs text-slate-400">
                        Once both join, choose who is Interviewer and who is Candidate. The Interviewer gets the Co-Pilot panel.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      3
                    </div>
                    <div>
                      <div className="text-sm font-bold">Go live</div>
                      <div className="text-xs text-slate-400">
                        Video, shared editor, signal cards, and live notes all activate when both participants are ready.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <div className="text-sm font-bold">Confirm your persona & topic</div>
                      <div className="text-xs text-slate-400">
                        Selected: {personas.find((p) => p.id === selectedPersona)?.name} · {selectedTopics[0]} · {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)} · {sessionDuration} min
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <div className="text-sm font-bold">Optional: Upload a Job Description</div>
                      <div className="text-xs text-slate-400">
                        Drop a JD and the AI generates questions tailored to that exact role and company.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center text-slate-400 text-sm cursor-pointer hover:border-slate-600 transition">
                  Drop JD here or <span className="text-blue-400">browse</span> &nbsp;·&nbsp; Optional
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      3
                    </div>
                    <div>
                      <div className="text-sm font-bold">Allow microphone access</div>
                      <div className="text-xs text-slate-400">
                        Required for speech-to-text analysis and live sentiment feedback.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSession}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Loading..." : currentMode === "human" ? "Enter Lobby" : "Start AI Session"}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </>
  );
};

export default InterviewBuddy;
