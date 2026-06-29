"use client";

import React, { useState } from "react";
import { FileText, Briefcase, User, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ResumeRoundSection() {
  const [selectedFocus, setSelectedFocus] = useState("Projects");
  const [selectedPersona, setSelectedPersona] = useState("hiring-manager");
  const [selectedDuration, setSelectedDuration] = useState("30");

  const focusOptions = ["Projects", "Experience", "Skills", "Gaps", "Leadership", "Metrics"];
  
  const personas = [
    {
      id: "hiring-manager",
      name: "Hiring Manager",
      desc: "Deep dives on experience",
      icon: "👔",
    },
    {
      id: "hr-partner",
      name: "HR Partner",
      desc: "Culture fit & soft skills",
      icon: "🤝",
    },
    {
      id: "founder",
      name: "Startup Founder",
      desc: "Vision & ownership",
      icon: "🚀",
    },
    {
      id: "drill-sergeant",
      name: "Drill Sergeant",
      desc: "High pressure, fast pace",
      icon: "8",
    },
  ];

  const durationOptions = ["15", "30", "45", "60"];

  const features = [
    {
      title: "AI-Powered Q&A",
      desc: "Smart questions on your resume claims",
      icon: "✓",
    },
    {
      title: "Real-Time Analysis",
      desc: "Get feedback as you answer",
      icon: "→",
    },
    {
      title: "Inconsistency Detection",
      desc: "Spot gaps between claims and answers",
      icon: "◆",
    },
  ];

  return (
    <section className="resume-section animate-fadeIn">
      {/* Section Header */}
      <div className="section-header mb-6">
        <div className="section-title-block flex items-center gap-3">
          <FileText className="w-6 h-6 text-cyan-400" />
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Resume Round</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Upload your resume & get grilled on every claim
            </p>
          </div>
          <span className="ml-auto px-3 py-1 bg-linear-to-r from-cyan-500 to-cyan-600 text-white text-xs font-bold rounded-full animate-pulse">
            NEW
          </span>
        </div>
      </div>

      {/* Resume Card */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-linear-to-br dark:from-slate-900/80 dark:to-slate-900/40 dark:border-cyan-500/30 dark:shadow-none rounded-2xl p-8 mb-8 animate-slideUp">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Zone */}
          <div className="flex flex-col justify-center">
            <div className="upload-zone border-2 border-dashed border-cyan-500/40 rounded-xl p-8 text-center hover:border-cyan-500/60 transition-all duration-300 bg-cyan-500/5 hover:bg-cyan-500/10">
              <div className="flex flex-col items-center">
                <FileText className="w-12 h-12 text-cyan-500 dark:text-cyan-400 mb-4" />
                <p className="text-slate-900 dark:text-white font-bold mb-2">Drop your resume here</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                  or click to browse from your device
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {["PDF", "DOCX", "DOC", "TXT"].map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 hover:border-cyan-500 transition-colors cursor-pointer"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Extract Details */}
            <div className="mt-6 p-4 bg-cyan-500/5 border border-cyan-500/20 dark:bg-cyan-500/10 dark:border-cyan-500/30 rounded-lg">
              <p className="text-cyan-600 dark:text-cyan-400 font-bold text-sm mb-3">
                ✓ What the AI extracts from your resume:
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">✓</span> Work experience & roles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">✓</span> Skills & certifications
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">✓</span> Education & internships
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">✓</span> Projects & tech stack
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">✓</span> Achievements & metrics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">✓</span> Gap analysis points
                </li>
              </ul>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="flex flex-col gap-6">
            {/* Interview Focus */}
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                Interview Focus
              </p>
              <div className="flex flex-wrap gap-2">
                {focusOptions.map((focus) => (
                  <button
                    key={focus}
                    onClick={() => setSelectedFocus(focus)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedFocus === focus
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/40"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    }`}
                  >
                    {focus}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Interviewer Persona */}
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                AI Interviewer Persona
              </p>
              <div className="space-y-2">
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`w-full p-3 rounded-lg transition-all duration-200 text-left ${
                      selectedPersona === persona.id
                        ? "bg-cyan-500/10 border-2 border-cyan-500"
                        : "bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/40 dark:border-slate-700 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{persona.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {persona.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{persona.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Session Duration */}
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                Session Duration
              </p>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors"
              >
                {durationOptions.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} minutes
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2">
                Upload a resume to unlock
              </p>
            </div>

            {/* Start Button */}
            <button className="w-full px-6 py-4 bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/40 hover:shadow-cyan-500/60 flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              Start Resume Round
            </button>
            <p className="text-xs text-slate-400 text-center">
              Upload a resume to unlock
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="p-4 bg-white border border-slate-200 hover:border-cyan-500/30 dark:bg-slate-900/60 dark:border-slate-800 rounded-lg transition-all duration-300 animate-fadeIn"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg text-cyan-500 dark:text-cyan-400 shrink-0">{feature.icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{feature.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{feature.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-linear-to-r from-transparent via-slate-700 to-transparent my-12"></div>
    </section>
  );
}
