// components/ui/MicroInteractions.jsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Bookmark,
  Star,
  Eye,
  EyeOff,
  Send,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Plus,
  Minus,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Share2,
} from "lucide-react";

/**
 * 1. Particle Burst
 * Radiates colorful sparks/particles outward on trigger.
 */
export const ParticleBurst = ({ active = false, count = 8, color = "#6366f1" }) => {
  if (!active) return null;
  const particles = Array.from({ length: count });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
      {particles.map((_, i) => {
        const angle = (i * 360) / count;
        const rad = (angle * Math.PI) / 180;
        const dist = 28;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;

        return (
          <span
            key={i}
            className="absolute rounded-full animate-ping"
            style={{
              width: i % 2 === 0 ? "5px" : "3px",
              height: i % 2 === 0 ? "5px" : "3px",
              backgroundColor: i % 3 === 0 ? "#06b6d4" : i % 2 === 0 ? "#ec4899" : color,
              transform: `translate(${x}px, ${y}px)`,
              animationDuration: "0.6s",
              animationIterationCount: 1,
            }}
          />
        );
      })}
    </div>
  );
};

export const ParticleBurstButton = ({
  children,
  onClick,
  className = "",
  ...props
}) => {
  const [bursting, setBursting] = useState(false);

  const handleClick = (e) => {
    setBursting(true);
    setTimeout(() => setBursting(false), 600);
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold transition-transform active:scale-95 cursor-pointer overflow-visible",
        className
      )}
      {...props}
    >
      <ParticleBurst active={bursting} />
      {children}
    </button>
  );
};

/**
 * 2. Luxury Toggle Switch
 * Liquid magnetic spring switch with smooth glowing thumb.
 */
export const LuxuryToggle = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = "",
}) => {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <div
        onClick={() => !disabled && onChange?.(!checked)}
        className={cn(
          "w-12 h-6 rounded-full transition-all duration-300 relative p-0.5 border shadow-inner",
          checked
            ? "bg-gradient-to-r from-primary to-indigo-600 border-primary shadow-primary/20"
            : "bg-secondary/70 border-border/80"
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center",
            checked ? "translate-x-6 shadow-primary/30" : "translate-x-0"
          )}
        >
          {checked && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
      </div>
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
    </label>
  );
};

/**
 * 3. Checkbox Strike
 * Animated check with striking line-through on label text.
 */
export const CheckboxStrike = ({
  checked = false,
  onChange,
  label,
  className = "",
}) => {
  return (
    <label
      onClick={() => onChange?.(!checked)}
      className={cn(
        "inline-flex items-center gap-3 cursor-pointer select-none group",
        className
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200",
          checked
            ? "bg-primary border-primary text-white shadow-xs scale-105"
            : "border-border/80 bg-secondary/40 group-hover:border-primary/60"
        )}
      >
        <Check
          className={cn(
            "w-3.5 h-3.5 stroke-[3] transition-all duration-200",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        />
      </div>
      {label && (
        <span
          className={cn(
            "text-sm font-medium transition-all duration-300 relative",
            checked
              ? "text-muted-foreground line-through opacity-60"
              : "text-foreground"
          )}
        >
          {label}
        </span>
      )}
    </label>
  );
};

/**
 * 4. Add to Cart / Action Counter Button
 * Starts as button with cart icon, then morphs into a number stepper.
 */
export const AddToCartButton = ({
  onAdd,
  initialCount = 0,
  label = "Add to Cart",
  className = "",
}) => {
  const [count, setCount] = useState(initialCount);

  const handleIncrement = () => {
    const next = count + 1;
    setCount(next);
    onAdd?.(next);
  };

  const handleDecrement = () => {
    const next = Math.max(0, count - 1);
    setCount(next);
    onAdd?.(next);
  };

  if (count === 0) {
    return (
      <button
        onClick={handleIncrement}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20 cursor-pointer",
          className
        )}
      >
        <ShoppingCart className="w-4 h-4" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 px-2 py-1 rounded-xl bg-secondary border border-border/80 shadow-inner",
        className
      )}
    >
      <button
        onClick={handleDecrement}
        className="w-7 h-7 rounded-lg bg-card hover:bg-muted flex items-center justify-center text-foreground transition-transform active:scale-90 cursor-pointer"
        aria-label="Decrease quantity"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="font-bold text-sm text-foreground min-w-[20px] text-center">
        {count}
      </span>
      <button
        onClick={handleIncrement}
        className="w-7 h-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
        aria-label="Increase quantity"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * 5. Pull To Refresh Simulator
 * Drag down container revealing animated spinner with haptic trigger.
 */
export const PullToRefresh = ({
  onRefresh,
  children,
  className = "",
}) => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0) {
        setPulling(true);
        setPullDistance(Math.min(diff * 0.4, 70));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 45) {
      setRefreshing(true);
      await onRefresh?.();
      setTimeout(() => {
        setRefreshing(false);
        setPulling(false);
        setPullDistance(0);
      }, 800);
    } else {
      setPulling(false);
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Pull Indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ height: `${pullDistance}px` }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <RefreshCw
            className={cn(
              "w-4 h-4 transition-transform",
              refreshing ? "animate-spin" : ""
            )}
            style={{ transform: `rotate(${pullDistance * 5}deg)` }}
          />
          <span>{refreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </div>
      </div>
      {children}
    </div>
  );
};

/**
 * 6. Swipe To Delete Card
 * Horizontal drag revealing red trash can with spring dismiss.
 */
export const SwipeToDelete = ({
  onDelete,
  children,
  className = "",
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [deleted, setDeleted] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) {
      setOffsetX(Math.max(diff, -100));
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < -65) {
      setDeleted(true);
      onDelete?.();
    } else {
      setOffsetX(0);
    }
  };

  if (deleted) return null;

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Background Trash Action */}
      <div className="absolute inset-y-0 right-0 w-24 bg-red-600 flex items-center justify-center text-white font-semibold">
        <Trash2 className="w-5 h-5 animate-pulse" />
      </div>

      {/* Forefront Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-card transition-transform duration-200"
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * 7. Loading to Success Button
 * High-end button that morphs: Idle -> Spinner -> Success Checkmark!
 */
export const LoadingToSuccessButton = ({
  onClick,
  idleText = "Submit Details",
  loadingText = "Validating...",
  successText = "Completed!",
  className = "",
}) => {
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "success"

  const handleClick = async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      await onClick?.();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading"}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 min-w-[140px] cursor-pointer shadow-sm select-none",
        status === "idle" &&
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:scale-[1.02] active:scale-95",
        status === "loading" &&
          "bg-primary/80 text-primary-foreground opacity-90 cursor-wait",
        status === "success" &&
          "bg-emerald-600 text-white shadow-emerald-600/30 animate-pulse-ring",
        className
      )}
    >
      {status === "idle" && <span>{idleText}</span>}
      {status === "loading" && (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-4 h-4 animate-icon-pop" />
          <span>{successText}</span>
        </>
      )}
    </button>
  );
};

/**
 * 8. Interactive Star Rating
 * Hover illumination & celebratory pop on click.
 */
export const StarRating = ({
  value = 0,
  onChange,
  max = 5,
  size = 20,
  className = "",
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {Array.from({ length: max }).map((_, i) => {
        const starNumber = i + 1;
        const isFilled = (hoverIndex !== null ? hoverIndex : value) >= starNumber;

        return (
          <button
            type="button"
            key={i}
            onMouseEnter={() => setHoverIndex(starNumber)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => onChange?.(starNumber)}
            className="p-1 rounded-md transition-transform hover:scale-125 active:scale-95 cursor-pointer"
            aria-label={`Rate ${starNumber} stars`}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors duration-200",
                isFilled
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                  : "text-muted-foreground/40 hover:text-amber-400/60"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

/**
 * 9. Bookmark Save Button
 * Morphing ribbon icon with micro particle pop.
 */
export const BookmarkSave = ({
  active = false,
  onToggle,
  className = "",
}) => {
  const [isBookmarked, setIsBookmarked] = useState(active);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    setIsBookmarked(active);
  }, [active]);

  const handleClick = (e) => {
    e.stopPropagation();
    const next = !isBookmarked;
    setIsBookmarked(next);
    setPopping(true);
    setTimeout(() => setPopping(false), 450);
    onToggle?.(next);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative p-2 rounded-xl transition-all duration-200 hover:bg-secondary active:scale-90 cursor-pointer overflow-visible",
        className
      )}
      title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
      aria-label="Bookmark"
    >
      <ParticleBurst active={popping} count={6} color="#8b5cf6" />
      <Bookmark
        className={cn(
          "w-5 h-5 transition-all duration-200",
          isBookmarked
            ? "fill-primary text-primary animate-icon-pop drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]"
            : "text-muted-foreground hover:text-foreground"
        )}
      />
    </button>
  );
};

/**
 * 10. Copy Link Button
 * Copies to clipboard, with haptic checkmark feedback & tooltip.
 */
export const CopyLinkButton = ({
  text,
  label = "Copy Link",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      if (text) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border cursor-pointer active:scale-95",
        copied
          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-xs"
          : "bg-secondary/60 border-border/80 text-foreground hover:bg-secondary",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400 animate-icon-pop" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

/**
 * 11. Segment Control
 * Magnetic sliding spotlight pill indicator.
 */
export const SegmentControl = ({
  options = [],
  value,
  onChange,
  className = "",
}) => {
  const activeIdx = options.findIndex((opt) => opt.value === value || opt === value);
  const count = options.length;

  return (
    <div
      className={cn(
        "inline-flex p-1 rounded-xl bg-secondary/80 border border-border/60 relative",
        className
      )}
    >
      {/* Sliding Pill Spotlight */}
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-card shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: `calc(${100 / count}% - 8px / ${count})`,
          transform: `translateX(${activeIdx * 100}%)`,
        }}
      />

      {options.map((opt) => {
        const val = opt.value || opt;
        const label = opt.label || opt;
        const isActive = val === value;

        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange?.(val)}
            className={cn(
              "relative z-10 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 text-center truncate",
              isActive ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * 12. Tab Bar Slide
 * Gliding underline active indicator tab bar.
 */
export const TabBarSlide = ({
  tabs = [],
  activeTab,
  onChange,
  className = "",
}) => {
  const activeIndex = tabs.findIndex((t) => t.id === activeTab || t === activeTab);

  return (
    <div className={cn("flex border-b border-border/60 relative", className)}>
      {tabs.map((tab) => {
        const id = tab.id || tab;
        const label = tab.label || tab;
        const isActive = id === activeTab;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange?.(id)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}

      {/* Sliding Indicator Rail */}
      <div
        className="absolute bottom-0 h-0.5 bg-primary rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${100 / tabs.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
    </div>
  );
};

/**
 * 13. Number Stepper
 * Rolling digit animations for increment/decrement.
 */
export const NumberStepper = ({
  value = 1,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  className = "",
}) => {
  const [animDirection, setAnimDirection] = useState(null);

  const handlePlus = () => {
    if (value + step <= max) {
      setAnimDirection("up");
      onChange?.(value + step);
    }
  };

  const handleMinus = () => {
    if (value - step >= min) {
      setAnimDirection("down");
      onChange?.(value - step);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl bg-secondary/80 border border-border/70 p-1 shadow-xs",
        className
      )}
    >
      <button
        onClick={handleMinus}
        disabled={value <= min}
        className="w-8 h-8 rounded-lg bg-card hover:bg-muted text-foreground flex items-center justify-center transition-transform active:scale-90 disabled:opacity-40 cursor-pointer shadow-xs"
        aria-label="Decrease"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* Rolling Digit Display */}
      <div className="w-12 h-8 overflow-hidden flex items-center justify-center relative">
        <span
          key={value}
          className={cn(
            "font-extrabold text-sm text-foreground",
            animDirection === "up" && "animate-number-up",
            animDirection === "down" && "animate-number-down"
          )}
        >
          {value}
        </span>
      </div>

      <button
        onClick={handlePlus}
        disabled={value >= max}
        className="w-8 h-8 rounded-lg bg-card hover:bg-muted text-foreground flex items-center justify-center transition-transform active:scale-90 disabled:opacity-40 cursor-pointer shadow-xs"
        aria-label="Increase"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * 14. Password Reveal Input
 * Eye slash icon morphs with specular flash.
 */
export const PasswordRevealInput = ({
  value,
  onChange,
  placeholder = "Enter password...",
  className = "",
  ...props
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative w-full", className)}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-border/70 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-transform active:scale-90 cursor-pointer p-1"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="w-4 h-4 animate-icon-pop text-primary" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

/**
 * 15. Error Shake Input
 * Dynamic physical spring shake on validation error.
 */
export const ErrorShakeInput = ({
  hasError = false,
  errorMessage,
  className = "",
  ...props
}) => {
  return (
    <div className="w-full space-y-1">
      <input
        className={cn(
          "w-full px-3.5 py-2.5 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none transition-all",
          hasError
            ? "border-red-500 ring-2 ring-red-500/20 animate-error-shake"
            : "border-border/70 focus:ring-2 focus:ring-primary/40",
          className
        )}
        {...props}
      />
      {hasError && errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

/**
 * 16. Toasted Drop Banner
 * Floating toast banner drop-in with soft bounce.
 */
export const ToastedDrop = ({
  visible = true,
  onClose,
  title,
  message,
  type = "success",
}) => {
  if (!visible) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-toast-drop max-w-md w-full px-4">
      <div
        className={cn(
          "rounded-2xl p-4 shadow-2xl backdrop-blur-xl border flex items-center justify-between gap-3",
          type === "success" &&
            "bg-card/90 border-emerald-500/30 text-foreground shadow-emerald-500/10",
          type === "error" &&
            "bg-card/90 border-red-500/30 text-foreground shadow-red-500/10"
        )}
      >
        <div className="flex items-center gap-3">
          {type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <div>
            <h5 className="text-sm font-bold">{title}</h5>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * 17. Circular Progress Ring
 * Radial SVG gauge with glowing stroke animation.
 */
export const ProgressRing = ({
  progress = 75,
  size = 70,
  strokeWidth = 6,
  className = "",
}) => {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary opacity-40 fill-none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary fill-none transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-bold text-xs text-foreground">
        {Math.round(progress)}%
      </span>
    </div>
  );
};

/**
 * 18. Luxury Accordion Expand
 * Smooth expanding panel with rotating chevron.
 */
export const LuxuryAccordion = ({
  title,
  isOpen,
  onToggle,
  children,
  className = "",
}) => {
  const [open, setOpen] = useState(isOpen ?? false);

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!open);
    } else {
      setOpen(!open);
    }
  };

  const isCurrentOpen = isOpen !== undefined ? isOpen : open;

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden",
        isCurrentOpen
          ? "border-primary/40 bg-card shadow-sm"
          : "border-border/60 bg-card/40 hover:border-border",
        className
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="w-full p-4 flex items-center justify-between text-left font-bold text-sm text-foreground cursor-pointer"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300",
            isCurrentOpen && "transform rotate-180 text-primary"
          )}
        />
      </button>
      <div
        className={cn(
          "transition-all duration-300 ease-in-out px-4 overflow-hidden",
          isCurrentOpen ? "max-h-96 pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"
        )}
      >
        <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * 19. Send Message Button
 * Paper plane flight takeoff animation on send.
 */
export const SendMessageButton = ({
  onSend,
  label = "Send",
  className = "",
}) => {
  const [flying, setFlying] = useState(false);

  const handleClick = async () => {
    setFlying(true);
    await onSend?.();
    setTimeout(() => setFlying(false), 850);
  };

  return (
    <button
      onClick={handleClick}
      disabled={flying}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20 cursor-pointer overflow-hidden",
        className
      )}
    >
      <Send className={cn("w-4 h-4", flying && "animate-plane-takeoff")} />
      <span>{flying ? "Sending..." : label}</span>
    </button>
  );
};

/**
 * 20. Long Press Trigger Button
 * Radial progress ring charges as you press and hold, then fires action.
 */
export const LongPressButton = ({
  onLongPress,
  duration = 800,
  label = "Hold to Confirm",
  className = "",
}) => {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const startPress = () => {
    setProgress(0);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
    }, 16);

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setProgress(100);
      onLongPress?.();
      setTimeout(() => setProgress(0), 400);
    }, duration);
  };

  const endPress = () => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setProgress(0);
  };

  return (
    <button
      type="button"
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      className={cn(
        "relative inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary/80 text-foreground transition-all select-none overflow-hidden cursor-pointer active:scale-98 border border-border/80",
        className
      )}
    >
      {/* Background charge bar */}
      <span
        className="absolute inset-y-0 left-0 bg-primary/20 transition-all ease-linear"
        style={{ width: `${progress}%` }}
      />
      <span className="relative z-10">{progress >= 100 ? "Confirmed!" : label}</span>
    </button>
  );
};
