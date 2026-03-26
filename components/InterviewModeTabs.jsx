"use client";

import React from "react";

const InterviewModeTabs = ({ activeMode, setActiveMode }) => {
  const modes = [
    { id: "mock-interview", label: "Mock Interview", icon: "▲" },
    { id: "resume-round", label: "Resume Round", icon: "R" },
    { id: "dsa-room", label: "DSA Room", icon: "◆" },
  ];

  return (
    <div className="animate-fadeInDown">
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 transform whitespace-nowrap flex items-center gap-2 ${
              activeMode === mode.id
                ? mode.id === "mock-interview"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : mode.id === "resume-round"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 shadow-lg shadow-teal-500/30"
                  : "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:border-slate-600/50"
            }`}
          >
            <span className="text-lg">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InterviewModeTabs;
