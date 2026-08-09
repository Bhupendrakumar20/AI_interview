// components/HomeClient.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  Bot,
  Play,
  CheckCircle2,
  Activity,
  Video,
  Zap,
  BookOpen,
  Award,
  ChevronRight,
  Code2,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturedCard from "@/components/FeaturedCard";
import InterviewCard from "@/components/InterviewCard";
import QuickAccess from "@/components/QuickAccess";
import ChallengeSection from "@/components/ChallengeSection";
import StatsOverview from "@/components/StatsOverview";

export default function HomeClient({ latestInterviews = [], userInterviews = [], user = null }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeSandboxTab, setActiveSandboxTab] = useState("coding"); // 'coding' | 'interview'
  const [typingStep, setTypingStep] = useState(0);
  const containerRef = useRef(null);

  // Mouse move handler for spotlight glow effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Simulator typing loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingStep((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const featuredItems = [
    {
      title: "One Day Internship",
      company: "with Ankit",
      description: "Quick internship opportunity to gain real-world experience",
      type: "internship",
      buttonText: "Apply Now",
      badge: "One Day"
    },
    {
      title: "Quest Ingenium",
      company: "Solving the world's hardest engineering problems",
      description: "Win prizes and get engineering facility visits",
      type: "competition",
      prize: "₹2,00,000+",
      stats: ["2,00,000+ Runners-Up", "1,60,000+ Overviews", "Engineering Facility Visit"],
      buttonText: "Register Now"
    },
    {
      title: "tbo.com",
      description: "Stand a chance to win Rs 3 lacs prize money and gain interview opportunities",
      type: "competition",
      prize: "₹3,00,000",
      buttonText: "Learn More"
    },
    {
      title: "Unstop Talent Awards",
      description: "Unstoppable Talent. Unmatched Impact.",
      type: "award",
      buttonText: "View Awards"
    }
  ];

  // Simulator code steps
  const codeSteps = [
    { code: "def twoSum(nums, target):\n    # Looking for solution...", output: "Running test cases..." },
    { code: "def twoSum(nums, target):\n    seen = {}\n    # Map items...", output: "Running test cases..." },
    { code: "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):", output: "Evaluating indices..." },
    { code: "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num", output: "Checking lookup table..." },
    { code: "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]", output: "All checks completed..." },
    { code: "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i", output: "Success: All Test Cases Passed (0ms)" }
  ];

  // Simulator chat steps
  const chatSteps = [
    { speaker: "AI Interviewer", text: "Can you explain the difference between a process and a thread?" },
    { speaker: "Candidate", text: "A process represents a program execution with its own dedicated memory space..." },
    { speaker: "AI Interviewer", text: "Excellent. How do threads of the same process interact?" },
    { speaker: "Candidate", text: "They share the process memory heap, allowing fast communication but requiring synchronization." },
    { speaker: "AI Evaluation", text: "Accuracy: 95% • Pacing: Optimal • Communication: Structured (STAR)" },
    { speaker: "AI Evaluation", text: "Overall Impression: Excellent (Score: 92/100)" }
  ];

  const inlineStyles = `
    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); opacity: 0.2; }
      50% { transform: scale(1.15); opacity: 0.35; }
    }
    @keyframes borderBeam {
      0% { offset-distance: 0%; }
      100% { offset-distance: 100%; }
    }
    @keyframes floatElement {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    .hero-glow {
      animation: pulseGlow 8s ease-in-out infinite;
    }
    .float-item {
      animation: floatElement 4s ease-in-out infinite;
    }
    .spotlight-card {
      position: relative;
      overflow: hidden;
    }
    .spotlight-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(800px circle at var(--x, 0) var(--y, 0), rgba(99, 102, 241, 0.08), transparent 40%);
      pointer-events: none;
      z-index: 10;
    }
  `;

  return (
    <div ref={containerRef} className="space-y-16 pb-16 spotlight-card" style={{
      "--x": `${mousePosition.x}px`,
      "--y": `${mousePosition.y}px`
    }}>
      <style>{inlineStyles}</style>

      {/* Hero Section - Inspired by Noomo/Framer */}
      <section className="relative flex flex-col items-center justify-center text-center pt-10 pb-8 min-h-[50vh] overflow-hidden rounded-3xl bg-slate-950 border border-slate-900 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary rounded-full blur-[120px] hero-glow pointer-events-none -z-10" />

        <div className="relative z-10 space-y-6 px-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-indigo-400 font-bold uppercase tracking-widest shadow-md">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            PrepWise Engine v2.0 Online
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight">
            Design Your <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Career Path</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Unleash interactive coding simulations, practice structured voice interviews, optimize resumes, and track live analytical progression on our next-gen candidate platform.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/interview" className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/10 hover:translate-y-[-2px] transition-all cursor-pointer">
              Launch Simulator <ArrowRight size={16} />
            </Link>
            <Link href="/100-days-of-code" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white font-bold py-3.5 px-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
              Start Coding Challenge <Zap size={16} className="text-amber-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Sandbox - Live Previews of platform components */}
      <section className="grid lg:grid-cols-12 gap-8 items-center bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lg">
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} /> Realtime Sandbox
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            See the Platform in Action
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            PrepWise replicates real technical scenarios. Switch between tabs to see the terminal code compiler or the voice/conversational interview evaluator.
          </p>
          
          <div className="flex border-b border-border text-sm">
            <button 
              onClick={() => setActiveSandboxTab("coding")} 
              className={`flex-1 pb-3 font-bold border-b-2 transition-all cursor-pointer ${
                activeSandboxTab === "coding" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Code Execution
            </button>
            <button 
              onClick={() => setActiveSandboxTab("interview")} 
              className={`flex-1 pb-3 font-bold border-b-2 transition-all cursor-pointer ${
                activeSandboxTab === "interview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Oral Evaluator
            </button>
          </div>
        </div>

        {/* Sandbox Screen */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-2xl relative min-h-[300px]">
          {activeSandboxTab === "coding" ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 text-slate-500">
                <div className="flex items-center gap-2">
                  <Terminal size={14} />
                  <span>solution.py</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
              </div>
              <pre className="text-slate-300 min-h-[140px] leading-relaxed select-none">
                {codeSteps[typingStep].code}
              </pre>
              <div className="border-t border-slate-900 pt-3 flex items-center justify-between text-slate-400">
                <span>Output:</span>
                <span className={codeSteps[typingStep].output.includes("Success") ? "text-emerald-400 font-bold" : "text-amber-400 font-medium"}>
                  {codeSteps[typingStep].output}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 text-slate-500">
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-indigo-400" />
                  <span>Interactivity Session</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">Evaluation Live</span>
              </div>
              <div className="space-y-3 min-h-[180px] overflow-y-auto">
                {chatSteps.slice(0, (typingStep % 4) + 3).map((chat, idx) => {
                  const isEval = chat.speaker === "AI Evaluation";
                  const isAI = chat.speaker === "AI Interviewer";
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                        isEval 
                          ? "bg-indigo-950/40 border border-indigo-850 text-indigo-200 ml-auto font-medium"
                          : isAI
                          ? "bg-slate-900 text-slate-300 mr-auto"
                          : "bg-primary text-white ml-auto"
                      }`}
                    >
                      <div className="font-bold text-[10px] opacity-70 mb-1">{chat.speaker}</div>
                      <p>{chat.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured Section */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Featured Opportunities</h2>
            <p className="text-sm text-muted-foreground mt-1">Direct corporate integrations, internships, and challenges</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredItems.map((item, index) => (
            <FeaturedCard key={index} {...item} />
          ))}
        </div>
      </section>

      {/* Quick Access Grid */}
      <QuickAccess />

      {/* Dynamic Statistics Panel */}
      <StatsOverview />

      {/* 100 Days Challenge Card */}
      <ChallengeSection />

      {/* Recent Interviews Feed */}
      {latestInterviews.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Recent Sessions</h2>
              <p className="text-sm text-muted-foreground mt-1">Review feedback on recent mock setups</p>
            </div>
            <Link href="/interview" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestInterviews.slice(0, 3).map((interview) => (
              <InterviewCard
                key={interview.id}
                interviewId={interview.id}
                userId={interview.userId}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))}
          </div>
        </section>
      )}

      {/* Personal History */}
      {user && userInterviews.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Your History</h2>
              <p className="text-sm text-muted-foreground mt-1">Quick links to your previous interview evaluations</p>
            </div>
            <Link href="/dashboard/sessions" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userInterviews.slice(0, 3).map((interview) => (
              <InterviewCard
                key={interview.id}
                interviewId={interview.id}
                userId={interview.userId}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
