// components/ui/ProgressSteps.jsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Sparkles } from "lucide-react";

/**
 * 1. Numbered Steps
 * Clean, professional numbered circular badges connected with dynamic progress rails.
 */
export const NumberedSteps = ({
  steps = [],
  currentStep = 0,
  onStepClick,
  className = "",
}) => {
  return (
    <div className={cn("w-full py-2", className)}>
      <div className="flex items-center justify-between relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isUpcoming = idx > currentStep;
          const isClickable = Boolean(onStepClick);

          return (
            <React.Fragment key={step.id || step.title || idx}>
              {/* Step Item */}
              <div
                onClick={() => isClickable && onStepClick(idx)}
                className={cn(
                  "flex flex-col items-center relative z-10 group",
                  isClickable && "cursor-pointer"
                )}
              >
                {/* Numbered Badge */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                    isCompleted &&
                      "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 scale-100",
                    isActive &&
                      "bg-gradient-to-br from-primary to-indigo-600 text-white ring-4 ring-primary/20 shadow-xl shadow-primary/40 scale-110",
                    isUpcoming &&
                      "bg-secondary border border-border/80 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Labels */}
                <div className="text-center mt-2 max-w-[110px] sm:max-w-[140px]">
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-semibold truncate transition-colors",
                      isActive
                        ? "text-primary dark:text-primary-300"
                        : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-[11px] text-muted-foreground hidden sm:block truncate mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Rail */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4 h-1 rounded-full bg-secondary overflow-hidden relative -top-3 sm:-top-4">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 ease-out",
                      idx < currentStep
                        ? "w-full bg-gradient-to-r from-green-500 to-primary"
                        : idx === currentStep
                        ? "w-1/2 bg-primary animate-pulse"
                        : "w-0"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 2. Segment Bar Stepper
 * Modern discrete segmented progress bar (like iOS / Tesla / Linear)
 */
export const SegmentBar = ({
  steps = [],
  currentStep = 0,
  onStepClick,
  className = "",
}) => {
  const total = steps.length || 3;
  const activeStep = steps[currentStep] || { title: `Step ${currentStep + 1}` };
  const percentage = Math.round(((currentStep + 1) / total) * 100);

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">
            Phase {currentStep + 1} of {total}:
          </span>
          <span className="text-muted-foreground font-medium truncate">
            {activeStep.title}
          </span>
        </div>
        <span className="font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 text-xs">
          {percentage}% Complete
        </span>
      </div>

      {/* Discrete Segmented Rails */}
      <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isClickable = Boolean(onStepClick);

          return (
            <button
              type="button"
              key={step.id || step.title || idx}
              onClick={() => isClickable && onStepClick(idx)}
              disabled={!isClickable}
              className={cn(
                "h-2.5 sm:h-3 rounded-full transition-all duration-300 relative overflow-hidden",
                isClickable && "cursor-pointer hover:opacity-90",
                isCompleted &&
                  "bg-gradient-to-r from-emerald-500 to-primary shadow-xs shadow-primary/20",
                isActive &&
                  "bg-gradient-to-r from-primary to-indigo-500 segment-active-pulse shadow-md shadow-primary/30",
                idx > currentStep && "bg-secondary/60 border border-border/30"
              )}
              title={step.title}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * 3. Breadcrumb Arrow Stepper
 * Directional chevron-style wizard steps where each phase points into the next.
 */
export const BreadcrumbArrowSteps = ({
  steps = [],
  currentStep = 0,
  onStepClick,
  className = "",
}) => {
  return (
    <div className={cn("w-full overflow-x-auto no-scrollbar py-1", className)}>
      <div className="flex items-stretch min-w-max sm:min-w-0 sm:grid sm:grid-flow-col sm:auto-cols-fr gap-1 sm:gap-0 rounded-xl overflow-hidden border border-border/50 bg-secondary/20 p-1">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isUpcoming = idx > currentStep;
          const isFirst = idx === 0;
          const isLast = idx === steps.length - 1;
          const isClickable = Boolean(onStepClick);

          return (
            <button
              type="button"
              key={step.id || step.title || idx}
              onClick={() => isClickable && onStepClick(idx)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all relative select-none",
                isFirst ? "breadcrumb-arrow-step-first" : isLast ? "breadcrumb-arrow-step-last" : "breadcrumb-arrow-step",
                isClickable && "cursor-pointer",
                isActive &&
                  "bg-gradient-to-r from-primary via-indigo-600 to-primary text-white shadow-md shadow-primary/25 z-20",
                isCompleted &&
                  "bg-secondary/80 text-foreground hover:bg-secondary border-r border-border/40 z-10",
                isUpcoming &&
                  "bg-transparent text-muted-foreground opacity-60 hover:opacity-80"
              )}
            >
              {/* Badge or Check */}
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isActive
                    ? "bg-white text-primary"
                    : isCompleted
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
              </span>

              <span className="truncate">{step.title}</span>

              {/* Chevron icon indicator for mobile fallback */}
              {!isLast && (
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground/60 sm:hidden shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 4. Checkout Icons Type Progress Steps
 * High-end checkout / e-commerce style step flow featuring rich glowing icon badges.
 */
export const CheckoutIconSteps = ({
  steps = [],
  currentStep = 0,
  onStepClick,
  className = "",
}) => {
  return (
    <div className={cn("w-full py-2", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isUpcoming = idx > currentStep;
          const isClickable = Boolean(onStepClick);
          const Icon = step.icon || Sparkles;

          return (
            <div
              key={step.id || step.title || idx}
              onClick={() => isClickable && onStepClick(idx)}
              className={cn(
                "relative rounded-2xl p-4 transition-all duration-300 flex items-center gap-3.5 border",
                isClickable && "cursor-pointer hover:scale-[1.02]",
                isActive &&
                  "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/40",
                isCompleted &&
                  "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50",
                isUpcoming &&
                  "bg-secondary/20 border-border/40 opacity-70"
              )}
            >
              {/* Icon Container with dynamic glow */}
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 relative",
                  isActive &&
                    "bg-gradient-to-br from-primary to-indigo-600 text-white shadow-md shadow-primary/30 scale-105",
                  isCompleted &&
                    "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
                  isUpcoming &&
                    "bg-secondary text-muted-foreground border border-border/40"
                )}
              >
                <Icon className="w-6 h-6" />
                {isCompleted && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Step {idx + 1}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      isActive && "bg-primary/20 text-primary animate-pulse",
                      isCompleted && "bg-emerald-500/20 text-emerald-400",
                      isUpcoming && "bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {isActive ? "In Progress" : isCompleted ? "Completed" : "Upcoming"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground truncate">
                  {step.title}
                </h4>
                {step.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Unified ProgressSteps Component
 * Accepts variant="numbered" | "segment" | "breadcrumb" | "checkout"
 */
export default function ProgressSteps({
  variant = "checkout",
  steps = [],
  currentStep = 0,
  onStepClick,
  className = "",
}) {
  switch (variant) {
    case "numbered":
      return (
        <NumberedSteps
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
          className={className}
        />
      );
    case "segment":
      return (
        <SegmentBar
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
          className={className}
        />
      );
    case "breadcrumb":
      return (
        <BreadcrumbArrowSteps
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
          className={className}
        />
      );
    case "checkout":
    default:
      return (
        <CheckoutIconSteps
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
          className={className}
        />
      );
  }
}
