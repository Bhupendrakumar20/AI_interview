// components/ui/textarea.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-dark-100 bg-dark-200 px-3 py-2 text-sm text-light-100",
        "placeholder:text-light-100/50",
        "focus:outline-none focus:ring-2 focus:ring-primary-200/30",
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