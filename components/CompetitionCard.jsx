// components/CompetitionCard.jsx
"use client";

import { Button } from "@/components/ui/button";

const CompetitionCard = ({ competition }) => {
  return (
    <div className="premium-card-glass p-6 sm:p-7 flex flex-col justify-between h-full group transition-all duration-300">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-3.5">
          <div className="flex-1 pr-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{competition.title}</h3>
            <p className="text-indigo-600 dark:text-[#C7D2FE] font-semibold text-sm mt-0.5">by {competition.organizer}</p>
          </div>
          {competition.featured && (
            <span className="premium-pill-badge text-xs px-3 py-1 font-semibold whitespace-nowrap">
              Featured
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-300 mb-4 text-xs sm:text-sm leading-relaxed">{competition.description}</p>

        {/* Prize Inset Tile */}
        <div className="premium-inset-tile p-4 mb-4">
          <div className="text-center">
            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Prize Pool</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{competition.prize}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs sm:text-sm mb-4 px-1">
          <div>
            <div className="font-extrabold text-slate-900 dark:text-white">{competition.participants}</div>
            <div className="text-slate-500 dark:text-slate-400 text-xs">Participants</div>
          </div>
          <div className="text-right">
            <div className="font-extrabold text-slate-900 dark:text-white">{competition.deadline}</div>
            <div className="text-slate-500 dark:text-slate-400 text-xs">Deadline</div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-1.5">
            {competition.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-200 text-xs rounded-full border border-indigo-100 dark:border-slate-700/60 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Button */}
      <Button className="btn-theme-action w-full py-2.5 text-xs sm:text-sm font-bold shadow-md">
        Register Now
      </Button>
    </div>
  );
};

export default CompetitionCard;
