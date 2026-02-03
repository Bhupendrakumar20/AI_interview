// components/ChallengeSection.jsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const ChallengeSection = () => {
  const [enrolled, setEnrolled] = useState(false);

  return (
    <section className="blue-gradient-dark rounded-3xl p-8">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-4">100 Days to Code Challenge</h2>
          <p className="text-light-100 mb-6">
            Join thousands of developers in our coding challenge. 
            Build real projects, learn in-demand skills, and land your dream job.
            Complete the challenge and get a verified certificate!
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              className="btn-primary"
              onClick={() => setEnrolled(true)}
            >
              {enrolled ? "Continue Challenge" : "Start Challenge"}
            </Button>
            <Button className="btn-secondary">
              View Leaderboard
            </Button>
          </div>
        </div>
        
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-200">10,000+</div>
            <div className="text-light-100 text-sm">Active Participants</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-success-100">85%</div>
            <div className="text-light-100 text-sm">Completion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-200">500+</div>
            <div className="text-light-100 text-sm">Got Jobs</div>
          </div>
        </div>
      </div>
      
      {enrolled && (
        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress: Day 15/100</span>
            <span>15%</span>
          </div>
          <div className="w-full bg-dark-200 rounded-full h-2">
            <div className="bg-success-100 h-2 rounded-full" style={{ width: '15%' }}></div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ChallengeSection;