// components/ui/input.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-dark-100 bg-dark-200 px-3 py-2 text-sm text-light-100",
        "placeholder:text-light-100/50",
        "transition-all duration-300",
        "hover:border-primary-200/30 hover:bg-dark-250",
        "focus:outline-none focus:ring-2 focus:ring-primary-200/30 focus:border-primary-200 focus:shadow-lg focus:shadow-primary-200/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };