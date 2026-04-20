// components/ApplicationCard.jsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const ApplicationCard = ({ application }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case "Offer Received": return "text-success-100";
      case "Interview Scheduled": return "text-primary-200";
      case "Under Review": return "text-yellow-400";
      case "Rejected": return "text-destructive-100";
      default: return "text-light-100";
    }
  };

  return (
    <div className="card-border hover-lift-glow">
      <div className="card p-5 transition-all duration-300 hover:shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold hover:text-primary-200 transition-colors">{application.title}</h3>
            <p className="text-primary-200">{application.company}</p>
            <p className="text-sm text-light-100">Applied on {application.date}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={cn(
              "font-semibold transition-all duration-300",
              getStatusColor(application.status)
            )}>
              {application.status}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-primary-200 hover:scale-110 transition-transform duration-300"
            >
              {expanded ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-dark-200">
            <h4 className="font-semibold mb-3">Application Progress</h4>
            <div className="flex justify-between">
              {application.progress.map((stage, index) => (
                <div key={index} className="text-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2",
                    stage.completed 
                      ? "bg-success-100 text-dark-100" 
                      : "bg-dark-200 text-light-100"
                  )}>
                    {index + 1}
                  </div>
                  <div className="text-xs">{stage.stage}</div>
                  <div className="text-xs text-light-100">{stage.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationCard;