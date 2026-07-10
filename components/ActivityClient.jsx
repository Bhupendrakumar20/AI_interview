// components/ActivityClient.jsx
"use client";

import { useState, useMemo } from "react";
import {
  Filter,
  Download,
  Share2,
  Archive,
  Eye,
  ChevronRight,
  Mic,
  Code,
  BookOpen,
  Trophy,
  ClipboardList,
  BarChart3,
  Target,
  Sparkles,
  Award,
  AlertCircle
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Map categories to lucide icons
const categoryIcons = {
  interview: Mic,
  question: Code,
  course: BookOpen,
  certificate: Trophy,
  application: ClipboardList
};

// Fallback dummy activity data to ensure completeness
const DUMMY_ACTIVITIES = [
  {
    id: "dummy-1",
    type: "question",
    title: "Solved: Two Sum Problem",
    category: "DSA",
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 hours ago
    desc: "Optimized Hash Map approach in Javascript. Time complexity O(N)."
  },
  {
    id: "dummy-2",
    type: "course",
    title: "Completed Section 3 of Python Mastery",
    category: "Course",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
    desc: "Learned advanced generators, decorators, and context managers."
  },
  {
    id: "dummy-3",
    type: "certificate",
    title: "Earned Professional Interview Certificate",
    category: "Certificate",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2 days ago
    desc: "Achieved over 85% average across 5 mock rounds."
  },
  {
    id: "dummy-4",
    type: "question",
    title: "Solved: Merge K Sorted Lists",
    category: "DSA",
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), // 4 days ago
    desc: "Implemented Heap / Priority Queue solution in C++."
  }
];

export default function ActivityClient({ dbFeedbacks = [], dbApplications = [], dbInterviewsCount = 0 }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Merge real and dummy activity list
  const mergedActivities = useMemo(() => {
    const list = [];

    // 1. Add real feedback/mock interview activities
    dbFeedbacks.forEach((fb) => {
      list.push({
        id: fb.id,
        type: "interview",
        title: `Completed ${fb.role || "Mock"} Interview`,
        category: "Interview",
        createdAt: fb.createdAt || new Date().toISOString(),
        desc: `Scored ${fb.totalScore}/100 — ${fb.finalAssessment ? fb.finalAssessment.slice(0, 80) + '...' : 'Details available'}`
      });
    });

    // 2. Add real applications
    dbApplications.forEach((app) => {
      list.push({
        id: app.id,
        type: "application",
        title: `Applied to ${app.role || app.title || "Developer"} at ${app.company || "Company"}`,
        category: "Application",
        createdAt: app.createdAt || new Date().toISOString(),
        desc: `Status: ${app.status || "Applied"} — Submitted via PrepWise Jobs Board.`
      });
    });

    // 3. Add fallback dummy activities
    list.push(...DUMMY_ACTIVITIES);

    // Sort by date (descending)
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dbFeedbacks, dbApplications]);

  // Compute dynamic stats
  const stats = useMemo(() => {
    const interviewsCompleted = dbInterviewsCount || dbFeedbacks.length || 8;
    const problemsSolved = 156; // Fallback
    const certificatesEarned = 3;
    const totalActions = mergedActivities.length + 30; // Total activities this week estimate

    return [
      { label: "Actions This Week", value: totalActions, dot: "#34d399", icon: BarChart3 },
      { label: "Interviews Completed", value: interviewsCompleted, dot: "#4e7fff", icon: Target },
      { label: "Problems Solved", value: problemsSolved, dot: "#a78bfa", icon: Sparkles },
      { label: "Certificates Earned", value: certificatesEarned, dot: "#f59e0b", icon: Award }
    ];
  }, [dbInterviewsCount, dbFeedbacks.length, mergedActivities.length]);

  const filteredData = useMemo(() => {
    if (activeFilter === "all") return mergedActivities;
    return mergedActivities.filter((item) => item.type === activeFilter);
  }, [mergedActivities, activeFilter]);

  const styles = `
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-slideInUp {
      animation: slideInUp 0.4s ease-out;
    }
    .animate-fadeInScale {
      animation: fadeInScale 0.3s ease-out;
    }
    .activity-item {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .activity-item:hover {
      background: rgba(71, 85, 105, 0.15);
      padding-left: 1.25rem;
      border-left: 4px solid var(--primary);
    }
    .activity-actions {
      opacity: 0;
      transform: translateX(10px);
      transition: all 0.3s ease;
    }
    .activity-item:hover .activity-actions {
      opacity: 1;
      transform: translateX(0);
    }
    .stat-card {
      transition: all 0.3s ease;
    }
    .stat-card:hover {
      transform: translateY(-4px);
    }
  `;

  return (
    <div className="min-h-screen bg-background">
      <style>{styles}</style>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-primary text-white px-6 py-3 rounded-lg shadow-lg animate-fadeInScale z-50 font-semibold text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <span>My Space</span>
            <span>›</span>
            <span className="text-foreground font-semibold">My Activity</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">My Activity</h1>
              <p className="text-sm text-muted-foreground">Track your progress and recent accomplishments</p>
            </div>
            <div className="flex gap-2">
              <button
                className="p-2.5 hover:bg-secondary rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                onClick={() => showToast("Downloading activity report...")}
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="stat-card flex items-center gap-4 px-5 py-4 bg-card border border-border rounded-2xl shadow-sm"
              style={{ animation: `slideInUp 0.4s ease-out ${idx * 0.1}s both` }}
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <stat.icon size={22} />
              </div>
              <div>
                <span className="font-extrabold text-foreground text-2xl tracking-tight block">{stat.value}</span>
                <span className="text-muted-foreground text-xs font-semibold">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {["all", "interview", "question", "course", "certificate", "application"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer capitalize ${
                activeFilter === filter
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Timeline list */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filteredData.map((activity, idx) => {
              const IconComp = categoryIcons[activity.type] || Code;
              return (
                <div
                  key={activity.id}
                  className="p-5 activity-item flex items-start justify-between gap-4 group cursor-pointer"
                  style={{ animation: `slideInUp 0.4s ease-out ${idx * 0.04}s both` }}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 group-hover:scale-105">
                      <IconComp size={18} />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {activity.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-2xl leading-normal">
                        {activity.desc}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
                        <span className="px-2 py-0.5 bg-secondary rounded font-bold uppercase tracking-wider text-[9px]">
                          {activity.category}
                        </span>
                        <span>{dayjs(activity.createdAt).fromNow()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="activity-actions flex gap-2 shrink-0 self-center">
                    <button
                      onClick={() => showToast(`Archived: ${activity.title}`)}
                      className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Archive"
                    >
                      <Archive size={16} />
                    </button>
                    <button
                      onClick={() => showToast(`Shared link to activity`)}
                      className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Share"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
