// components/ui/button.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-105 active:scale-95 cursor-pointer select-none";

    const variants = {
      default:
        "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 font-bold",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 hover:shadow-sm font-semibold",
      outline:
        "border border-border bg-transparent text-foreground hover:bg-secondary hover:text-secondary-foreground hover:shadow-sm",
      ghost: "text-foreground hover:bg-secondary hover:text-foreground",
      destructive:
        "bg-destructive text-white hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20",
      // High-End Modern UI Button Variants
      glass: "btn-glass text-foreground hover:text-foreground",
      liquidGlass: "btn-liquid-glass text-foreground dark:text-white font-semibold",
      "liquid-glass": "btn-liquid-glass text-foreground dark:text-white font-semibold",
      aurora: "btn-aurora text-white font-semibold",
      auroraGlow: "btn-aurora text-white font-semibold",
      "aurora-glow": "btn-aurora text-white font-semibold",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      xl: "h-13 rounded-xl px-10 text-base font-semibold",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant] || variants.default,
          sizes[size] || sizes.default,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

// Specialized convenience wrappers
const GlassButton = React.forwardRef((props, ref) => (
  <Button variant="glass" ref={ref} {...props} />
));
GlassButton.displayName = "GlassButton";

const LiquidGlassButton = React.forwardRef((props, ref) => (
  <Button variant="liquidGlass" ref={ref} {...props} />
));
LiquidGlassButton.displayName = "LiquidGlassButton";

const AuroraButton = React.forwardRef((props, ref) => (
  <Button variant="aurora" ref={ref} {...props} />
));
AuroraButton.displayName = "AuroraButton";

export { Button, GlassButton, LiquidGlassButton, AuroraButton };
