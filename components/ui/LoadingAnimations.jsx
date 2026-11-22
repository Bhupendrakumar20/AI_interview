// components/ui/LoadingAnimations.jsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * 1. Bouncing Dots
 * 3 staggered elastic bouncing dots with spring lift.
 */
export const BouncingDots = ({
  size = "md",
  color = "primary",
  label,
  className = "",
}) => {
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };

  const dotColors = {
    primary: "bg-primary shadow-xs shadow-primary/30",
    white: "bg-white shadow-xs shadow-white/30",
    cyan: "bg-cyan-500 shadow-xs shadow-cyan-500/30",
    indigo: "bg-indigo-500 shadow-xs shadow-indigo-500/30",
  };

  const selectedSize = dotSizes[size] || dotSizes.md;
  const selectedColor = dotColors[color] || dotColors.primary;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className="inline-flex items-center gap-1.5 py-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("rounded-full", selectedSize, selectedColor)}
            style={{
              animation: "bounceDots 0.8s ease-in-out infinite",
              animationDelay: `${i * 160}ms`,
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-xs font-medium text-muted-foreground animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * 2. Indeterminate Bar
 * Sleek sliding indeterminate progress bar with gradient shimmer.
 */
export const IndeterminateBar = ({
  height = "h-1.5",
  label,
  color = "primary",
  className = "",
}) => {
  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{label}</span>
          <span className="animate-pulse">Loading...</span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-secondary overflow-hidden relative border border-border/40",
          height
        )}
      >
        {/* Sliding beam */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-primary via-cyan-400 to-indigo-600 shadow-md shadow-primary/40"
          style={{
            animation: "indeterminateTrack 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        />
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          style={{
            animation: "indeterminateShimmer 2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        />
      </div>
    </div>
  );
};

/**
 * 3. Equalizer Audio Bars
 * Audio & speech wave oscillator, ideal for voice AI and microphone states.
 */
export const EqualizerBars = ({
  barCount = 5,
  size = "md",
  color = "primary",
  label,
  className = "",
}) => {
  const heights = {
    sm: "h-4",
    md: "h-7",
    lg: "h-10",
  };

  const barWidths = {
    sm: "w-1",
    md: "w-1.5",
    lg: "w-2",
  };

  const selectedHeight = heights[size] || heights.md;
  const selectedWidth = barWidths[size] || barWidths.md;

  // Staggered duration & delays for realistic organic voice wave
  const delays = [0, 0.2, 0.4, 0.15, 0.35, 0.5];
  const durations = [0.75, 0.6, 0.9, 0.7, 0.85, 0.65];

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <div className={cn("inline-flex items-end gap-1.5 px-2 py-1", selectedHeight)}>
        {Array.from({ length: barCount }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "rounded-full origin-bottom bg-gradient-to-t from-primary via-indigo-500 to-cyan-400 shadow-xs shadow-primary/30",
              selectedWidth,
              "h-full"
            )}
            style={{
              animation: `equalizerPulse ${durations[i % durations.length]}s ease-in-out infinite`,
              animationDelay: `${delays[i % delays.length]}s`,
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-xs font-semibold text-muted-foreground truncate">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * 4. Square Morphs
 * 3D rotating geometric morph: Square -> Circle -> Diamond with perspective.
 */
export const SquareMorphs = ({
  size = "md",
  color = "primary",
  label,
  className = "",
}) => {
  const sizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const selectedSize = sizes[size] || sizes.md;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className="py-2">
        <div
          className={cn(
            "bg-gradient-to-tr from-primary via-indigo-600 to-cyan-400 shadow-xl shadow-primary/30 border border-white/30",
            selectedSize
          )}
          style={{
            animation: "squareMorphRotate 2.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite",
          }}
        />
      </div>
      {label && (
        <span className="text-xs font-semibold text-muted-foreground animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * 5. Dots Grid Wave
 * 3x3 matrix of 9 glowing dots with diagonal wave cascade.
 */
export const DotsGridWave = ({
  size = "md",
  color = "primary",
  label,
  className = "",
}) => {
  const containerSizes = {
    sm: "w-6 h-6 gap-0.5",
    md: "w-10 h-10 gap-1",
    lg: "w-14 h-14 gap-1.5",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };

  const selectedContainer = containerSizes[size] || containerSizes.md;
  const selectedDot = dotSizes[size] || dotSizes.md;

  // 3x3 grid coordinates for diagonal delay cascade
  const gridDelays = [
    [0.2, 0.3, 0.4],
    [0.1, 0.2, 0.3],
    [0.0, 0.1, 0.2],
  ];

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className={cn("grid grid-cols-3 place-items-center py-1", selectedContainer)}>
        {gridDelays.flatMap((row, rIdx) =>
          row.map((delay, cIdx) => (
            <span
              key={`${rIdx}-${cIdx}`}
              className={cn(
                "rounded-full bg-gradient-to-br from-primary to-cyan-400 shadow-xs shadow-primary/20",
                selectedDot
              )}
              style={{
                animation: "gridWaveScale 1.3s ease-in-out infinite",
                animationDelay: `${delay}s`,
              }}
            />
          ))
        )}
      </div>
      {label && (
        <span className="text-xs font-semibold text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * 6. Typing Dots
 * Elegant chat & AI typing bubble indicator.
 */
export const TypingDots = ({
  label = "AI is thinking...",
  compact = false,
  className = "",
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-card/70 backdrop-blur-md shadow-xs",
        className
      )}
    >
      <div className="inline-flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{
              animation: "typingDotPulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
      {!compact && label && (
        <span className="text-xs font-semibold text-muted-foreground select-none">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * 7. Bouncing Balls
 * Physics-based squash & stretch bouncing spheres with dynamic contact shadows.
 */
export const BouncingBalls = ({
  size = "md",
  label,
  className = "",
}) => {
  const ballSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const shadowSizes = {
    sm: "w-2.5 h-1",
    md: "w-4 h-1.5",
    lg: "w-5 h-2",
  };

  const selectedBall = ballSizes[size] || ballSizes.md;
  const selectedShadow = shadowSizes[size] || shadowSizes.md;

  const balls = [
    { delay: "0ms", color: "from-primary to-indigo-600" },
    { delay: "160ms", color: "from-cyan-500 to-blue-600" },
    { delay: "320ms", color: "from-fuchsia-500 to-pink-600" },
  ];

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className="inline-flex items-end gap-3 pt-4 pb-1">
        {balls.map((ball, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {/* Bouncing Sphere */}
            <span
              className={cn(
                "rounded-full bg-gradient-to-t shadow-md",
                ball.color,
                selectedBall
              )}
              style={{
                animation: "ballSquashBounce 0.75s cubic-bezier(0.28, 0.84, 0.42, 1) infinite",
                animationDelay: ball.delay,
              }}
            />
            {/* Ground Contact Shadow */}
            <span
              className={cn("rounded-full bg-foreground/20", selectedShadow)}
              style={{
                animation: "ballShadowPulse 0.75s cubic-bezier(0.28, 0.84, 0.42, 1) infinite",
                animationDelay: ball.delay,
              }}
            />
          </div>
        ))}
      </div>
      {label && (
        <span className="text-xs font-semibold text-muted-foreground animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * Unified LoadingAnimation Component
 * Accepts variant="bouncingDots" | "indeterminateBar" | "equalizer" | "squareMorph" | "dotsGrid" | "typing" | "bouncingBalls"
 */
export default function LoadingAnimation({
  variant = "bouncingDots",
  size = "md",
  color = "primary",
  label,
  className = "",
  ...props
}) {
  switch (variant) {
    case "indeterminateBar":
    case "indeterminate":
    case "bar":
      return (
        <IndeterminateBar
          color={color}
          label={label}
          className={className}
          {...props}
        />
      );
    case "equalizer":
    case "equalizerBars":
    case "audio":
      return (
        <EqualizerBars
          size={size}
          color={color}
          label={label}
          className={className}
          {...props}
        />
      );
    case "squareMorph":
    case "squareMorphs":
    case "morph":
      return (
        <SquareMorphs
          size={size}
          color={color}
          label={label}
          className={className}
          {...props}
        />
      );
    case "dotsGrid":
    case "dotsGridWave":
    case "grid":
      return (
        <DotsGridWave
          size={size}
          color={color}
          label={label}
          className={className}
          {...props}
        />
      );
    case "typing":
    case "typingDots":
      return (
        <TypingDots
          label={label}
          className={className}
          {...props}
        />
      );
    case "bouncingBalls":
    case "balls":
      return (
        <BouncingBalls
          size={size}
          label={label}
          className={className}
          {...props}
        />
      );
    case "bouncingDots":
    case "dots":
    default:
      return (
        <BouncingDots
          size={size}
          color={color}
          label={label}
          className={className}
          {...props}
        />
      );
  }
}
