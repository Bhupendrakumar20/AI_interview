// components/InternshipCard.jsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { saveInternship, unsaveInternship, isInternshipSaved } from "@/lib/actions/saved-internships.action";

const InternshipCard = ({ internship }) => {
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
    try {
      // If internship has an apply/registration link, redirect there
      if (internship.applyLink || internship.url) {
        window.open(internship.applyLink || internship.url, '_blank');
        toast.success(`Redirecting to ${internship.company} application page...`);
        return;
      }

      // Otherwise, track the application
      setApplying(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Application tracked for ${internship.title} at ${internship.company}!`);

    } catch (error) {
      toast.error("Failed to process application. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const getApplicationStatus = () => {
    const today = new Date();
    const deadline = new Date(internship.deadline);

    if (today > deadline) {
      return { status: "closed", text: "Application Closed" };
    }

    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 3) {
      return { status: "urgent", text: `Apply Now - ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` };
    }

    return { status: "open", text: "Apply Now" };
  };

  const applicationStatus = getApplicationStatus();

  const handleCardClick = () => {
    // If internship is open and has apply link, redirect to it
    if (applicationStatus.status !== "closed" && internship.applyLink) {
      window.open(internship.applyLink, '_blank');
    }
  };

  return (
    <div 
      className={cn(
        "card-border group hover:border-primary-200/30 hover:shadow-lg hover:shadow-primary-200/20 transition-all duration-300 hover:-translate-y-1",
        applicationStatus.status !== "closed" && internship.applyLink && "cursor-pointer"
      )}
      onClick={handleCardClick}
    >
      <div className="card p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold line-clamp-1 hover:text-primary-100 transition-colors">
              {internship.title}
            </h3>
            <p className="text-primary-200 font-medium">{internship.company}</p>
          </div>
          {internship.badge && (
            <span className="bg-success-100 text-dark-100 text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap">
              {internship.badge}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4 flex-1">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Location:</span>
              <span className={cn("line-clamp-1",
                internship.isRemote && "text-success-100 font-medium"
              )}>
                {internship.location}
                {internship.isRemote && " (Remote)"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Duration:</span>
              <span>{internship.duration}</span>
            </div>
          </div>

          <div className="text-lg font-bold text-primary-200">
            {internship.stipend}
          </div>

          <div className="text-sm text-light-100">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs transition-all duration-300",
                applicationStatus.status === "closed" && "bg-red-500/20 text-red-500",
                applicationStatus.status === "urgent" && "bg-yellow-500/20 text-yellow-500",
                applicationStatus.status === "open" && "bg-green-500/20 text-green-500"
              )}>
                {applicationStatus.text}
              </span>
            </div>
          </div>

          {/* Description (collapsed by default) */}
          {internship.description && (
            <div className="mt-2">
              <p className="text-sm text-light-100 line-clamp-2">
                {internship.description}
              </p>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {internship.skills?.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-dark-200 text-xs rounded-full hover:bg-dark-100 transition-colors"
                title={skill}
              >
                {skill.length > 15 ? `${skill.substring(0, 15)}...` : skill}
              </span>
            ))}
            {internship.skills?.length > 5 && (
              <span className="px-2 py-1 bg-dark-200 text-xs rounded-full">
                +{internship.skills.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            className={cn(
              "btn-primary w-full",
              applicationStatus.status === "closed" && "opacity-50 cursor-not-allowed"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (applicationStatus.status !== "closed") {
                handleApply();
              } else {
                toast.error("Applications for this internship are closed");
              }
            }}
            disabled={applying || applicationStatus.status === "closed"}
          >
            {applying ? "Applying..." : applicationStatus.text}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsSaving(true);
                (async () => {
                  try {
                    if (isSaved) {
                      // Unsave
                      const result = await unsaveInternship({ internshipId: internship.id });
                      if (result.success) {
                        setIsSaved(false);
                        toast.success("Removed from saved internships");
                      } else {
                        toast.error(result.error || "Failed to unsave");
                      }
                    } else {
                      // Save
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
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : isSaved ? "✓ Saved" : "Save"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-sm"
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
    </div>
  );
};

export default InternshipCard;