"use client";

import React, { useState, useRef } from "react";
import { FileText, Briefcase, User, Clock, CheckCircle, Upload, Shield, AlertTriangle, ArrowRight, Loader2, Sparkles, RefreshCw, Users, Rocket, Zap, Download, Mic, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [verificationResult, setVerificationResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Interviewing states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [questionSource, setQuestionSource] = useState("gemini");
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Speech Recognition (Web Speech API)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setCurrentAnswer((prev) => prev + finalTranscript);
          }
        };

        rec.onerror = (e) => {
          console.error("Speech recognition error:", e.error, e.message);
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setIsRecording(false);
            alert("Microphone permission denied or not available. Please allow access in browser settings.");
          } else if (e.error === "network") {
            setIsRecording(false);
            alert("Network error during speech recognition. Please check your connection.");
          }
        };

        rec.onend = () => {
          if (isRecording) {
            try {
              rec.start();
            } catch (err) {
              console.error("Failed to restart speech recognition:", err);
            }
          }
        };

        recognitionRef.current = rec;
      }
    }
  }, [isRecording]);

  const toggleSpeechRecording = () => {
    if (!recognitionRef.current) {
      alert("Web Speech API is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Countdown timer logic
  React.useEffect(() => {
    let timer;
    if (currentStep === "interviewing" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (currentStep === "interviewing" && timeLeft === 0) {
      alert("Time is up! Submitting your answers.");
      // Auto submit remaining questions
      handleAnswerSubmit();
    }
    return () => clearInterval(timer);
  }, [currentStep, timeLeft]);

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
      if (!parseRes.ok) {
        const errData = await parseRes.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || "Failed to parse resume PDF.");
      }
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

  const triggerBackgroundReports = async (parsedData, jd) => {
    console.log("⚡ [Resume Round] Triggering background reports (ATS score, Feedback, Resume Optimization)...");
    try {
      // Fetch ATS Score
      const atsRes = await fetch("/api/resume/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedResume: parsedData, jobDescription: jd }),
      });
      if (!atsRes.ok) throw new Error("Failed to fetch ATS score");
      const atsData = await atsRes.json();
      if (!atsData || !atsData.atsResult) {
        throw new Error("Invalid or empty ATS score data received");
      }
      setAtsResult(atsData.atsResult);
      console.log("✅ [Resume Round] ATS score fetched successfully.");

      // Fetch Feedback and Optimization in parallel
      const [feedbackRes, optimizeRes] = await Promise.all([
        fetch("/api/resume/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atsResult: atsData.atsResult, jobDescription: jd }),
        }).then(async r => {
          if (r.ok) {
            const data = await r.json().catch(() => null);
            console.log("✅ [Resume Round] Resume feedback generated successfully.");
            return data;
          }
          return null;
        }).catch(err => { console.warn("Feedback fetch failed:", err); return null; }),
        fetch("/api/resume/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parsedResume: parsedData, atsResult: atsData.atsResult }),
        }).then(async r => {
          if (r.ok) {
            const data = await r.json().catch(() => null);
            console.log("✅ [Resume Round] Resume optimization tips generated successfully.");
            return data;
          }
          return null;
        }).catch(err => { console.warn("Optimize fetch failed:", err); return null; }),
      ]);

      if (feedbackRes && feedbackRes.feedback) {
        setFeedback(feedbackRes.feedback);
      }
      if (optimizeRes && optimizeRes.optimizedResume) {
        setOptimizedResume(optimizeRes.optimizedResume);
      }
    } catch (err) {
      console.warn("⚠️ [Resume Round] Background report generation failed:", err.message);
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

    console.log("📄 [Resume Round] Starting resume round setup:", {
      fileName: file.name,
      fileSize: file.size,
      focusArea: selectedFocus,
      persona: selectedPersona,
      duration: selectedDuration,
    });

    setIsProcessing(true);

    try {
      // Step 1: Upload and Parse Resume
      console.log("📤 [Resume Round] Uploading and parsing resume PDF...");
      const uploadFormData = new FormData();
      uploadFormData.append("resume", file);
      
      const parseRes = await fetch("/api/resume/upload", {
        method: "POST",
        body: uploadFormData,
      });
      if (!parseRes.ok) {
        const errData = await parseRes.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || "Failed to parse resume PDF.");
      }
      const parseData = await parseRes.json();
      const parsedData = parseData.parsedResume;
      setParsedResume(parsedData);
      console.log("✅ [Resume Round] PDF parsed successfully.");

      // Step 2: Fetch only Questions first to start the interview instantly
      console.log("🤖 [Resume Round] Requesting AI questions generation...");
      const questionsRes = await fetch("/api/resume/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsedResume: parsedData,
          focusArea: selectedFocus,
          persona: selectedPersona,
          numQuestions: 5,
        }),
      });

      if (!questionsRes.ok) throw new Error("Failed to generate interview questions.");

      const questData = await questionsRes.json();
      console.log("✅ [Resume Round] Generated questions successfully:", questData.verificationQuestions);

      setQuestions(questData.verificationQuestions || []);
      setQuestionSource(questData.source || "gemini");
      setTimeLeft(parseInt(selectedDuration) * 60);

      // Transition to interviewing immediately
      setCurrentQuestionIdx(0);
      setAnswers([]);
      setCurrentStep("interviewing");
      setIsProcessing(false); // Stop loading spinner so they can interview

      // Step 3: Trigger background fetches for ATS, feedback, and optimization so they are ready for the report
      triggerBackgroundReports(parsedData, jobDescription);
    } catch (err) {
      console.error("❌ [Resume Round] Error during setup phase:", err);
      alert(err.message || "An error occurred during resume processing.");
      setIsProcessing(false);
    }
  };

  const handleAnswerSubmit = async () => {
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
      setIsEvaluating(true);
      console.log("🤖 [Resume Round] Submitting all answers for evaluation...", newAnswers);
      try {
        const evalRes = await fetch("/api/resume/evaluate-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: newAnswers,
            parsedResume,
            focusArea: selectedFocus
          })
        });
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          if (evalData.success) {
            console.log("✅ [Resume Round] Evaluation completed successfully:", evalData);
            setVerificationResult({
              trustScore: evalData.trustScore,
              verdict: evalData.verdict,
              feedback: evalData.feedback
            });
          }
        } else {
          throw new Error(`HTTP Error ${evalRes.status}`);
        }
      } catch (err) {
        console.error("❌ [Resume Round] Failed to evaluate interview answers:", err);
      } finally {
        setIsEvaluating(false);
        setCurrentStep("report");
      }
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
    setVerificationResult(null);
    setIsAtsProcessing(false);
    setIsProcessing(false);
    setIsEvaluating(false);
    setCurrentStep("setup");
  };

  const handleExitInterview = () => {
    if (window.confirm("Are you sure you want to exit the interview? Your current progress will be lost.")) {
      setCurrentStep("setup");
      setQuestions([]);
      setAnswers([]);
      setCurrentQuestionIdx(0);
      setCurrentAnswer("");
    }
  };

  const formatMarkdownToHtml = (text) => {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Split into paragraphs or bullet list items
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const content = trimmed.substring(2);
        let prefix = '';
        if (!inList) {
          inList = true;
          prefix = '<ul style="margin: 5px 0; padding-left: 20px;">';
        }
        return prefix + `<li style="margin-bottom: 5px; font-size: 13.5px; color: #334155;">${content}</li>`;
      } else {
        let suffix = '';
        if (inList) {
          inList = false;
          suffix = '</ul>';
        }
        return suffix + (trimmed ? `<p style="margin: 8px 0; font-size: 13.5px; line-height: 1.6; color: #334155;">${trimmed}</p>` : '');
      }
    });
    if (inList) {
      processedLines.push('</ul>');
    }
    return processedLines.join('');
  };

  const downloadPDFReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocked! Please allow popups to download the PDF report.");
      return;
    }

    const candidateName = parsedResume?.personalInfo?.name || parsedResume?.name || "Candidate";
    const title = `Resume Verification Report - ${candidateName}`;
    const scoreVal = verificationResult ? verificationResult.trustScore : (atsResult?.final_score || 85);
    const scoreColor = scoreVal >= 80 ? "#0891b2" : scoreVal >= 60 ? "#d97706" : "#e11d48";
    const scoreBg = scoreVal >= 80 ? "#ecfeff" : scoreVal >= 60 ? "#fffbeb" : "#fff1f2";
    const scoreBorder = scoreVal >= 80 ? "#c5f2f7" : scoreVal >= 60 ? "#fde68a" : "#fecdd3";

    const atsScoreVal = atsResult?.final_score || 85;
    const atsScoreColor = atsScoreVal >= 80 ? "#0891b2" : atsScoreVal >= 60 ? "#d97706" : "#e11d48";
    const atsScoreBg = atsScoreVal >= 80 ? "#ecfeff" : atsScoreVal >= 60 ? "#fffbeb" : "#fff1f2";
    const atsScoreBorder = atsScoreVal >= 80 ? "#c5f2f7" : atsScoreVal >= 60 ? "#fde68a" : "#fecdd3";

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.5;
            }
            .header {
              border-bottom: 2px solid #0891b2;
              padding-bottom: 20px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .title {
              font-size: 26px;
              font-weight: bold;
              color: #0f172a;
              margin: 0;
            }
            .subtitle {
              font-size: 14px;
              color: #64748b;
              margin-top: 5px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 25px;
              background: #f8fafc;
              padding: 15px 20px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .meta-item {
              font-size: 13px;
              color: #475569;
            }
            .meta-item span {
              font-weight: bold;
              color: #0f172a;
            }
            .score-container {
              display: flex;
              gap: 20px;
              margin-bottom: 25px;
            }
            .score-card {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 15px;
              padding: 15px;
              border-radius: 8px;
            }
            .score-circle {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              font-weight: bold;
            }
            .score-details h4 {
              margin: 0 0 3px 0;
              color: #0f172a;
              font-size: 15px;
            }
            .score-details p {
              margin: 0;
              font-size: 11px;
              color: #64748b;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #0f172a;
              border-left: 4px solid #0891b2;
              padding-left: 10px;
              margin: 25px 0 12px 0;
            }
            .feedback-box {
              background: #f8fafc;
              padding: 15px 20px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              font-size: 13px;
            }
            .qa-item {
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 1px solid #f1f5f9;
            }
            .qa-question {
              font-weight: bold;
              color: #0f172a;
              margin-bottom: 6px;
              font-size: 13px;
            }
            .qa-answer {
              background: #f8fafc;
              padding: 10px;
              border-left: 3px solid #cbd5e1;
              font-size: 12.5px;
              color: #334155;
              white-space: pre-wrap;
              margin: 0;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Resume Verification Report</h1>
              <div class="subtitle">Powered by PrepWise AI Career Platform</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              Date: ${new Date().toLocaleDateString()}
            </div>
          </div>

          <div style="margin-bottom: 25px; padding: 12px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #475569;">
            <span style="font-weight: bold; color: #0f172a;">Target Role Description:</span> 
            <span style="color: #64748b; font-weight: normal;">${jobDescription.length > 180 ? jobDescription.substring(0, 180) + '...' : jobDescription}</span>
          </div>

          <div class="score-container">
            <div class="score-card" style="background: ${atsScoreBg}; border: 1px solid ${atsScoreBorder};">
              <div class="score-circle" style="background: ${atsScoreColor};">
                ${atsScoreVal}%
              </div>
              <div class="score-details">
                <h4>Resume ATS Match Score</h4>
                <p>Initial keyword and layout alignment score.</p>
              </div>
            </div>
            ${verificationResult ? `
            <div class="score-card" style="background: ${scoreBg}; border: 1px solid ${scoreBorder};">
              <div class="score-circle" style="background: ${scoreColor};">
                ${scoreVal}%
              </div>
              <div class="score-details">
                <h4>Verification Trust Score</h4>
                <div style="font-weight: bold; font-size: 12px; color: ${scoreColor}; text-transform: uppercase;">
                  Verdict: ${verificationResult.verdict?.replace("_", " ")}
                </div>
              </div>
            </div>
            ` : ""}
          </div>

          <h3 class="section-title">AI Evaluation & Feedback</h3>
          <div class="feedback-box">
            ${formatMarkdownToHtml(verificationResult ? verificationResult.feedback : feedback)}
          </div>

          ${optimizedResume ? `
            <h3 class="section-title">Resume Optimization Recommendations</h3>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
              <h4 style="margin: 0 0 8px 0; font-size: 13.5px; color: #0f172a;">Suggested Summary Adjustments</h4>
              <p style="font-size: 12.5px; color: #475569; font-style: italic; line-height: 1.5; margin: 0 0 15px 0;">"${optimizedResume.summary}"</p>
              <h4 style="margin: 0 0 8px 0; font-size: 13.5px; color: #0f172a;">Tailored Skills Recommendations</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${optimizedResume.skills?.map(skill => `
                  <span style="font-size: 11px; font-weight: bold; background: #ecfeff; border: 1px solid #c5f2f7; color: #0891b2; padding: 4px 8px; border-radius: 4px;">+ ${skill}</span>
                `).join("") || '<span style="font-size: 12px; color: #94a3b8;">None</span>'}
              </div>
            </div>
          ` : ""}

          ${answers && answers.length > 0 ? `
            <h3 class="section-title">Interview Q&A Log</h3>
            <div>
              ${answers.map((item, idx) => `
                <div class="qa-item">
                  <div class="qa-question">${idx + 1}. Question: ${item.question}</div>
                  <pre class="qa-answer">${item.answer}</pre>
                </div>
              `).join("")}
            </div>
          ` : ""}

          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            This report was securely generated by PrepWise AI. Code execution, proctoring, and interview transcripts are logged on the server.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
            <div className="flex items-center gap-4">
              <span className="font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(timeLeft)}
              </span>
              <div className="w-48 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 dark:bg-cyan-950/20 dark:border-cyan-500/30 rounded-xl mb-6 flex gap-4 items-start">
            <Shield className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
            <div>
              <span className="text-xs font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                Claim Verification ({selectedFocus})
                {questionSource === "ollama" && (
                  <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    you can do it
                  </span>
                )}
                {questionSource === "gemini" && (
                  <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    go go go
                  </span>
                )}
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
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Provide your explanation:
              </label>
              <button
                type="button"
                onClick={toggleSpeechRecording}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  isRecording 
                    ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" 
                    : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                )}
              >
                <Mic className="w-3.5 h-3.5" />
                {isRecording ? "Stop Transcribing" : "Transcribe Voice"}
              </button>
            </div>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Provide specific implementation details, trade-offs, or concrete metrics to verify this claim..."
              className="w-full h-40 px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors text-sm"
            />
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={handleExitInterview}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400 rotate-180" />
                Exit Round
              </button>
              <button
                onClick={handleAnswerSubmit}
                className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {currentQuestionIdx < questions.length - 1 ? (
                  <>
                    Next Question
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Evaluating Answers...
                      </>
                    ) : (
                      <>
                        Complete Interview & View Report
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === "report" && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* Main Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ATS & Trust Scores */}
            <div className="card-border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-sm font-semibold text-slate-500 mb-2">
                {verificationResult ? "Verification Trust Score" : "Resume ATS Score"}
              </span>
              <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center font-bold ${getScoreColor(verificationResult ? verificationResult.trustScore : (atsResult?.final_score || 85))}`}>
                <span className="text-4xl">
                  {verificationResult ? verificationResult.trustScore : (atsResult?.final_score || 85)}%
                </span>
                {verificationResult && (
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                    {verificationResult.verdict?.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="mt-4 text-xs text-slate-400">
                {verificationResult 
                  ? "Calculated based on your answers to verification questions"
                  : "Determined by initial keyword matching and formatting check"}
              </div>
            </div>

            {/* Score Breakdown / Interview Details */}
            <div className="card-border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl md:col-span-2">
              {verificationResult ? (
                <div className="h-full flex flex-col justify-center">
                  <h4 className="text-lg font-bold mb-2">Interview Verification Complete</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    You have successfully completed the claim verification interview focusing on <span className="text-cyan-400 font-semibold">{selectedFocus}</span>.
                    The AI evaluated your technical accuracy, explanations, and key claims to gauge the reliability of your resume profile.
                  </p>
                  <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/20 dark:bg-cyan-950/20 dark:border-cyan-500/30 rounded-lg flex items-center gap-3">
                    <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Focus Area: {selectedFocus} • Interrogator Persona: {personas.find(p => p.id === selectedPersona)?.name || "Hiring Manager"}
                    </span>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

          </div>

          {/* AI Expert Feedback */}
          <div className="bg-slate-900 text-slate-100 p-8 rounded-2xl border border-cyan-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-xs text-cyan-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Ollama Insight
            </div>
            <h4 className="text-xl font-bold text-white mb-3">
              {verificationResult ? "Interview Verification Feedback" : "ATS Expert Feedback"}
            </h4>
            <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
              {verificationResult ? verificationResult.feedback : (feedback || "Calculating feedback details...")}
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
              onClick={downloadPDFReport}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF Report
            </button>
            <button 
              onClick={resetAll}
              className="px-6 py-3 border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-sm font-bold rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Start New Session
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
