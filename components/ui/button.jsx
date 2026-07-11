// components/ui/button.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-105 active:scale-95";
    
    const variants = {
      default: "btn-primary bg-primary text-primary-foreground hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/20",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40 hover:shadow-sm",
      outline: "border border-border bg-transparent text-foreground hover:bg-secondary hover:text-secondary-foreground hover:shadow-sm",
      ghost: "text-foreground hover:bg-secondary hover:text-foreground",
      destructive: "bg-destructive text-white hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20",
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