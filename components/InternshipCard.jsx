// components/InternshipCard.jsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { saveInternship, unsaveInternship, isInternshipSaved } from "@/lib/actions/saved-internships.action";
import { trackApplicationIntent } from "@/lib/actions/profile-achievements.action";
import { BookmarkSave, ParticleBurst } from "@/components/ui/MicroInteractions";

const InternshipCard = ({ internship, onApply }) => {
  const [applying, setApplying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if internship is already saved
  useEffect(() => {
    const checkIfSaved = async () => {
      const result = await isInternshipSaved({ internshipId: internship.id });
      if (result.success) {
        setIsSaved(result.isSaved);
      }
    };
    checkIfSaved();
  }, [internship.id]);

  const handleApply = async () => {
    if (onApply) {
      onApply();
      return;
    }

    setApplying(true);
    try {
      const applyUrl = internship.applyLink || internship.url;
      if (applyUrl) {
        window.open(applyUrl, "_blank");
        const result = await trackApplicationIntent({
          applicationType: "internship",
          listingId: String(internship.id || applyUrl),
          title: internship.title,
          company: internship.company,
          applyUrl,
        });
        if (result.success) {
          toast.success(result.created ? "Internship application tracked toward your rewards." : "This internship is already in your application progress.");
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.info("Application link not available.");
    } catch (error) {
      toast.error("Failed to process application. Please try again.");
      console.error("Failed to track internship application:", error);
    } finally {
      setApplying(false);
    }
  };

  const getApplicationStatus = () => {
    const today = new Date();
    const deadline = internship.deadline ? new Date(internship.deadline) : null;

    if (deadline && !Number.isNaN(deadline.getTime()) && today > deadline) {
      return { status: "closed", text: "Application Closed" };
    }

    if (!deadline || Number.isNaN(deadline.getTime())) {
      return { status: "open", text: "Apply Now" };
    }

    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 3) {
      return { status: "urgent", text: `Apply Now - ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` };
    }

    return { status: "open", text: "Apply Now" };
  };

  const applicationStatus = getApplicationStatus();

  return (
    <div 
      className={cn("premium-card-glass p-6 sm:p-7 flex flex-col justify-between h-full group")}
    >
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-3.5">
          <div className="flex-1 pr-2">
            <h3 className="text-xl font-bold line-clamp-1 text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
              {internship.title}
            </h3>
            <p className="text-indigo-600 dark:text-[#C7D2FE] font-semibold text-sm mt-0.5">{internship.company}</p>
          </div>
          {internship.badge && (
            <span className="premium-pill-badge text-xs px-3 py-1 font-semibold whitespace-nowrap">
              {internship.badge}
            </span>
          )}
        </div>

        {/* Details Inset Tile */}
        <div className="premium-inset-tile p-4 space-y-3 mb-4">
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 dark:text-slate-400">Location:</span>
              <span className={cn("line-clamp-1 font-semibold text-slate-800 dark:text-slate-200",
                internship.isRemote && "text-emerald-600 dark:text-emerald-400"
              )}>
                {internship.location}
                {internship.isRemote && " (Remote)"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 dark:text-slate-400">Duration:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{internship.duration}</span>
            </div>
          </div>

          <div className="text-lg font-black text-slate-900 dark:text-white">
            {internship.stipend}
          </div>

          <div className="text-xs">
            <span className={cn(
              "px-2.5 py-1 rounded-full font-bold inline-block",
              applicationStatus.status === "closed" && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
              applicationStatus.status === "urgent" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
              applicationStatus.status === "open" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
            )}>
              {applicationStatus.text}
            </span>
          </div>

          {/* Description */}
          {internship.description && (
            <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {internship.description}
              </p>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-1.5">
            {internship.skills?.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-200 border border-indigo-100 dark:border-slate-700/60 text-xs rounded-full font-medium"
                title={skill}
              >
                {skill.length > 15 ? `${skill.substring(0, 15)}...` : skill}
              </span>
            ))}
            {internship.skills?.length > 5 && (
              <span className="px-2.5 py-1 bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-200 border border-indigo-100 dark:border-slate-700/60 text-xs rounded-full font-medium">
                +{internship.skills.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 mt-auto pt-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            if (applicationStatus.status !== "closed") {
              handleApply();
            } else {
              toast.error("Applications for this internship are closed");
            }
          }}
          disabled={applying || applicationStatus.status === "closed"}
          className={cn(
            "btn-theme-action w-full py-2.5 text-sm font-bold relative overflow-visible shadow-md",
            applicationStatus.status === "closed" && "opacity-50 cursor-not-allowed"
          )}
        >
          <ParticleBurst active={applying} count={8} color="#6366f1" />
          {applying ? "Applying..." : applicationStatus.text}
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors py-1">
            <BookmarkSave
              active={isSaved}
              onToggle={(nextState) => {
                setIsSaving(true);
                (async () => {
                  try {
                    if (!nextState) {
                      const result = await unsaveInternship({ internshipId: internship.id });
                      if (result.success) {
                        setIsSaved(false);
                        toast.success("Removed from saved internships");
                      } else {
                        toast.error(result.error || "Failed to unsave");
                      }
                    } else {
                      const result = await saveInternship({
                        internshipId: internship.id,
                        internshipData: internship,
                      });
                      if (result.success) {
                        setIsSaved(true);
                        toast.success("Added to saved internships");
                      } else {
                        toast.error(result.error || "Failed to save");
                      }
                    }
                  } catch (error) {
                    toast.error("Something went wrong");
                    console.error(error);
                  } finally {
                    setIsSaving(false);
                  }
                })();
              }}
            />
            <span className="text-xs font-semibold pr-3 text-slate-600 dark:text-slate-300 select-none">
              {isSaved ? "Saved" : "Save"}
            </span>
          </div>
          <Button
            variant="outline"
            className="flex-1 text-xs sm:text-sm rounded-2xl border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                (async () => {
                  // Use the apply link for sharing instead of page link
                  const shareUrl = internship.applyLink || `${typeof window !== "undefined" ? window.location.origin : ""}/internships/${internship.id}`;
                  const shareText = `${internship.title} at ${internship.company}`;

                  try {
                    // Try native Web Share API first (better on mobile)
                    if (typeof navigator !== "undefined" && navigator.share) {
                      try {
                        await navigator.share({
                          title: shareText,
                          text: `Apply now: ${internship.title} at ${internship.company}`,
                          url: shareUrl,
                        });
                        toast.success("Shared successfully!");
                        return;
                      } catch (shareError) {
                        if (shareError.name !== "AbortError") {
                          console.error("Web Share failed:", shareError);
                        }
                        // User cancelled or error, try fallback
                      }
                    }

                    // Fallback: Copy apply link directly to clipboard
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        toast.success("Apply link copied to clipboard!");
                        return;
                      } catch (clipboardError) {
                        console.error("Clipboard API failed:", clipboardError);
                      }
                    }

                    // Legacy fallback: Use textarea method with apply link
                    const textarea = document.createElement("textarea");
                    textarea.value = shareUrl;
                    textarea.style.position = "fixed";
                    textarea.style.opacity = "0";
                    document.body.appendChild(textarea);
                    textarea.select();
                    
                    const successful = document.execCommand("copy");
                    document.body.removeChild(textarea);
                    
                    if (successful) {
                      toast.success("Apply link copied to clipboard!");
                    } else {
                      toast.error("Failed to copy link");
                    }
                  } catch (error) {
                    console.error("Share error:", error);
                    toast.error("Failed to share");
                  }
                })();
              }}
            >
              Share
            </Button>
          </div>
        </div>
      </div>
    );
  };

export default InternshipCard;