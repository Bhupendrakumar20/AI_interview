"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Briefcase, Users, Rocket, Award, FolderOpen, AlertCircle, FileText, Brain, Radio, BarChart3, Code, Video, FileJson, Film, Trophy, Cpu, Eye } from "lucide-react";
import AiBuddyInterviewSession from "./AiBuddyInterviewSession";
import AiBuddyResultsScreen from "./AiBuddyResultsScreen";

const ComingSoonScreen = ({ title, icon: Icon, desc, onClose }) => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-6 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -z-10"></div>
    <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-br from-purple-500/10 to-transparent rounded-full blur-3xl -z-10"></div>
    <div className="max-w-7xl mx-auto w-full">
      <button onClick={onClose} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm cursor-pointer bg-transparent border-0">
        <span className="text-lg">←</span> Back to Mode Selection
      </button>
    </div>
    <div className="max-w-2xl mx-auto text-center my-auto flex flex-col items-center">
      <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/10 animate-pulse">
        <Icon size={40} className="text-blue-400" />
      </div>
      <span className="text-xs font-bold tracking-widest text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full mb-4">
        Coming Soon
      </span>
      <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-slate-300 text-lg mb-8 max-w-md">
        {desc}
      </p>
      <button onClick={onClose} className="px-6 py-3 rounded-lg bg-linear-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition hover:scale-105 cursor-pointer border-0">
        Try AI Buddy Mode instead
      </button>
    </div>
    <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500">
      PrepWise · Shaping the future of technical interview prep
    </div>
  </div>
);

const InterviewBuddy = ({ userId }) => {
  const [currentMode, setCurrentMode] = useState("ai");
  const [selectedPersona, setSelectedPersona] = useState("hiring-manager");
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [sessionDuration, setSessionDuration] = useState(30);
  const [selectedTopics, setSelectedTopics] = useState(["DSA", "System Design", "OOP"]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionCode, setSessionCode] = useState(null);
  const [inviteLink, setInviteLink] = useState(null); // 🔗 NEW: Store invite link
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isHumanBuddyActive, setIsHumanBuddyActive] = useState(false);
  const [isSessionOwner, setIsSessionOwner] = useState(false); // 🔥 NEW: Track if user created or joined
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  const [dsaRoomActive, setDsaRoomActive] = useState(false);
  const [modalTab, setModalTab] = useState("create"); // "create" or "join"
  const [joinCode, setJoinCode] = useState("");
  const [showPastReports, setShowPastReports] = useState(false); // ✅ NEW: Past reports view
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState(null); // ✅ NEW: Detailed session view
  const [pastReportsFilter, setPastReportsFilter] = useState("all"); // ✅ NEW: Filter (all, ai, human)
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
      setInviteLink(data.inviteLink); // 🔗 NEW: Store invite link

      // If AI mode, start interview immediately
      if (currentMode === "ai") {
        setIsInterviewActive(true);
        setIsModalOpen(false);
        toast.success("AI Interview started! Questions are loading...");
      } else if (currentMode === "human") {
        // If human mode, start human buddy session
        setIsSessionOwner(true); // 🔥 User created the session, they are the owner
        setIsHumanBuddyActive(true);
        setIsModalOpen(false);
        toast.success("Session created! Share the invite link with your buddy.");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = async (inputCode) => {
    if (!userId) {
      toast.error("Please log in first");
      return;
    }

    if (!inputCode || !inputCode.trim()) {
      toast.error("Please paste a link or code");
      return;
    }

    // 🔗 Extract code from link or use plain code
    let sessionCode = inputCode.trim().toUpperCase();
    
    // Check if it's a link containing /interview/buddy/
    if (inputCode.includes('/interview/buddy/')) {
      // Extract code from link
      const match = inputCode.match(/\/interview\/buddy\/(IB-[A-Z0-9]{5})/);
      if (match && match[1]) {
        sessionCode = match[1];
        console.log(`🔗 [handleJoinSession] Extracted code from link: ${sessionCode}`);
        
        // Route to invite link instead of using join API
        window.location.href = `/interview/buddy/${sessionCode}`;
        return;
      }
    }

    // Use join-session API for plain codes
    setIsLoading(true);
    try {
      const response = await fetch("/api/interview-buddy/join-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionCode: sessionCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join session");
      }

      const data = await response.json();
      setSessionCode(data.sessionCode);
      setActiveSessionId(data.sessionId);
      setIsSessionOwner(false); // 🔥 User joined an existing session, they are NOT the owner
      setIsHumanBuddyActive(true);
      setIsModalOpen(false);
      toast.success("Joined session! Starting buddy call...");
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
  const recentSessions = (stats.recentSessions || []).map(session => {
    let dateStr = "Date unknown";
    try {
      const date = new Date(session.createdAt);
      if (!isNaN(date.getTime())) {
        dateStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (e) {
      console.error("Error parsing date:", session.createdAt, e);
    }

    const score = session.score !== null && session.score !== undefined ? Math.round(session.score) : 0;
    
    return {
      type: session.mode,
      title: `${session.mode === 'ai' ? 'AI Buddy' : 'Human Buddy'} · ${session.topics?.[0] || 'Interview'} Round`,
      meta: `${session.persona || session.mode} · ${session.difficulty} · ${session.duration || 0} min · ${dateStr}`,
      score: `${score}%`,
      scoreType: score >= 80 ? "good" : "mid",
      label: "Overall Score",
    };
  });

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

  const handleSessionEnd = async (results) => {
    try {
      // Save session results to Firebase
      if (activeSessionId) {
        // Priority: AI feedback score > manual score > 0
        const scoreToSave = results.feedback?.totalScore !== undefined 
          ? results.feedback.totalScore
          : (results.score || 0);

        console.log('[InterviewBuddy] Saving session results:', {
          sessionId: activeSessionId,
          score: scoreToSave,
          hasFeedback: !!results.feedback,
          feedbackTotalScore: results.feedback?.totalScore,
          resultsScore: results.score,
        });

        // Clean the feedback object before sending (only keep serializable fields)
        const cleanedFeedback = results.feedback ? {
          totalScore: results.feedback.totalScore,
          categoryScores: results.feedback.categoryScores,
          strengths: results.feedback.strengths,
          areasForImprovement: results.feedback.areasForImprovement,
          finalAssessment: results.feedback.finalAssessment,
        } : null;

        const requestBody = {
          status: "completed",
          score: scoreToSave,
          feedback: cleanedFeedback,
          transcriptUrl: null,
        };

        console.log('[InterviewBuddy] Request payload ready:', {
          status: requestBody.status,
          score: requestBody.score,
          feedbackKeys: cleanedFeedback ? Object.keys(cleanedFeedback) : null,
        });

        const response = await fetch(
          `/api/interview-buddy/sessions/${activeSessionId}/update`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );

        console.log(`[InterviewBuddy] Response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.text();
          console.error("❌ Failed to save session results");
          console.error("   Status:", response.status);
          console.error("   Response:", errorData);
          
          // Still show results even if save fails, but warn user
          toast.warning("Session completed but results may not be saved. Try refreshing.");
        } else {
          const savedData = await response.json();
          console.log("✅ Session results saved to Firebase:", {
            score: savedData.score,
            status: savedData.status,
          });
          // Refresh stats to show updated session
          await fetchStats();
        }
      }

      setSessionResults(results);
      setShowResults(true);
      setIsInterviewActive(false);
    } catch (error) {
      console.error("❌ Error in handleSessionEnd:", error);
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
      // Still show results even if save fails
      setSessionResults(results);
      setShowResults(true);
      setIsInterviewActive(false);
      toast.error("Error saving session: " + error.message);
    }
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
        <ComingSoonScreen
          title="DSA Room Mode"
          icon={Trophy}
          desc="We are rebuilding the LeetCode-style competitive multiplayer rooms. This feature is currently offline while we deploy a highly optimized execution engine."
          onClose={() => setDsaRoomActive(false)}
        />
      ) : isHumanBuddyActive ? (
        <ComingSoonScreen
          title="Human Buddy Mode"
          icon={Users}
          desc="We are currently upgrading peer-to-peer audio/video connection systems. This feature is offline while we integrate our new robust WebRTC signaling servers."
          onClose={() => setIsHumanBuddyActive(false)}
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
            <button 
              onClick={() => setShowPastReports(true)}
              className="px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium hover:bg-slate-700 transition hover:shadow-md hover:shadow-slate-700/50">
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
            onClick={() => setIsHumanBuddyActive(true)}
            className="relative p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50 cursor-pointer transition-all opacity-85 hover:opacity-100"
          >
            <span className="absolute top-4 right-4 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              Coming Soon
            </span>
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
            className="relative p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50 cursor-pointer transition-all opacity-85 hover:opacity-100"
          >
            <span className="absolute top-4 right-4 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Coming Soon
            </span>
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
          <button 
            onClick={() => setShowPastReports(true)}
            className="px-4 py-2 text-sm font-medium hover:text-blue-400 transition flex items-center gap-1"
          >
            <Eye size={16} />
            View All →
          </button>
        </div>

        <div className="space-y-3">
          {recentSessions.map((session, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedSessionForDetail(stats.recentSessions[idx])}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500/50 cursor-pointer transition-all hover:bg-slate-900/80 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    session.type === "human" ? "bg-blue-500" : "bg-purple-500"
                  }`}
                ></div>
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {session.type === "human" ? (
                      <Users size={16} className="text-blue-400" />
                    ) : (
                      <Brain size={16} className="text-purple-400" />
                    )}
                    {session.title}
                  </div>
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
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSessionForDetail(stats.recentSessions[idx]);
                      setShowPastReports(true);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 transition border border-blue-500/30"
                    title="View Stats"
                  >
                    <BarChart3 size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSessionForDetail(stats.recentSessions[idx]);
                      setShowPastReports(true);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition border border-emerald-500/30"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}  
        </div>
      </div>

      {/* MODAL */}
      {/* PAST REPORTS MODAL */}
      {showPastReports && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen bg-linear-to-b from-slate-950 to-slate-900">
            {/* HEADER */}
            <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 z-40">
              <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">📊 Interview Performance</h2>
                  <p className="text-sm text-slate-400 mt-1">Analyze your past interviews and track your growth</p>
                </div>
                <button
                  onClick={() => {
                    setShowPastReports(false);
                    setSelectedSessionForDetail(null);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition text-slate-300"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-6xl mx-auto px-6 py-8">
              {!selectedSessionForDetail ? (
                <>
                  {/* OVERVIEW STATS */}
                  <div className="grid md:grid-cols-4 gap-4 mb-8">
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition">
                      <div className="text-sm text-slate-400 mb-2">Total Interviews</div>
                      <div className="text-4xl font-black text-blue-400">{stats.totalSessions}</div>
                      <div className="text-xs text-slate-500 mt-2">All time</div>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition">
                      <div className="text-sm text-slate-400 mb-2">Completed</div>
                      <div className="text-4xl font-black text-emerald-400">{stats.completedSessions}</div>
                      <div className="text-xs text-slate-500 mt-2">{stats.totalSessions > 0 ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}% completion rate</div>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition">
                      <div className="text-sm text-slate-400 mb-2">Average Score</div>
                      <div className="text-4xl font-black text-purple-400">{stats.avgScore}%</div>
                      <div className="text-xs text-slate-500 mt-2">Based on {stats.completedSessions} interviews</div>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-yellow-500/50 transition">
                      <div className="text-sm text-slate-400 mb-2">Practice Time</div>
                      <div className="text-3xl font-black text-yellow-400">{stats.totalPracticeTime > 60 ? Math.floor(stats.totalPracticeTime / 60) + 'h' : stats.totalPracticeTime + 'm'}</div>
                      <div className="text-xs text-slate-500 mt-2">Total invested</div>
                    </div>
                  </div>

                  {/* CATEGORY BREAKDOWN */}
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* MODE BREAKDOWN */}
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Brain size={20} className="text-blue-400" />
                        Sessions by Mode
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm text-slate-300">Human Buddy</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-400">{stats.sessionsByMode?.human || 0}</span>
                            <span className="text-xs text-slate-500">({stats.totalSessions > 0 ? Math.round(((stats.sessionsByMode?.human || 0) / stats.totalSessions) * 100) : 0}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-sm text-slate-300">AI Buddy</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-400">{stats.sessionsByMode?.ai || 0}</span>
                            <span className="text-xs text-slate-500">({stats.totalSessions > 0 ? Math.round(((stats.sessionsByMode?.ai || 0) / stats.totalSessions) * 100) : 0}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DIFFICULTY BREAKDOWN */}
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Trophy size={20} className="text-yellow-400" />
                        Sessions by Difficulty
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-sm text-slate-300">Easy</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">{stats.sessionsByDifficulty?.easy || 0}</span>
                            <span className="text-xs text-slate-500">({stats.totalSessions > 0 ? Math.round(((stats.sessionsByDifficulty?.easy || 0) / stats.totalSessions) * 100) : 0}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-sm text-slate-300">Medium</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-yellow-400">{stats.sessionsByDifficulty?.medium || 0}</span>
                            <span className="text-xs text-slate-500">({stats.totalSessions > 0 ? Math.round(((stats.sessionsByDifficulty?.medium || 0) / stats.totalSessions) * 100) : 0}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm text-slate-300">Hard</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-red-400">{stats.sessionsByDifficulty?.hard || 0}</span>
                            <span className="text-xs text-slate-500">({stats.totalSessions > 0 ? Math.round(((stats.sessionsByDifficulty?.hard || 0) / stats.totalSessions) * 100) : 0}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TOPICS COVERED */}
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 mb-8">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Code size={20} className="text-cyan-400" />
                      Topics Covered ({stats.topicsCovered?.length || 0})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {stats.topicsCovered && stats.topicsCovered.length > 0 ? (
                        stats.topicsCovered.map((topic, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:border-cyan-500/50 transition"
                          >
                            {topic}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">No topics covered yet</p>
                      )}
                    </div>
                  </div>

                  {/* FILTER TABS */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setPastReportsFilter("all")}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                        pastReportsFilter === "all"
                          ? "bg-slate-700 border border-slate-600 text-white"
                          : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      All Sessions ({stats.totalSessions})
                    </button>
                    <button
                      onClick={() => setPastReportsFilter("ai")}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                        pastReportsFilter === "ai"
                          ? "bg-purple-500/30 border border-purple-500 text-purple-300"
                          : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      AI Sessions ({stats.sessionsByMode?.ai || 0})
                    </button>
                    <button
                      onClick={() => setPastReportsFilter("human")}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                        pastReportsFilter === "human"
                          ? "bg-blue-500/30 border border-blue-500 text-blue-300"
                          : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      Human Sessions ({stats.sessionsByMode?.human || 0})
                    </button>
                  </div>

                  {/* RECENT SESSIONS LIST */}
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <BarChart3 size={20} className="text-slate-400" />
                      Session History
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {stats.recentSessions && stats.recentSessions.length > 0 ? (
                        stats.recentSessions
                          .filter((session) => {
                            if (pastReportsFilter === "all") return true;
                            return session.mode === pastReportsFilter;
                          })
                          .map((session, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedSessionForDetail(session)}
                              className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 hover:bg-slate-800/80 cursor-pointer transition"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                      session.mode === "ai" ? "bg-purple-500" : "bg-blue-500"
                                    }`}></div>
                                    <span className="font-bold text-sm">
                                      {session.mode === "ai" ? "🤖 AI Interview" : "👥 Human Buddy"}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      • {session.difficulty || "Unknown"}
                                    </span>
                                  </div>
                                  <div className="text-sm text-slate-400 mb-2">
                                    {session.topic || session.topics || "Mixed Topics"}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {session.date || new Date(session.createdAt).toLocaleDateString()} • {session.duration || 'N/A'} min
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div
                                    className={`text-3xl font-black ${
                                      (session.score || 0) >= 75
                                        ? "text-emerald-400"
                                        : (session.score || 0) >= 50
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {session.score || 0}%
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">Score</div>
                                  <button className="mt-3 px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs font-medium transition">
                                    View Details →
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-slate-400 mb-2">No sessions found</p>
                          <p className="text-xs text-slate-500">Start an interview to see your performance reports here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* DETAILED SESSION VIEW */
                <div>
                  <button
                    onClick={() => setSelectedSessionForDetail(null)}
                    className="mb-6 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium hover:bg-slate-700 transition"
                  >
                    ← Back to Reports
                  </button>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="md:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800">
                      <h3 className="text-xl font-bold mb-4">Session Details</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Mode</div>
                          <div className="text-sm font-medium">
                            {selectedSessionForDetail.mode === "ai" ? "🤖 AI Interview" : "👥 Human Buddy"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Topic</div>
                          <div className="text-sm font-medium">{selectedSessionForDetail.topic || selectedSessionForDetail.topics || "Mixed Topics"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Difficulty</div>
                          <div className="text-sm font-medium capitalize">{selectedSessionForDetail.difficulty || "Unknown"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Duration</div>
                          <div className="text-sm font-medium">{selectedSessionForDetail.duration || 'N/A'} minutes</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Date</div>
                          <div className="text-sm font-medium">{selectedSessionForDetail.date || new Date(selectedSessionForDetail.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                      <h3 className="text-xl font-bold mb-4">Performance</h3>
                      <div className="text-5xl font-black mb-2" style={{
                        color: (selectedSessionForDetail.score || 0) >= 75 ? '#10b981' : (selectedSessionForDetail.score || 0) >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {selectedSessionForDetail.score || 0}%
                      </div>
                      <div className="text-sm text-slate-400 mb-6">
                        {(selectedSessionForDetail.score || 0) >= 75 ? "Excellent Performance" : (selectedSessionForDetail.score || 0) >= 50 ? "Good Performance" : "Needs Improvement"}
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
                        <div
                          className="bg-linear-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${selectedSessionForDetail.score || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400">Based on technical correctness, communication, problem-solving, and confidence.</p>
                    </div>
                  </div>

                  {selectedSessionForDetail.feedback && (
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                      <h3 className="text-lg font-bold mb-4">📋 Feedback Summary</h3>
                      <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
                        <p>{selectedSessionForDetail.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN SESSION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg mx-4 p-8 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setModalTab("create");
                setJoinCode("");
              }}
              className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition text-slate-400"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black mb-2">
              {currentMode === "human" ? "Human Buddy Session" : "Start New Session"}
            </h2>

            {/* TABS FOR HUMAN MODE */}
            {currentMode === "human" && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    setModalTab("create");
                    setJoinCode("");
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                    modalTab === "create"
                      ? "bg-blue-500/30 border border-blue-500 text-blue-300"
                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  Create Session
                </button>
                <button
                  onClick={() => setModalTab("join")}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                    modalTab === "join"
                      ? "bg-purple-500/30 border border-purple-500 text-purple-300"
                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  Join Session
                </button>
              </div>
            )}

            <p className="text-sm text-slate-400 mb-6">
              {currentMode === "ai"
                ? "Your AI interviewer is ready. Confirm settings and go live instantly."
                : modalTab === "create"
                ? "Setting up a Human Buddy session. Share the code with your interview partner."
                : "Have an invite code or link? Paste it below to join your buddy's session."}
            </p>

            {/* CREATE SESSION TAB */}
            {(currentMode === "ai" || modalTab === "create") && (
              <div className="space-y-4">
                {currentMode === "human" && (
                  <>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex gap-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          1
                        </div>
                        <div>
                          <div className="text-sm font-bold">🔗 Share this invite link</div>
                          <div className="text-xs text-slate-400">
                            Your buddy just needs to click the link - no code to enter!
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* INVITE LINK */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-blue-400 break-all overflow-hidden">
                        {inviteLink || "https://ai-interview.com/interview/buddy/IB-XXXXX"}
                      </div>
                      <button
                        onClick={() => {
                          if (inviteLink) {
                            navigator.clipboard.writeText(inviteLink);
                            toast.success("Invite link copied!");
                          }
                        }}
                        disabled={!inviteLink || isLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isLoading ? "Loading..." : "Copy Link"}
                      </button>
                    </div>

                    {/* SESSION CODE (BACKUP) */}
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-2">Or share the code:</div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-blue-400 text-center tracking-widest">
                          {sessionCode || "IB-XXXXX"}
                        </div>
                        <button
                          onClick={() => {
                            if (sessionCode) {
                              navigator.clipboard.writeText(sessionCode);
                              toast.success("Code copied!");
                            }
                          }}
                          disabled={!sessionCode}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-linear-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          2
                        </div>
                        <div>
                          <div className="text-sm font-bold">Assign roles in the Lobby</div>
                          <div className="text-xs text-slate-400">
                            Once both join, choose who is Interviewer and who is Candidate.
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
                            Video, camera, mic, screen share, and shared notes all activate.
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {currentMode === "ai" && (
                  <>
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
                            Drop a JD and AI generates tailored questions.
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
                            Required for speech-to-text analysis.
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* JOIN SESSION TAB */}
            {currentMode === "human" && modalTab === "join" && (
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      �
                    </div>
                    <div>
                      <div className="text-sm font-bold">Paste the invite link or code</div>
                      <div className="text-xs text-slate-400">
                        Your buddy will share either an invite link or a code like "IB-7X4K9".
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Paste link (https://...) or code (IB-7X4K9)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-center text-sm"
                />

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    ✓ If you have a link, we'll extract the code automatically
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    ✓ Once you join, the session creator will assign your role (Interviewer or Interviewee).
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    ✓ Video, camera, mic, and screen sharing will be available once both of you connect.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setModalTab("create");
                  setJoinCode("");
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (currentMode === "human" && modalTab === "join") {
                    handleJoinSession(joinCode);
                  } else {
                    handleStartSession();
                  }
                }}
                disabled={
                  isLoading ||
                  (currentMode === "human" && modalTab === "join" && !joinCode.trim())
                }
                className="flex-1 px-4 py-2.5 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? "Loading..."
                  : currentMode === "human"
                  ? modalTab === "create"
                    ? "Enter Lobby"
                    : `Join Session`
                  : "Start AI Session"}
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
