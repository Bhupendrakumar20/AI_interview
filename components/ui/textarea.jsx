// components/ui/textarea.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-sm text-slate-900 dark:text-white",
        "placeholder:text-slate-400 dark:placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };