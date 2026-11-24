// components/FilterBar.jsx
"use client";

import { cn } from "@/lib/utils";

const FilterBar = ({ filters, activeFilter, onFilterChange, className }) => {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:gap-2.5 mb-6 select-none", className)}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        const hasCount = typeof filter.count !== "undefined" && filter.count !== null;

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              "group relative px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95",
              isActive
                ? "bg-linear-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20 font-bold"
                : "bg-white/80 dark:bg-slate-900/70 backdrop-blur-md text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200/90 dark:border-slate-800/80 hover:border-indigo-300/80 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-800/80 shadow-xs hover:shadow-sm hover:-translate-y-0.5"
            )}
          >
            <span>{filter.label}</span>
            {hasCount && (
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors",
                  isActive
                    ? "bg-white/25 text-white backdrop-blur-xs"
                    : "bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 border border-slate-200/50 dark:border-slate-700/50"
                )}
              >
                {filter.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FilterBar;
