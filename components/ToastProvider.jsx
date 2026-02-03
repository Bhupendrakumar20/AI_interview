// components/ToastProvider.jsx
"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-dark-300 border border-dark-100 text-light-100",
          title: "text-light-100",
          description: "text-light-100/80",
          actionButton: "bg-primary-200 text-dark-100",
          cancelButton: "bg-dark-200 text-light-100",
          error: "bg-red-500/20 text-red-500 border-red-500/30",
          success: "bg-green-500/20 text-green-500 border-green-500/30",
          warning: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
          info: "bg-blue-500/20 text-blue-500 border-blue-500/30",
        },
      }}
    />
  );
}