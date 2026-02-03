// components/QuickAccess.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const QuickAccess = () => {
  const router = useRouter();
  
  const quickLinks = [
    { label: "Internships", icon: "💼", href: "/internships" },
    { label: "Jobs", icon: "💰", href: "/jobs" },
    { label: "Competitions", icon: "🏆", href: "/competitions" },
    { label: "Mock Tests", icon: "📝", href: "/mock-tests" },
    { label: "Mentorship", icon: "👥", href: "/mentorship" },
    { label: "Courses", icon: "📚", href: "/courses" },
    { label: "Mock Interview", icon: "🎤", href: "/interview" },
    { label: "Question Bank", icon: "📖", href: "/question-bank" },
    { label: "Analytics", icon: "📊", href: "/analytics" },
    { label: "Profile", icon: "👤", href: "/profile" },
    { label: "Salary Negotiate", icon: "💬", href: "/salary-negotiation" },
    { label: "Upgrade", icon: "⭐", href: "/upgrade" },
  ];

  return (
    <section>
      <h2 className="text-3xl font-bold mb-6">Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {quickLinks.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="dark-gradient rounded-xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform hover:border hover:border-primary-200/50"
          >
            <span className="text-2xl mb-2">{item.icon}</span>
            <span className="text-sm text-center">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickAccess;