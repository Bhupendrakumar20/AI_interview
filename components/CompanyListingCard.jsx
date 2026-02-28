"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

const CompanyListingCard = ({ company }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card-border overflow-hidden hover:shadow-lg transition-shadow">
      <div className="card p-6">
        {/* Company Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Company Logo */}
          <div className="w-16 h-16 bg-light-400 rounded-lg flex items-center justify-center shrink-0">
            <div className="w-12 h-12 bg-linear-to-br from-primary-200 to-primary-100 rounded flex items-center justify-center text-white font-bold text-lg">
              {company.name.charAt(0)}
            </div>
          </div>

          {/* Company Info */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-light-900">{company.name}</h3>
            <p className="text-sm text-light-100">
              {company.positions.length} interview{company.positions.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* Positions */}
        <div className="space-y-2 mb-4">
          {company.positions.slice(0, isExpanded ? company.positions.length : 2).map((position, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-light-300 rounded">
              <div>
                <p className="text-sm font-medium text-light-900">{position.title}</p>
                <p className="text-xs text-light-100">{position.level} Level</p>
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse */}
        {company.positions.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1 text-primary-200 hover:text-primary-100 text-sm py-2 transition-colors"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp size={16} />
              </>
            ) : (
              <>
                Show More <ChevronDown size={16} />
              </>
            )}
          </button>
        )}

        {/* Start Interview Button */}
        <Link href={`/mock-test/practice?company=${company.name}`}>
          <Button className="w-full mt-4 bg-primary-200 hover:bg-primary-100 text-white transition-colors">
            Start Interview
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default CompanyListingCard;
