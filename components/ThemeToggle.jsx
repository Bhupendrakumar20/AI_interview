'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
      className={cn(
        "relative inline-flex items-center w-14 h-7 p-0.5 rounded-full border transition-all duration-300 select-none cursor-pointer group shadow-inner",
        isDark 
          ? "bg-slate-900 border-indigo-500/40 shadow-indigo-950/50" 
          : "bg-amber-100/80 border-amber-300/80 shadow-amber-200/40"
      )}
    >
      {/* Background ambient icons */}
      <span className="absolute left-1.5 text-amber-500 opacity-60 text-[10px]">
        <Sun size={12} />
      </span>
      <span className="absolute right-1.5 text-indigo-400 opacity-60 text-[10px]">
        <Moon size={12} />
      </span>

      {/* 3D Floating Switch Thumb */}
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 transform shadow-md relative z-10",
          isDark
            ? "translate-x-7 bg-gradient-to-tr from-indigo-600 to-indigo-400 text-yellow-300 shadow-indigo-900/60 rotate-0"
            : "translate-x-0 bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-900 shadow-amber-400/50 rotate-180"
        )}
      >
        {isDark ? (
          <Moon size={13} className="transition-transform duration-300 group-hover:-rotate-12 fill-yellow-300/40" />
        ) : (
          <Sun size={13} className="transition-transform duration-300 group-hover:rotate-45" />
        )}
      </div>
    </button>
  );
}
