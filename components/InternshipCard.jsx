// components/InternshipCard.jsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const InternshipCard = ({ internship }) => {
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    try {
      setApplying(true);

      // Here you can implement different application logic:
      // 1. Open application modal/form
      // 2. Redirect to external application URL
      // 3. Track application in your database
      // 4. Show application instructions

      // For now, let's simulate an application process
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Application submitted for ${internship.title} at ${internship.company}!`);

      // If internship has an external apply link, you could do:
      // if (internship.applyLink) {
      //   window.open(internship.applyLink, '_blank');
      // }

    } catch (error) {
      toast.error("Failed to submit application. Please try again.");
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

  return (
    <div className="card-border group hover:border-primary-200/30 transition-all">
      <div className="card p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold line-clamp-1">{internship.title}</h3>
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
              <span>📍</span>
              <span className={cn("line-clamp-1",
                internship.isRemote && "text-success-100 font-medium"
              )}>
                {internship.location}
                {internship.isRemote && " (Remote)"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{internship.duration}</span>
            </div>
          </div>

          <div className="text-lg font-bold text-primary-200">
            {internship.stipend}
          </div>

          <div className="text-sm text-light-100">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs",
                applicationStatus.status === "closed" && "bg-red-500/20 text-red-500",
                applicationStatus.status === "urgent" && "bg-yellow-500/20 text-yellow-500",
                applicationStatus.status === "open" && "bg-green-500/20 text-green-500"
              )}>
                {applicationStatus.text}
              </span>
              <span>• {internship.applicants || 0} applicants</span>
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
            onClick={() => {
              if (applicationStatus.status !== "closed" && onApply) {
                onApply(internship);
              } else if (applicationStatus.status === "closed") {
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
              onClick={() => {
                // Add to saved/bookmarks
                toast.info("Added to saved internships");
              }}
            >
              Save
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-sm"
              onClick={() => {
                // Share functionality
                navigator.clipboard.writeText(
                  `${internship.title} at ${internship.company} - ${window.location.origin}/internships/${internship.id}`
                );
                toast.success("Link copied to clipboard!");
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