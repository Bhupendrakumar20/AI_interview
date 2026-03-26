// components/ui/button.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-105 active:scale-95";
    
    const variants = {
      default: "btn-primary bg-primary-200 text-dark-100 hover:bg-primary-300 hover:shadow-lg hover:shadow-primary-200/30",
      secondary: "bg-dark-200 text-light-100 hover:bg-dark-300 hover:shadow-md hover:shadow-dark-200/50",
      outline: "border border-dark-100 text-light-100 hover:bg-dark-200 hover:border-primary-200/50 hover:shadow-md",
      ghost: "text-light-100 hover:bg-dark-200 hover:text-light-50",
      destructive: "bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };