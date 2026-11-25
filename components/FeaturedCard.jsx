// components/FeaturedCard.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BookmarkSave } from "@/components/ui/MicroInteractions";

const SAVED_FEATURED_KEY = "prepwise:saved-featured";

function getDestinationRoute(type, href) {
  if (href) return href;
  const normalized = String(type || "").toLowerCase();
  if (normalized === "internship") return "/internships";
  if (normalized === "competition" || normalized === "award") return "/competitions";
  return "/interview";
}

const FeaturedCard = ({
  id,
  title,
  company,
  description,
  type,
  prize,
  stats,
  buttonText,
  badge,
  href,
}) => {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);

  const itemKey = String(id || title || "").trim();
  const normalizedType = String(type || "").toLowerCase().trim();
  const hasValidPrize =
    Boolean(prize) && !/^(n\/?a|not disclosed|none|-)$/i.test(String(prize).trim());

  useEffect(() => {
    if (!itemKey || typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_FEATURED_KEY) || "[]");
      setIsSaved(Array.isArray(saved) && saved.includes(itemKey));
    } catch {
      setIsSaved(false);
    }
  }, [itemKey]);

  const handleToggleSave = (nextState) => {
    setIsSaved(nextState);
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_FEATURED_KEY) || "[]");
      const list = Array.isArray(saved) ? saved : [];
      const updated = nextState
        ? Array.from(new Set([...list, itemKey]))
        : list.filter((entry) => entry !== itemKey);
      localStorage.setItem(SAVED_FEATURED_KEY, JSON.stringify(updated));
      toast.success(nextState ? "Saved to your featured bookmarks" : "Removed from featured bookmarks");
    } catch {
      toast.error("Could not update bookmark");
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const targetPath = getDestinationRoute(type, href);
    const shareUrl =
      typeof window !== "undefined" ? `${window.location.origin}${targetPath}` : targetPath;
    const shareText = company ? `${title} - ${company}` : title;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: shareText,
            text: description || shareText,
            url: shareUrl,
          });
          toast.success("Shared successfully!");
          return;
        } catch (shareError) {
          if (shareError.name === "AbortError") return;
        }
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        return;
      }

      toast.info(shareUrl);
    } catch {
      toast.error("Failed to share");
    }
  };

  return (
    <div className="premium-card-glass p-6 sm:p-7 flex flex-col justify-between h-full group">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start gap-2 mb-3.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold line-clamp-1 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              {title}
            </h3>
            {company && (
              <p className="text-indigo-600 dark:text-[#C7D2FE] font-semibold text-sm mt-0.5 line-clamp-1">
                {company}
              </p>
            )}
          </div>
          {badge && (
            <span className="premium-pill-badge text-xs px-3 py-1 font-semibold whitespace-nowrap shrink-0">
              {badge}
            </span>
          )}
        </div>

        {/* Details Inset Tile */}
        <div className="premium-inset-tile p-4 space-y-3 mb-4">
          {hasValidPrize && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Prize
              </p>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {prize}
              </div>
            </div>
          )}

          {type && (
            <div className="text-xs">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold inline-block capitalize border",
                  normalizedType === "internship" &&
                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                  normalizedType === "competition" &&
                    "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
                  normalizedType === "award" &&
                    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                  !["internship", "competition", "award"].includes(normalizedType) &&
                    "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30"
                )}
              >
                {type}
              </span>
            </div>
          )}

          {description && (
            <div
              className={cn(
                (hasValidPrize || type) &&
                  "mt-1 pt-2 border-t border-slate-100 dark:border-slate-800/60"
              )}
            >
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {description}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="mb-5">
            <div className="flex flex-wrap gap-1.5">
              {stats.slice(0, 4).map((stat, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-200 border border-indigo-100 dark:border-slate-700/60 text-xs rounded-full font-medium"
                  title={stat}
                >
                  {String(stat).replace(/:\s*$/, "")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 mt-auto pt-2">
        <Button
          onClick={() => router.push(getDestinationRoute(type, href))}
          className="btn-theme-action w-full py-2.5 text-sm font-bold shadow-md"
        >
          {buttonText || "Explore"}
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors py-1">
            <BookmarkSave active={isSaved} onToggle={handleToggleSave} />
            <span className="text-xs font-semibold pr-3 text-slate-600 dark:text-slate-300 select-none">
              {isSaved ? "Saved" : "Save"}
            </span>
          </div>
          <Button
            variant="outline"
            className="flex-1 text-xs sm:text-sm rounded-2xl border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200"
            onClick={handleShare}
          >
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedCard;
