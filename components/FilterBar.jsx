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
            "px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2",
            activeFilter === filter.value
              ? "bg-primary-200 text-dark-100 font-semibold"
              : "bg-dark-200 text-light-100 hover:bg-dark-300"
          )}
        >
          <span>{filter.label}</span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            activeFilter === filter.value
              ? "bg-dark-100/20"
              : "bg-dark-300"
          )}>
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
};

export default FilterBar;