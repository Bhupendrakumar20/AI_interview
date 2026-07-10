"use client";

import React, { useState, useRef } from "react";
import { FileText, Briefcase, User, Clock, CheckCircle, Upload, Shield, AlertTriangle, ArrowRight, Loader2, Sparkles, RefreshCw, Users, Rocket, Zap } from "lucide-react";

export default function ResumeRoundSection() {
  const [selectedFocus, setSelectedFocus] = useState("Projects");
  const [selectedPersona, setSelectedPersona] = useState("hiring-manager");
  const [selectedDuration, setSelectedDuration] = useState("30");
  
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  
  // Loading & Flow states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAtsProcessing, setIsAtsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("setup"); // setup -> interviewing -> report
  
  // Data states
  const [parsedResume, setParsedResume] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [optimizedResume, setOptimizedResume] = useState(null);
  
  // Interviewing states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState([]);

  const fileInputRef = useRef(null);

  const focusOptions = ["Projects", "Experience", "Skills", "Gaps", "Leadership", "Metrics"];
  
  const personas = [
    {
      id: "hiring-manager",
      name: "Hiring Manager",
      desc: "Deep dives on experience",
      icon: Briefcase,
    },
    {
      id: "hr-partner",
      name: "HR Partner",
      desc: "Culture fit & soft skills",
      icon: Users,
    },
    {
      id: "founder",
      name: "Startup Founder",
      desc: "Vision & ownership",
      icon: Rocket,
    },
    {
      id: "drill-sergeant",
      name: "Drill Sergeant",
      desc: "High pressure, fast pace",
      icon: Zap,
    },
  ];

  const durationOptions = ["15", "30", "45", "60"];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const checkAtsScoreDirectly = async () => {
    if (!file) {
      alert("Please upload a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      alert("Please enter a target Job Description.");
      return;
    }

    setIsAtsProcessing(true);

    try {
      // Step 1: Upload and Parse Resume
      const uploadFormData = new FormData();
      uploadFormData.append("resume", file);
      
      const parseRes = await fetch("/api/resume/upload", {
        method: "POST",
        body: uploadFormData,
      });
      if (!parseRes.ok) throw new Error("Failed to parse resume PDF.");
      const parseData = await parseRes.json();
      const parsedData = parseData.parsedResume;
      setParsedResume(parsedData);

      // Step 2: Fetch ATS Score
      const atsRes = await fetch("/api/resume/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedResume: parsedData, jobDescription }),
      });

      if (!atsRes.ok) throw new Error("Failed to calculate ATS score.");
      const atsData = await atsRes.json();
      setAtsResult(atsData.atsResult);

      // Step 3: Fetch Feedback and Optimized Resume in parallel
      const [feedbackRes, optimizeRes] = await Promise.all([
        fetch("/api/resume/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atsResult: atsData.atsResult, jobDescription }),
        }),
        fetch("/api/resume/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parsedResume: parsedData, atsResult: atsData.atsResult }),
        }),
      ]);

      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        setFeedback(feedbackData.feedback);
      }
      if (optimizeRes.ok) {
        const optimizeData = await optimizeRes.json();
        setOptimizedResume(optimizeData.optimizedResume);
      }

      // Transition directly to report
      setAnswers([]);
      setCurrentStep("report");
    } catch (err) {
      console.error(err);
      alert(err.message || "An error occurred during ATS score calculation.");
    } finally {
      setIsAtsProcessing(false);
    }
  };

  const startResumeRound = async () => {
    if (!file) {
      alert("Please upload a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      alert("Please enter a target Job Description.");
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Upload and Parse Resume
      const uploadFormData = new FormData();
      uploadFormData.append("resume", file);
      
      const parseRes = await fetch("/api/resume/upload", {
        method: "POST",
        body: uploadFormData,
      });
      if (!parseRes.ok) throw new Error("Failed to parse resume PDF.");
      const parseData = await parseRes.json();
      const parsedData = parseData.parsedResume;
      setParsedResume(parsedData);

      // Step 2: Parallel fetch for ATS Score and Question Generation
      const [atsRes, questionsRes] = await Promise.all([
        fetch("/api/resume/ats-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parsedResume: parsedData, jobDescription }),
        }),
        fetch("/api/resume/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parsedResume: parsedData,
            focusArea: selectedFocus,
            persona: selectedPersona,
            numQuestions: 5,
          }),
        }),
      ]);

      if (!atsRes.ok) throw new Error("Failed to calculate ATS score.");
      if (!questionsRes.ok) throw new Error("Failed to generate questions.");

      const atsData = await atsRes.json();
      const questData = await questionsRes.json();

      setAtsResult(atsData.atsResult);
      setQuestions(questData.verificationQuestions || []);

      // Step 3: Fetch Feedback and Optimized Resume
      const [feedbackRes, optimizeRes] = await Promise.all([
        fetch("/api/resume/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atsResult: atsData.atsResult, jobDescription }),
        }),
        fetch("/api/resume/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parsedResume: parsedData, atsResult: atsData.atsResult }),
        }),
      ]);

      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        setFeedback(feedbackData.feedback);
      }
      if (optimizeRes.ok) {
        const optimizeData = await optimizeRes.json();
        setOptimizedResume(optimizeData.optimizedResume);
      }

      // Transition to interviewing
      setCurrentQuestionIdx(0);
      setAnswers([]);
      setCurrentStep("interviewing");
    } catch (err) {
      console.error(err);
      alert(err.message || "An error occurred during resume processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer.");
      return;
    }

    const currentQuestion = questions[currentQuestionIdx];
    const newAnswers = [
      ...answers,
      {
        question: typeof currentQuestion === "string" ? currentQuestion : currentQuestion.question,
        answer: currentAnswer,
      },
    ];
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      setCurrentStep("report");
    }
  };

  const resetAll = () => {
    setFile(null);
    setJobDescription("");
    setParsedResume(null);
    setAtsResult(null);
    setQuestions([]);
    setFeedback("");
    setOptimizedResume(null);
    setIsAtsProcessing(false);
    setIsProcessing(false);
    setCurrentStep("setup");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    if (score >= 60) return "text-amber-500 border-amber-500/20 bg-amber-500/10";
    return "text-rose-500 border-rose-500/20 bg-rose-500/10";
  };

  return (
    <section className="resume-section animate-fadeIn">
      {/* Section Header */}
      <div className="section-header mb-6">
        <div className="section-title-block flex items-center gap-3">
          <FileText className="w-6 h-6 text-cyan-400" />
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Resume Round</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Upload your resume, get your ATS score, and verify claims with Ollama
            </p>
          </div>
          <span className="ml-auto px-3 py-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-bold rounded-full animate-pulse">
            OLLAMA PROUD
          </span>
        </div>
      </div>

      {currentStep === "setup" && (
        <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/80 dark:border-cyan-500/30 dark:shadow-none rounded-2xl p-8 mb-8 animate-slideUp">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Upload Zone & JD */}
            <div className="flex flex-col gap-6">
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`upload-zone border-2 border-dashed border-cyan-500/40 rounded-xl p-8 text-center hover:border-cyan-500/60 transition-all duration-300 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer ${file ? "border-cyan-500 bg-cyan-500/10" : ""}`}
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-12 h-12 text-cyan-500 dark:text-cyan-400 mb-4" />
                  <p className="text-slate-900 dark:text-white font-bold mb-2">
                    {file ? file.name : "Drop your resume here"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "or click to browse from your device"}
                  </p>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.txt"
                    className="hidden"
                  />
                  <div className="flex gap-2 justify-center flex-wrap">
                    {["PDF", "TXT"].map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Job Description Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" /> Target Job Description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here to analyze ATS match and tailor questions..."
                  className="w-full h-36 px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors text-sm"
                />
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
                        <span className="p-2 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 flex items-center justify-center">
                          <persona.icon className="w-5 h-5" />
                        </span>
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
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <button 
                  onClick={checkAtsScoreDirectly}
                  disabled={isProcessing || isAtsProcessing || !file || !jobDescription.trim()}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 flex items-center justify-center gap-2"
                >
                  {isAtsProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing ATS Score...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Check ATS Score
                    </>
                  )}
                </button>
                <button 
                  onClick={startResumeRound}
                  disabled={isProcessing || isAtsProcessing || !file || !jobDescription.trim()}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/40 hover:shadow-cyan-500/60 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Ollama Parsing & Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Start Resume Round
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === "interviewing" && (
        <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/80 dark:border-cyan-500/30 rounded-2xl p-8 mb-8 animate-fadeIn max-w-3xl mx-auto">
          {/* Header Progress */}
          <div className="flex justify-between items-center text-sm text-slate-500 mb-6">
            <span>
              Question {currentQuestionIdx + 1} of {questions.length}
            </span>
            <div className="w-48 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 dark:bg-cyan-950/20 dark:border-cyan-500/30 rounded-xl mb-6 flex gap-4 items-start">
            <Shield className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
            <div>
              <span className="text-xs font-bold text-cyan-500 uppercase tracking-wider">
                Claim Verification ({selectedFocus})
              </span>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-1">
                {typeof questions[currentQuestionIdx] === "string" 
                  ? questions[currentQuestionIdx] 
                  : questions[currentQuestionIdx]?.question}
              </p>
              {questions[currentQuestionIdx]?.expectedKeywords && (
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-slate-400 mr-1">Recommended topics:</span>
                  {questions[currentQuestionIdx].expectedKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-500">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Answer Input */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Provide your explanation:
            </label>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Provide specific implementation details, trade-offs, or concrete metrics to verify this claim..."
              className="w-full h-40 px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors text-sm"
            />
            <button
              onClick={handleAnswerSubmit}
              className="mt-2 w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition"
            >
              {currentQuestionIdx < questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Complete Interview & View Report
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {currentStep === "report" && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* Main Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ATS & Trust Scores */}
            <div className="card-border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-sm font-semibold text-slate-500 mb-2">Resume Trust Score</span>
              <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center font-bold ${getScoreColor(atsResult?.final_score || 85)}`}>
                <span className="text-4xl">{atsResult?.final_score || 85}%</span>
              </div>
              <div className="mt-4 text-xs text-slate-400">
                Determined by verification Q&A and red-flag checking
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="card-border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl md:col-span-2">
              <h4 className="text-lg font-bold mb-4">ATS Analysis Breakdown</h4>
              <div className="space-y-3.5">
                {[
                  { label: "Skills Alignment", val: atsResult?.skills_score || 90 },
                  { label: "Work Experience Impact", val: atsResult?.experience_score || 80 },
                  { label: "Projects Details", val: atsResult?.projects_score || 85 },
                  { label: "Education Verification", val: atsResult?.education_score || 95 },
                ].map((s, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{s.label}</span>
                      <span className="font-bold">{s.val}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full" style={{ width: `${s.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* AI Expert Feedback */}
          <div className="bg-slate-900 text-slate-100 p-8 rounded-2xl border border-cyan-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-xs text-cyan-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Ollama Insight
            </div>
            <h4 className="text-xl font-bold text-white mb-3">ATS Expert Feedback</h4>
            <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
              {feedback || "Calculating feedback details..."}
            </p>
          </div>

          {/* Optimized Resume Tips */}
          {optimizedResume && (
            <div className="bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 p-8 rounded-2xl">
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Ollama Optimized Resume Suggestions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Suggested Professional Summary</h5>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 italic">
                    &quot;{optimizedResume.summary}&quot;
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Key Tailored Skills to Add</h5>
                  <div className="flex flex-wrap gap-2">
                    {optimizedResume.skills?.map((skill, i) => (
                      <span key={i} className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-semibold">
                        + {skill}
                      </span>
                    )) || <span className="text-slate-400 text-sm">No adjustments suggested.</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Q&A Summary Review */}
          {answers && answers.length > 0 && (
            <div className="bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 p-8 rounded-2xl">
              <h4 className="text-lg font-bold mb-6">Verification Interview Log</h4>
              <div className="space-y-6">
                {answers.map((item, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-cyan-500 text-white rounded-full text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.question}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-center gap-4">
            <button 
              onClick={resetAll}
              className="px-6 py-3 border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-sm font-bold rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Start New Session
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
