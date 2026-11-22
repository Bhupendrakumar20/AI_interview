// components/MentorCard.jsx
"use client";

import React, { useState } from "react";
import { Star, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function MentorCard({ mentor }) {
  const [booking, setBooking] = useState(false);

  const handleBook = () => {
    setBooking(true);
    toast.success(`Opening session scheduler with ${mentor.name}...`);
    setTimeout(() => setBooking(false), 1200);
  };

  // Extract company if present in role (e.g. "Senior Engineer @ Google" -> "Google")
  const company = mentor.role.includes("@")
    ? mentor.role.split("@")[1].trim()
    : "Senior Mentor";

  return (
    <div className="premium-card-glass p-6 sm:p-7 flex flex-col justify-between min-h-[390px] group transition-all duration-300">
      {/* TOP HEADER ROW */}
      <div className="flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-[#C7D2FE]">
            {company}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-slate-700 dark:text-slate-200 font-bold">{mentor.rating}</span>
          <span>•</span>
          <span>{mentor.sessions} sessions</span>
        </div>
      </div>

      {/* INNER INSET CARD (Matching Reference Specification) */}
      <div className="premium-inset-tile p-4 sm:p-5 mb-5 z-10">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
          {mentor.name}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
          {mentor.role} • {mentor.experience} exp
        </p>

        {/* Badges row (pill tags) */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {mentor.expertise.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="premium-pill-badge px-2.5 py-0.5 text-[11px] font-semibold"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Progress Bar (Matching Design) */}
        <div className="w-full h-2 bg-[#E0E7FF] dark:bg-[#1E293B] rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-[#818CF8] dark:shadow-[0_0_8px_rgba(129,140,248,0.5)] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (mentor.rating / 5) * 100)}%` }}
          />
        </div>
      </div>

      {/* BOTTOM ACTION SECTION */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-2 z-10">
        <div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
            {mentor.rate}
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            per session
          </div>
        </div>

        <button
          onClick={handleBook}
          disabled={booking}
          className="btn-theme-action px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {booking ? "Booking..." : "Book Session"}
        </button>
      </div>

      {/* BOTTOM SUBTITLE / AVAILABILITY METADATA */}
      <div className="mt-4 pt-3 border-t border-indigo-100/70 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-tight z-10">
        <span>Available: {mentor.availability.join(", ")}</span>
        <span className="hidden sm:inline">1-on-1 Mentorship</span>
      </div>
    </div>
  );
}
