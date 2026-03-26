"use client";

import React, { useState } from "react";
import { toast } from "sonner";

const ResumeRound = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(["DSA", "System Design"]);
  const [selectedPersona, setSelectedPersona] = useState("hiring-manager");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const topicOptions = [
    "DSA",
    "System Design",
    "Operating Systems",
    "Database Design",
    "Networking",
    "Web Architecture",
    "Cloud Computing",
    "Security",
  ];

  const personaOptions = [
    { id: "hiring-manager", label: "Hiring Manager", desc: "Technical focus with experience" },
    { id: "team-lead", label: "Team Lead", desc: "Project experience emphasis" },
    { id: "interviewer", label: "Experienced Interviewer", desc: "Comprehensive evaluation" },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedFile(file);
        toast.success("Resume uploaded successfully!");
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedFile(file);
        toast.success("Resume uploaded successfully!");
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  };

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleStartResume = async () => {
    if (!selectedFile) {
      toast.error("Please upload a resume first");
      return;
    }

    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }

    setIsLoading(true);
    try {
      // Here you would call your API to start the resume round
      // For now, just show success message
      toast.success("Resume Round starting! Preparing questions based on your resume...");
      // router.push to resume interview page
    } catch (error) {
      toast.error("Failed to start resume round");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 font-bold text-white text-sm">
            R
          </div>
          <h2 className="text-2xl font-bold text-white">Resume Round</h2>
          <span className="px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-600">NEW</span>
        </div>
        <p className="text-slate-400 text-sm ml-11">Get AI-powered feedback tailored to your resume and target role</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-6">
        {/* Left: Upload and Configuration */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
          {/* Upload Section */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-slate-700/50 p-8">
            <div
              onDrop={handleDrop}
              onDragOver={handleDrag}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onClick={() => document.getElementById("resume-file-input").click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? "border-teal-400 bg-teal-500/10"
                  : selectedFile
                  ? "border-teal-400/50 bg-teal-500/5"
                  : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/20"
              }`}
            >
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-2xl">✓</div>
                  <div className="font-semibold text-white text-sm">{selectedFile.name}</div>
                  <div className="text-xs text-slate-400">Click to replace</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📄</div>
                  <div className="font-semibold text-white">Drop your resume here</div>
                  <div className="text-xs text-slate-400">or click to browse from your device</div>
                  <div className="flex justify-center gap-2 mt-3 flex-wrap">
                    <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300">PDF</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="p-8 space-y-6">
            {/* Topics */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Topics to Focus On</div>
              <div className="flex flex-wrap gap-2">
                {topicOptions.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-all duration-200 ${
                      selectedTopics.includes(topic)
                        ? "bg-teal-500/20 border border-teal-500/50 text-teal-300"
                        : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Interviewer Persona */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Interview Persona</div>
              <div className="space-y-2">
                {personaOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedPersona(option.id)}
                    className={`w-full p-3 rounded-lg border transition-all duration-200 text-left text-sm ${
                      selectedPersona === option.id
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50"
                    }`}
                  >
                    <div className={`font-semibold ${selectedPersona === option.id ? "text-blue-300" : "text-slate-200"}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartResume}
              disabled={isLoading || !selectedFile}
              className="w-full py-3 px-6 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 hover:shadow-lg shadow-teal-500/20 mt-4"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                  Starting Resume Round...
                </span>
              ) : (
                "Start Resume Round"
              )}
            </button>
          </div>
        </div>

        {/* Right: Features and Benefits */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-white mb-4">Interview Round Features</h3>
          </div>

          {[
            { title: "Resume Parsing", desc: "AI analyzes your resume for targeted questions" },
            { title: "Custom Questions", desc: "Questions aligned with your experience" },
            { title: "Real-time Feedback", desc: "Instant evaluation and suggestions" },
            { title: "Experience Match", desc: "Questions based on your tech skills" },
          ].map((feature) => (
            <div key={feature.title} className="flex gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0 font-bold text-teal-300 text-sm">
                ✓
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{feature.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumeRound;
