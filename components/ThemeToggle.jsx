'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${theme === 'dark'
          ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400'
          : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
        }
        flex items-center justify-center
      `}
    >
      {theme === 'dark' ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
}
