// components/AnalyticsClient.jsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Award,
  BookOpen,
  Sparkles,
  Clock,
  ChevronRight,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  Activity,
  FileText,
  Brain,
  Zap
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import dayjs from "dayjs";

// Helper function to safely format dates
const formatDate = (dateVal) => {
  if (!dateVal) return "N/A";
  return dayjs(dateVal).format("MMM D, YYYY");
};

// High-quality static fallback data for a premium first impression
const DEMO_FEEDBACKS = [
  {
    id: "demo-1",
    totalScore: 88,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    finalAssessment: "Excellent problem solving and command over core Javascript concepts. Communication was structured, though pacing could be improved slightly when describing complex algorithm design.",
    categoryScores: [
      { name: "Technical Accuracy", score: 90, comment: "Understood closures and prototypic inheritance very well." },
      { name: "Communication", score: 85, comment: "Structured explanation using the STAR method." },
      { name: "Clarity", score: 88, comment: "Spoke clearly and paced explanations logically." },
      { name: "Confidence", score: 92, comment: "Maintained strong composure under questioning." },
      { name: "Pacing", score: 80, comment: "Rushed slightly during the coding implementation phase." }
    ],
    strengths: ["Strong understanding of closures", "Structured response formatting", "Highly confident delivery"],
    areasForImprovement: ["Slow down during live coding execution", "Explain space complexity more explicitly"],
    role: "Frontend Engineer"
  },
  {
    id: "demo-2",
    totalScore: 82,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2 days ago
    finalAssessment: "Good attempt on the system design round. Showed nice scalability insights but need to focus more on caching strategies and databases trade-offs.",
    categoryScores: [
      { name: "Technical Accuracy", score: 80, comment: "Nice system layout but database replication explanations were weak." },
      { name: "Communication", score: 84, comment: "Expressed ideas well but missed drawing structural blocks verbally." },
      { name: "Clarity", score: 82, comment: "Clean and easy to follow explanation." },
      { name: "Confidence", score: 85, comment: "Seemed very comfortable with server scaling concepts." },
      { name: "Pacing", score: 83, comment: "Pacing was good throughout." }
    ],
    strengths: ["Scalability layout concepts", "Excellent database sharding intuition"],
    areasForImprovement: ["Read more on caching layer evictions", "Focus on single point of failure (SPOF) mitigation"],
    role: "Fullstack Developer"
  },
  {
    id: "demo-3",
    totalScore: 75,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), // 5 days ago
    finalAssessment: "Solid performance on coding questions, but struggled to explain the recursive transition formula. Communication was somewhat disjointed under pressure.",
    categoryScores: [
      { name: "Technical Accuracy", score: 78, comment: "Solved the array problem but struggled with optimization." },
      { name: "Communication", score: 70, comment: "Struggled to verbalize thought process while coding." },
      { name: "Clarity", score: 72, comment: "Mumbled slightly when tracing recursive branches." },
      { name: "Confidence", score: 75, comment: "Showed moderate nervousness during the dry-run." },
      { name: "Pacing", score: 80, comment: "Managed time reasonably well." }
    ],
    strengths: ["Correct brute-force logic implementation", "Clean variable naming convention"],
    areasForImprovement: ["Practice thinking out loud", "Avoid long periods of silence during problem solving"],
    role: "Software Engineer"
  },
  {
    id: "demo-4",
    totalScore: 71,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), // 10 days ago
    finalAssessment: "First attempt was promising but highlighted crucial gaps in tree traversal techniques and asymptotic complexity calculation.",
    categoryScores: [
      { name: "Technical Accuracy", score: 68, comment: "Could not write correct iterative DFS code." },
      { name: "Communication", score: 72, comment: "Good attempt at discussing trade-offs." },
      { name: "Clarity", score: 70, comment: "Needed prompts to keep explanations organized." },
      { name: "Confidence", score: 73, comment: "A bit hesitant when questioned on time complexity." },
      { name: "Pacing", score: 75, comment: "Spent too much time on edge case discussions early on." }
    ],
    strengths: ["Willingness to accept hints", "Expressed edge cases early"],
    areasForImprovement: ["Review recursion and stack space mechanics", "Practice writing DFS/BFS recursively first"],
    role: "Backend Engineer"
  }
];

export default function AnalyticsClient({ dbInterviews = [], dbFeedbacks = [] }) {
  const [timeRange, setTimeRange] = useState("all"); // 'all' | 'last-3' | 'last-5'
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'skills' | 'recommendations'

  // Determine if using demo data
  const isDemoData = !dbFeedbacks || dbFeedbacks.length === 0;
  
  // Choose dataset
  const feedbacks = useMemo(() => {
    if (isDemoData) return DEMO_FEEDBACKS;
    
    // Map with roles from interviews if matching
    const interviewsMap = new Map(dbInterviews.map((i) => [i.id, i]));
    return dbFeedbacks.map((fb) => ({
      ...fb,
      role: interviewsMap.get(fb.interviewId)?.role || "Software Engineer",
      // Normalize category scores array
      categoryScores: Array.isArray(fb.categoryScores)
        ? fb.categoryScores
        : (typeof fb.categoryScores === "object" && fb.categoryScores !== null)
        ? Object.values(fb.categoryScores)
        : []
    }));
  }, [dbFeedbacks, dbInterviews, isDemoData]);

  // Compute overall stats
  const totalInterviewsCount = feedbacks.length;
  
  const averageScore = useMemo(() => {
    if (totalInterviewsCount === 0) return 0;
    const total = feedbacks.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
    return Math.round(total / totalInterviewsCount);
  }, [feedbacks, totalInterviewsCount]);

  const latestScore = feedbacks[0]?.totalScore || 0;
  const latestRole = feedbacks[0]?.role || "N/A";
  const latestDateText = feedbacks[0]?.createdAt ? formatDate(feedbacks[0].createdAt) : "N/A";

  // Compute category averages
  const categoryAverages = useMemo(() => {
    const totals = {};
    const counts = {};

    feedbacks.forEach((fb) => {
      (fb.categoryScores || []).forEach((cat) => {
        const name = cat.name || "General";
        const score = typeof cat.score === "number" ? cat.score : 0;
        if (!totals[name]) {
          totals[name] = 0;
          counts[name] = 0;
        }
        totals[name] += score;
        counts[name] += 1;
      });
    });

    return Object.keys(totals).map((name) => ({
      name,
      score: Math.round(totals[name] / counts[name]),
      fullMark: 100
    }));
  }, [feedbacks]);

  // Find strongest & weakest categories
  const strongestCategory = useMemo(() => {
    if (categoryAverages.length === 0) return { name: "--", score: 0 };
    return categoryAverages.reduce((best, curr) => (curr.score > best.score ? curr : best), { score: -1 });
  }, [categoryAverages]);

  const weakestCategory = useMemo(() => {
    if (categoryAverages.length === 0) return { name: "--", score: 100 };
    return categoryAverages.reduce((worst, curr) => (curr.score < worst.score ? curr : worst), { score: 101 });
  }, [categoryAverages]);

  // Filtered timeline data (ascending order for charts)
  const chartData = useMemo(() => {
    const sorted = [...feedbacks].reverse(); // oldest first for chronological chart
    const items = timeRange === "all" ? sorted : sorted.slice(-parseInt(timeRange.split("-")[2]));
    return items.map((fb, idx) => ({
      name: `Int. #${idx + 1}`,
      date: formatDate(fb.createdAt),
      score: fb.totalScore,
      role: fb.role
    }));
  }, [feedbacks, timeRange]);

  // Compute dynamic AI recommendations based on performance
  const recommendations = useMemo(() => {
    const list = [];
    
    // Core recommendation based on lowest scoring category
    if (weakestCategory.name !== "--") {
      const cat = weakestCategory.name.toLowerCase();
      if (cat.includes("communication")) {
        list.push({
          title: "Improve Structured Communication",
          desc: "Your communications score shows space for structure. Practice the STAR method (Situation, Task, Action, Result) for behavioral prompts and avoid talking for more than 2 minutes without interactive checking.",
          action: "Try Behavioral Mock Interview",
          link: "/interview"
        });
      } else if (cat.includes("technical") || cat.includes("accuracy")) {
        list.push({
          title: "Strengthen Technical Accuracy & Trade-offs",
          desc: "You occasionally miss runtime complexity calculations or fail to state trade-offs. Spend the first 5 minutes of a coding challenge writing down alternative approaches (Space/Time complexities) before coding.",
          action: "Practice Code Challenges",
          link: "/100-days-of-code"
        });
      } else if (cat.includes("confidence")) {
        list.push({
          title: "Build Interview Composure & Presentation",
          desc: "Hesitance and long periods of silence decrease the overall impression. Practice continuous thought-broadcasting, stating clearly when you need 30 seconds of quiet thinking.",
          action: "Schedule Mock Session",
          link: "/mentorship"
        });
      } else if (cat.includes("pacing") || cat.includes("time")) {
        list.push({
          title: "Optimize Time Management & Coding Speed",
          desc: "Spend less time detailing corner cases before laying down the framework code. Get a working baseline first, then incrementally optimize edge conditions.",
          action: "Take a Timed Mock Test",
          link: "/mock-test"
        });
      } else {
        list.push({
          title: `Enhance your ${weakestCategory.name}`,
          desc: `Focus on resolving gaps highlighted in your recent feedback reports. Re-attempt previous questions under timed conditions to practice consistency.`,
          action: "Review Previous Audits",
          link: "/dashboard/rounds"
        });
      }
    }

    // Generic best-practice recommendations
    if (averageScore < 85) {
      list.push({
        title: "Target Medium-difficulty DSA Questions",
        desc: "Strengthen your confidence by solving 3 array/string medium questions daily. This directly translates to smoother interviews.",
        action: "Go to DSA Section",
        link: "/100-days-of-code"
      });
    }

    if (totalInterviewsCount < 5) {
      list.push({
        title: "Establish a Baseline Progress Trend",
        desc: "Take at least 3 mock interviews this week to feed more datapoints to the AI dashboard. Consistent practice helps build solid muscle memory.",
        action: "Start Mock Interview",
        link: "/interview"
      });
    }

    return list;
  }, [weakestCategory, averageScore, totalInterviewsCount]);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Premium Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-955 p-8 md:p-10 shadow-2xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold tracking-wide uppercase">
              <Activity size={12} className="animate-pulse" /> Live Performance Analytics
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Aspirations &amp; Performance
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm md:text-base leading-relaxed">
              Unlock deep metrics, identify skill-gap bottlenecks, and receive AI-backed recommendations to level up your career readiness.
            </p>
          </div>
          
          {isDemoData && (
            <div className="flex flex-col items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 md:max-w-xs backdrop-blur-md">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertCircle size={16} /> Showing Interactive Demo Data
              </div>
              <p className="text-xs text-amber-200/80 leading-normal">
                You haven't completed any mock interviews yet. Complete your first interview to populate this dashboard with personalized metrics!
              </p>
              <Link href="/interview" className="mt-2 w-full text-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg transition-all shadow-md flex items-center justify-center gap-1">
                Start Mock Interview <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Overview Stats Cards */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Interviews */}
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl transition-all group-hover:scale-125" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Rounds</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-primary">
              <Brain size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-foreground tracking-tight">{totalInterviewsCount}</span>
            <span className="text-xs text-muted-foreground">completed</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Active simulation rounds recorded</p>
        </div>

        {/* Average Score */}
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl transition-all group-hover:scale-125" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Average Score</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Award size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-foreground tracking-tight">{averageScore}%</span>
            <span className="text-xs text-emerald-500 font-bold">{averageScore >= 80 ? "Excellent" : averageScore >= 70 ? "Above Avg" : "Needs Practice"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Target benchmark score: 85%</p>
        </div>

        {/* Strongest area */}
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl transition-all group-hover:scale-125" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Strongest Core</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-primary">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold text-foreground truncate">{strongestCategory.name}</div>
            <div className="text-sm text-primary font-bold">Avg: {strongestCategory.score}/100</div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Your prime skill domain</p>
        </div>

        {/* Latest Activity */}
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl transition-all group-hover:scale-125" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Performance</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold text-foreground truncate">{latestRole}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{latestDateText}</span> • <span className="font-semibold text-foreground">{latestScore}/100</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Latest simulation date</p>
        </div>
      </section>

      {/* Tabs Menu */}
      <div className="flex border-b border-border">
        {[
          { id: "overview", label: "Analytics Overview", icon: Activity },
          { id: "skills", label: "Skill & Domain Audit", icon: Brain },
          { id: "recommendations", label: "Personalized Roadmap", icon: Sparkles }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold text-sm transition-all relative cursor-pointer ${
                isSelected
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <IconComponent size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      {activeTab === "overview" && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Score Progress Over Time</h3>
                  <p className="text-xs text-muted-foreground">Historical trend analysis of interview score progression</p>
                </div>
                
                <div className="flex rounded-lg bg-secondary p-1 text-xs">
                  {[
                    { id: "all", label: "All Records" },
                    { id: "last-3", label: "Last 3" },
                    { id: "last-5", label: "Last 5" }
                  ].map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setTimeRange(range.id)}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                        timeRange === range.id
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[40, 100]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-border bg-card p-3 shadow-xl flex flex-col gap-1.5 text-xs">
                              <p className="font-bold text-muted-foreground">{data.date}</p>
                              <p className="text-foreground font-semibold">Role: <span className="text-primary font-bold">{data.role}</span></p>
                              <p className="text-foreground font-bold">Overall Score: <span className="text-indigo-555 text-sm font-extrabold">{data.score}/100</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List of Recent Interviews */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">Detailed Performance Timeline</h3>
              <div className="space-y-4">
                {feedbacks.map((fb) => (
                  <div key={fb.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl border border-border/60 hover:bg-secondary/20 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground capitalize">{fb.role}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                          {formatDate(fb.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                        {fb.finalAssessment}
                      </p>
                      
                      {/* Sub-scores preview */}
                      <div className="flex gap-4 flex-wrap pt-1">
                        {fb.categoryScores.slice(0, 3).map((cat) => (
                          <div key={cat.name} className="flex flex-col text-[10px]">
                            <span className="text-muted-foreground">{cat.name}</span>
                            <span className="font-bold text-foreground">{cat.score}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center shrink-0">
                      <div className="text-center">
                        <div className="text-2xl font-black text-primary">{fb.totalScore}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Score</div>
                      </div>
                      {!isDemoData ? (
                        <Link href={`/interview/${fb.interviewId}/feedback`} className="p-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all">
                          <ChevronRight size={18} />
                        </Link>
                      ) : (
                        <div className="p-2 rounded-xl bg-secondary text-muted-foreground opacity-60">
                          <ChevronRight size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - High Level KPI breakdown */}
          <div className="space-y-6">
            {/* Quick Skills Stats */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-4">Core Skill Index</h3>
              <div className="space-y-4">
                {categoryAverages.length > 0 ? (
                  categoryAverages.map((cat) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{cat.name}</span>
                        <span className="text-primary font-bold">{cat.score}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No metrics currently registered.</p>
                )}
              </div>
            </div>

            {/* Quick Recommendations Preview */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">AI Action Items</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/10 font-bold uppercase">Dynamic</span>
              </div>
              <div className="space-y-3">
                {recommendations.slice(0, 2).map((rec, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                    <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                      <Sparkles size={13} className="text-indigo-600 shrink-0" /> {rec.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {rec.desc}
                    </p>
                    <Link href={rec.link} className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
                      {rec.action} <ChevronRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "skills" && (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Radar Analysis */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-1">Dimension Audit</h3>
            <p className="text-xs text-muted-foreground mb-6">Evaluating balance across communication, pacing, technical logic, and delivery confidence.</p>
            
            <div className="h-80 w-full flex items-center justify-center">
              {categoryAverages.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryAverages}>
                    <PolarGrid stroke="rgba(0,0,0,0.06)" />
                    <PolarAngleAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                    <Radar name="Averages" dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground">Insufficient feedback details for dimensional charting.</p>
              )}
            </div>
          </div>

          {/* Bar Chart Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Comparative Strengths</h3>
              <p className="text-xs text-muted-foreground mb-6">Bar evaluation showing metrics relative to the 85% target threshold.</p>
              
              <div className="h-72 w-full">
                {categoryAverages.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryAverages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-xl border border-border bg-card p-2.5 shadow-xl text-xs">
                                <p className="font-semibold text-foreground">{payload[0].name}: <span className="font-bold text-primary">{payload[0].value}%</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="score" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                        {categoryAverages.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.score >= 85 ? "#10b981" : entry.score >= 75 ? "var(--primary)" : "#f59e0b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">Insufficient data.</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-6 justify-center flex-wrap pt-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Proficient (85%+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span>Developing (75%-84%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Attention Required (&lt;75%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "recommendations" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-1">AI-Powered Roadmap &amp; Guidance</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Tailored learning plans generated automatically based on your lowest score parameters and behavioral markers.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-border/80 bg-secondary/10 hover:bg-secondary/20 transition-all">
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-primary shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-foreground">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {rec.desc}
                    </p>
                    <div className="pt-2">
                      <Link href={rec.link} className="inline-flex items-center gap-1 text-xs bg-primary hover:bg-primary/95 text-white font-semibold py-2 px-3.5 rounded-lg shadow-sm transition-all hover:translate-x-0.5">
                        {rec.action} <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
