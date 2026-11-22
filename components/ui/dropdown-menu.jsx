"use client";

import { forwardRef, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const DropdownMenuTrigger = forwardRef(({ children, onClick, ...props }, ref) => (
  <button
    ref={ref}
    className="inline-flex items-center justify-center rounded-md hover:bg-dark-300 transition-colors"
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
));
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuContent = forwardRef(({ children, className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl z-50 backdrop-blur-xl ${className}`}
    {...props}
  >
    <div className="py-1">{children}</div>
  </div>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = forwardRef(({ children, className = "", onClick, ...props }, ref) => (
  <button
    ref={ref}
    className={`block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = forwardRef(({ children, className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${className}`}
    {...props}
  >
    {children}
  </div>
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`my-1 h-px bg-slate-200 dark:bg-slate-800 ${className}`}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenu = ({ children, open, onOpenChange }) => {
  return <div>{children}</div>;
};

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
