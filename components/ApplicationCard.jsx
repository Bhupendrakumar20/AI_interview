// components/ApplicationCard.jsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const ApplicationCard = ({ application }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case "Offer Received": return "text-emerald-600 dark:text-emerald-400";
      case "Interview Scheduled": return "text-indigo-600 dark:text-indigo-400";
      case "Under Review": return "text-amber-600 dark:text-amber-400";
      case "Rejected": return "text-rose-600 dark:text-rose-400";
      default: return "text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <div className="premium-card-glass p-5 sm:p-6 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors leading-snug">{application.title}</h3>
          <p className="text-indigo-600 dark:text-[#C7D2FE] font-semibold text-sm mt-0.5">{application.company}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Applied on {application.date}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={cn(
            "font-bold text-xs sm:text-sm px-3 py-1 rounded-full border",
            application.status === "Offer Received" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
            application.status === "Interview Scheduled" && "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
            application.status === "Under Review" && "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
            application.status === "Rejected" && "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
            !["Offer Received", "Interview Scheduled", "Under Review", "Rejected"].includes(application.status) && "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
          )}>
            {application.status}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-indigo-100/70 dark:border-slate-800/80">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Application Progress</h4>
          <div className="premium-inset-tile p-4">
            <div className="flex justify-between">
              {application.progress.map((stage, index) => (
                <div key={index} className="text-center flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold",
                    stage.completed 
                      ? "bg-emerald-500 text-white shadow-xs" 
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  )}>
                    {index + 1}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{stage.stage}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stage.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationCard;
