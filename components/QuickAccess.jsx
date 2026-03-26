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
    { label: "Mentorship", icon: Users, href: "/mentorship" },
    { label: "Courses", icon: BookOpen, href: "/courses" },
    { label: "Mock Interview", icon: Mic, href: "/interview" },
    { label: "Question Bank", icon: BookMarked, href: "/question-bank" },
    { label: "Analytics", icon: BarChart3, href: "/analytics" },
    { label: "Profile", icon: User, href: "/profile" },
    { label: "Salary Negotiate", icon: DollarSignIcon, href: "/salary-negotiation" },
    { label: "Upgrade", icon: Star, href: "/upgrade" },
  ];

  return (
    <section>
      <h2 className="text-3xl font-bold mb-6 animate-fadeIn">Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {quickLinks.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="dark-gradient rounded-xl p-4 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:border hover:border-primary-200/50 hover:shadow-lg hover:shadow-primary-200/20 active:scale-95 group"
            style={{animation: `slideInUp 0.5s ease-out ${idx * 0.05}s both`}}
          >
            <div className="text-2xl mb-2 transition-all duration-300 group-hover:scale-110 group-hover:text-primary-200">
              <item.icon size={28} className="text-slate-400 group-hover:text-primary-100" />
            </div>
            <span className="text-sm text-center text-slate-300 group-hover:text-slate-100 transition-colors">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickAccess;