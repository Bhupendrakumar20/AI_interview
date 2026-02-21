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
    className={`absolute right-0 mt-2 w-48 rounded-md border border-dark-300 bg-dark-200 shadow-lg z-50 ${className}`}
    {...props}
  >
    <div className="py-1">{children}</div>
  </div>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = forwardRef(({ children, className = "", onClick, ...props }, ref) => (
  <button
    ref={ref}
    className={`block w-full text-left px-4 py-2 text-sm text-light-100 hover:bg-dark-300 transition-colors ${className}`}
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
    className={`px-4 py-2 text-sm font-semibold text-light-400 ${className}`}
    {...props}
  >
    {children}
  </div>
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`my-1 h-px bg-dark-300 ${className}`}
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
