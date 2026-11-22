// components/JobCard.jsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookmarkSave, ParticleBurst } from "@/components/ui/MicroInteractions";

const JobCard = ({ job }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleApplyNow = () => {
    if (job.url && job.url !== "#") {
      setApplying(true);
      window.open(job.url, "_blank");
      toast.success(`Opening application for ${job.title}...`);
      setTimeout(() => setApplying(false), 1000);
    } else {
      toast.info("Application link not available.");
    }
  };

  const handleSave = (saved) => {
    setIsSaved(saved);
    if (saved) {
      toast.success(`Saved "${job.title}" to your watchlist!`);
    } else {
      toast.info(`Removed "${job.title}" from watchlist.`);
    }
  };

  return (
    <div className="premium-card-glass p-6 sm:p-7 h-full flex flex-col justify-between group">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors leading-snug">
              {job.title}
            </h3>
            <p className="text-indigo-600 dark:text-[#C7D2FE] font-semibold text-sm mt-0.5">{job.company}</p>
          </div>
          <span className="premium-pill-badge text-xs px-3 py-1 font-semibold whitespace-nowrap">
            {job.type}
          </span>
        </div>

        {/* Details Inset Tile */}
        <div className="premium-inset-tile p-4 space-y-3 mb-4">
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 dark:text-slate-400">Location:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{job.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 dark:text-slate-400">Salary:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{job.salary}</span>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Experience: </span>
            <span className="font-bold text-slate-900 dark:text-white">{job.experience}</span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            Posted {job.posted}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-1.5">
            {Array.isArray(job.skills) && job.skills.length > 0 ? (
              job.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-200 border border-indigo-100 dark:border-slate-700/60 text-xs rounded-full font-medium"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No skills listed</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-4 border-t border-indigo-100/70 dark:border-slate-800/80 mt-auto">
        <Button
          onClick={handleApplyNow}
          disabled={!job.url || job.url === "#"}
          className="btn-theme-action flex-1 py-2.5 text-xs sm:text-sm font-bold relative overflow-visible shadow-md"
        >
          <ParticleBurst active={applying} count={8} color="#6366f1" />
          Apply Now
        </Button>
        <div className="border border-slate-300 dark:border-slate-700 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors p-1">
          <BookmarkSave
            active={isSaved}
            onToggle={handleSave}
          />
        </div>
      </div>
    </div>
  );
};

export default JobCard;
