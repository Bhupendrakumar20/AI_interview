// components/QuickAccess.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, DollarSign, Trophy, MessageSquare, Users, BookOpen, Mic, BookMarked, BarChart3, User, DollarSign as DollarSignIcon, Star } from "lucide-react";

const QuickAccess = () => {
  const router = useRouter();
  
  const quickLinks = [
    { label: "Internships", icon: Briefcase, href: "/internships" },
    { label: "Jobs", icon: DollarSign, href: "/jobs" },
    { label: "Competitions", icon: Trophy, href: "/competitions" },
    { label: "Mock Tests", icon: MessageSquare, href: "/mock-tests" },
    { label: "Interview Buddy", icon: Users, href: "/interview/buddy" },
    { label: "Mentorship", icon: Users, href: "/mentorship" },
    { label: "Courses", icon: BookOpen, href: "/courses" },
    { label: "Interview", icon: Mic, href: "/interview" },
    { label: "Question Bank", icon: BookMarked, href: "/question-bank" },
    { label: "Analytics", icon: BarChart3, href: "/analytics" },
    { label: "Profile", icon: User, href: "/profile" },
    { label: "Salary Negotiate", icon: DollarSignIcon, href: "/salary-negotiation" },
    { label: "Upgrade", icon: Star, href: "/upgrade" },
  ];

  return (
    <section className="py-6">
      <h2 className="text-xl font-bold tracking-tight text-foreground mb-6" style={{ letterSpacing: "-0.02em" }}>Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {quickLinks.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="group flex flex-col justify-between items-start h-32 p-4 bg-card/60 border border-border/80 rounded-[16px] backdrop-blur-xs transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 active:scale-95 cursor-pointer text-left w-full relative overflow-hidden"
            style={{
              animation: `slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.04}s both`
            }}
          >
            {/* Top-Left Squircle Icon Container - Catchy Accent */}
            <div className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
              <item.icon size={24} className="transition-transform duration-300 group-hover:scale-110" />
            </div>

            {/* Bottom-Left Label */}
            <span className="text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors mt-auto">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickAccess;