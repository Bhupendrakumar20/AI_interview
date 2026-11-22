"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

const CompanyListingCard = ({ company }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="premium-card-glass p-6 overflow-hidden flex flex-col justify-between group transition-all duration-300">
      <div>
        {/* Company Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Company Logo */}
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              {company.name.charAt(0)}
            </div>
          </div>

          {/* Company Info */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{company.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {company.positions.length} interview{company.positions.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* Positions */}
        <div className="space-y-2 mb-4">
          {company.positions.slice(0, isExpanded ? company.positions.length : 2).map((position, idx) => (
            <div key={idx} className="premium-inset-tile flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{position.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{position.level} Level</p>
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse */}
        {company.positions.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-500 text-xs py-1.5 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp size={14} />
              </>
            ) : (
              <>
                Show More <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Start Interview Button */}
      <Link href={`/mock-test/practice?company=${company.name}`}>
        <Button className="btn-theme-action w-full mt-4 py-2.5 text-xs sm:text-sm font-bold shadow-md">
          Start Interview
        </Button>
      </Link>
    </div>
  );
};

export default CompanyListingCard;
