// components/FilterBar.jsx
"use client";

import { cn } from "@/lib/utils";

const FilterBar = ({ filters, activeFilter, onFilterChange }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 cursor-pointer",
            activeFilter === filter.value
              ? "bg-indigo-600 dark:bg-indigo-500 text-white font-bold shadow-sm shadow-indigo-500/25"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
          )}
        >
          <span>{filter.label}</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            activeFilter === filter.value
              ? "bg-white/25 text-white"
              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
          )}>
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
};

export default FilterBar;