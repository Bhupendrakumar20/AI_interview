// components/ui/input.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(
  ({ className, type = "text", variant = "default", wrapperClassName = "", ...props }, ref) => {
    // 1. Rubber Border Variant: elastic physics border on focus and keystroke
    if (variant === "rubber" || variant === "rubberBorder" || variant === "rubber-border") {
      return (
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "rubber-border-input cursor-text",
            "hover:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      );
    }

    // 2. Scope Sweep Variant: rotating high-tech radar laser beam around border perimeter
    if (variant === "scope" || variant === "scopeSweep" || variant === "scope-sweep") {
      return (
        <div className={cn("scope-sweep-wrapper w-full", wrapperClassName)}>
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-[inherit] bg-card px-3.5 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    // Default Variant (100% backward compatible with existing design)
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-sm text-slate-900 dark:text-white",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500",
          "transition-all duration-300",
          "hover:border-primary/50",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

// Convenient named exports
const RubberBorderInput = React.forwardRef((props, ref) => (
  <Input variant="rubberBorder" ref={ref} {...props} />
));
RubberBorderInput.displayName = "RubberBorderInput";

const ScopeSweepInput = React.forwardRef((props, ref) => (
  <Input variant="scopeSweep" ref={ref} {...props} />
));
ScopeSweepInput.displayName = "ScopeSweepInput";

export { Input, RubberBorderInput, ScopeSweepInput };
