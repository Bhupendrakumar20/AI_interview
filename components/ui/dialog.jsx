"use client";

import { forwardRef, useState } from "react";
import { X } from "lucide-react";

const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => onOpenChange(false)} />
          {children}
        </>
      )}
    </>
  );
};

const DialogTrigger = forwardRef(({ children, onClick, ...props }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
));
DialogTrigger.displayName = "DialogTrigger";

const DialogContent = forwardRef(({ children, className = "", onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={`fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-dark-300 bg-dark-200 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg ${className}`}
    {...props}
  >
    {children}
    <button
      onClick={onClose}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-dark-200 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-dark-300 focus:ring-offset-2 disabled:pointer-events-none"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  </div>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className = "", ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className = "", ...props }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0 ${className}`} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = forwardRef(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight text-white ${className}`}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = forwardRef(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-light-400 ${className}`}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
