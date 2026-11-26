"use client";

import React, { useState, useRef } from "react";
import { FileText, Briefcase, User, Clock, CheckCircle, Upload, Shield, AlertTriangle, ArrowRight, Loader2, Sparkles, RefreshCw, Users, Rocket, Zap } from "lucide-react";
import FileUploadDropzone from "@/components/ui/FileUploadDropzone";
import { validateResumeUpload } from "@/lib/resume-validation";
import {
  finishInterviewModeSessionAction,
  startInterviewModeSessionAction,
} from "@/lib/actions/interview-session.action";
import { toast } from "sonner";

async function getApiErrorMessage(response, fallback) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const detail = payload?.details ?? payload?.detail ?? payload?.error;
  const detailMessage = typeof detail === "string" ? detail : "";
  return `${fallback} (HTTP ${response.status})${detailMessage ? `: ${detailMessage}` : ""}`;
}

function renderFeedbackMarkdown(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export default function ResumeRoundSection() {
  const [selectedFocus, setSelectedFocus] = useState("Projects");
  const [selectedPersona, setSelectedPersona] = useState("hiring-manager");
  const [selectedDuration, setSelectedDuration] = useState("30");
  
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [lastAction, setLastAction] = useState(null); // "ats" | "round"
  const [jobDescription, setJobDescription] = useState("");
  
  // Loading & Flow states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAtsProcessing, setIsAtsProcessing] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [currentStep, setCurrentStep] = useState("setup"); // setup -> interviewing -> report
  
  // Data states
  const [parsedResume, setParsedResume] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isFeedbackStreaming, setIsFeedbackStreaming] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState(null);
  
  // Interviewing states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [targetQuestionCount, setTargetQuestionCount] = useState(0);
  const [answerEvaluation, setAnswerEvaluation] = useState(null);
  const [isAnswerEvaluating, setIsAnswerEvaluating] = useState(false);
  const [answerEvaluationError, setAnswerEvaluationError] = useState("");
  const [answerEvaluationStream, setAnswerEvaluationStream] = useState("");
  const [topicScores, setTopicScores] = useState([]);
  const [answerEvaluations, setAnswerEvaluations] = useState([]);
  const [overallSuggestions, setOverallSuggestions] = useState([]);

  const resumeSessionIdRef = useRef(null);

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

  const streamFeedback = async (response) => {
    if (!response.ok || !response.body) {
      throw new Error("Failed to generate resume feedback.");
    }

    setFeedback("");
    setIsFeedbackStreaming(true);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const data = JSON.parse(dataLine.slice(6));
          if (data.type === "chunk") {
            setFeedback((previous) => previous + data.text);
          }
        }

        if (done) break;
      }
    } finally {
      setIsFeedbackStreaming(false);
    }
  };

  const streamAnswerEvaluation = async (response) => {
    if (!response.ok || !response.body) {
      throw new Error("Failed to stream resume answer evaluation.");
    }

    setAnswerEvaluationStream("");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        const data = JSON.parse(dataLine.slice(6));

        if (data.type === "chunk") {
          setAnswerEvaluationStream((previous) => previous + data.text);
        } else if (data.type === "done") {
          const completedEvaluation = {
            trustScore: data.trustScore,
            verdict: data.verdict,
            feedback: data.feedback,
            topicScores: data.topicScores || [],
            answerEvaluations: data.answerEvaluations || [],
            overallSuggestions: data.overallSuggestions || [],
          };
          setAnswerEvaluation(completedEvaluation);
          setTopicScores(completedEvaluation.topicScores);
          setAnswerEvaluations(completedEvaluation.answerEvaluations);
          setOverallSuggestions(completedEvaluation.overallSuggestions);
          setAnswerEvaluationStream("");
          return completedEvaluation;
        } else if (data.type === "error") {
          throw new Error(data.error || "Answer evaluation streaming failed.");
        }
      }

      if (done) break;
    }
    return null;
  };

  const handleRetryAction = () => {
    setUploadError(null);
    if (lastAction === "round") {
      startResumeRound();
    } else {
      checkAtsScoreDirectly();
    }
  };

  const checkAtsScoreDirectly = async () => {
    if (!file) {
      toast.error("Please upload a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please enter a target Job Description.");
      return;
    }

    setIsAtsProcessing(true);
    setProcessingStage("validating");
    setUploadError(null);
    setLastAction("ats");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("resume", file);

      await validateResumeUpload(file);
      setProcessingStage("parsing");
      
      const parseRes = await fetch("/api/resume/upload", {
        method: "POST",
        body: uploadFormData,
      });
      if (!parseRes.ok) throw new Error(await getApiErrorMessage(parseRes, "Failed to parse resume PDF"));
      const parseData = await parseRes.json();
      const parsedData = parseData.parsedResume;
      setParsedResume(parsedData);
      setProcessingStage("ats");

      const atsRes = await fetch("/api/resume/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedResume: parsedData, jobDescription }),
      });

      if (!atsRes.ok) throw new Error(await getApiErrorMessage(atsRes, "Failed to calculate ATS score"));
      const atsData = await atsRes.json();
      setAtsResult(atsData.atsResult);
      setProcessingStage("feedback");

      const [feedbackRes] = await Promise.all([
        fetch("/api/resume/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atsResult: atsData.atsResult, jobDescription }),
        }),
      ]);

      setCurrentStep("report");
      await streamFeedback(feedbackRes);

      setAnswers([]);
      setAnswerEvaluation(null);
      setIsAnswerEvaluating(false);
      setAnswerEvaluationError("");
      setAnswerEvaluationStream("");
      setTopicScores([]);
      setAnswerEvaluations([]);
      setOverallSuggestions([]);
      setAnswerEvaluationStream("");
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "An error occurred during ATS score calculation.");
      toast.error(err.message || "An error occurred during ATS score calculation.");
    } finally {
      setIsAtsProcessing(false);
      setProcessingStage("");
    }
  };

  const generateQuestionsSequentially = async (parsedData) => {
    const totalQuestions = 5;
    setTargetQuestionCount(totalQuestions);
    setQuestions([]);
    setCurrentQuestionIdx(0);
    setCurrentAnswer("");
    setAnswers([]);
    setAnswerEvaluation(null);
    setAnswerEvaluationError("");
    setAnswerEvaluationStream("");
    setTopicScores([]);
    setAnswerEvaluations([]);
    setOverallSuggestions([]);
    setIsGeneratingQuestions(true);

    for (let index = 0; index < totalQuestions; index++) {
      const questionsRes = await fetch("/api/resume/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsedResume: parsedData,
          focusArea: selectedFocus,
          persona: selectedPersona,
          numQuestions: 1,
        }),
      });

      if (!questionsRes.ok) {
        throw new Error("Failed to generate questions.");
      }

      const questData = await questionsRes.json();
      const generatedQuestions = questData.verificationQuestions || [];
      const nextQuestion = generatedQuestions[0] || {
        question: "Can you walk me through how you implemented this work in your project?",
        expectedKeywords: [selectedFocus],
      };

      setQuestions((prevQuestions) => {
        const updatedQuestions = [...prevQuestions, nextQuestion];
        if (prevQuestions.length === 0) {
          setCurrentStep("interviewing");
          setCurrentQuestionIdx(0);
          setCurrentAnswer("");
          setAnswers([]);
        }
        return updatedQuestions;
      });
    }

    setIsGeneratingQuestions(false);
  };

  const startResumeRound = async () => {
    if (!file) {
      toast.error("Please upload a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please enter a target Job Description.");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("validating");
    setUploadError(null);
    setLastAction("round");

    try {
      await validateResumeUpload(file);

      const sessionResponse = await startInterviewModeSessionAction({
        mode: "resume-round",
        details: {
          focusArea: selectedFocus,
          persona: selectedPersona,
          duration: Number(selectedDuration),
        },
      });
      if (!sessionResponse.success) {
        if (sessionResponse.activeMode) {
          toast.warning(sessionResponse.error || "End the active interview session before starting Resume Round.");
        } else {
          toast.error(sessionResponse.error || "Could not start Resume Round.");
        }
        return;
      }
      resumeSessionIdRef.current = sessionResponse.sessionId;

      setProcessingStage("parsing");
      const uploadFormData = new FormData();
      uploadFormData.append("resume", file);

      const parseRes = await fetch("/api/resume/upload", {
        method: "POST",
        body: uploadFormData,
      });
      if (!parseRes.ok) throw new Error(await getApiErrorMessage(parseRes, "Failed to parse resume PDF"));
      const parseData = await parseRes.json();
      const parsedData = parseData.parsedResume;
      setParsedResume(parsedData);
      setProcessingStage("ats");

      const atsData = await fetch("/api/resume/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedResume: parsedData, jobDescription }),
      }).then(async (atsRes) => {
        if (!atsRes.ok) throw new Error(await getApiErrorMessage(atsRes, "Failed to calculate ATS score"));
        const atsJson = await atsRes.json();
        setAtsResult(atsJson.atsResult);
        setProcessingStage("feedback");
        return atsJson;
      });

      setCurrentStep("interviewing");
      await generateQuestionsSequentially(parsedData);

      if (atsData?.atsResult) {
        setAtsResult(atsData.atsResult);
      }
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "An error occurred during resume processing.");
      toast.error(err.message || "An error occurred during resume processing.");
      if (resumeSessionIdRef.current) {
        const sessionId = resumeSessionIdRef.current;
        const result = await finishInterviewModeSessionAction({
          sessionId,
          status: "abandoned",
        });
        if (!result.success) {
          toast.error(result.error || "Could not release the Resume Round session.");
        } else {
          resumeSessionIdRef.current = null;
        }
      }
    } finally {
      setIsProcessing(false);
      setIsGeneratingQuestions(false);
      setProcessingStage("");
    }
  };

  const generateFinalReport = async (finalAnswers = answers) => {
    if (!atsResult) return;

    setCurrentStep("report");
    setFeedback("");
    setAnswerEvaluation(null);
    setAnswerEvaluationError("");
    setAnswerEvaluationStream("");
    setTopicScores([]);
    setAnswerEvaluations([]);
    setOverallSuggestions([]);
    setIsAnswerEvaluating(finalAnswers.length > 0);
    let completedAnswerEvaluation = null;

    try {
      const evaluationRes = await (
        finalAnswers.length > 0
          ? fetch("/api/resume/evaluate-interview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                answers: finalAnswers,
                parsedResume,
                focusArea: selectedFocus,
              }),
            }).catch((error) => ({ networkError: error }))
          : Promise.resolve(null)
      );

      if (evaluationRes?.networkError) {
        const message = evaluationRes.networkError.message || "Could not connect to answer evaluation.";
        setAnswerEvaluationError(message);
        toast.error(message);
      } else if (evaluationRes && !evaluationRes.ok) {
        const message = await getApiErrorMessage(
          evaluationRes,
          "Failed to evaluate your Resume Round answers"
        );
        setAnswerEvaluationError(message);
        toast.error(message);
      } else if (evaluationRes) {
        try {
          if (!evaluationRes.body) {
            const evaluationData = await evaluationRes.json();
            const message = evaluationData.error || "Answer evaluation did not return a result.";
            setAnswerEvaluationError(message);
            toast.error(message);
          } else {
            completedAnswerEvaluation = await streamAnswerEvaluation(evaluationRes);
          }
        } catch (error) {
          console.error("Could not read Resume Round answer evaluation:", error);
          const message = "Could not read the answer evaluation response.";
          setAnswerEvaluationError(message);
          toast.error(message);
        }
      }
    } catch (err) {
      console.error(err);
      const message = err.message || "Unable to generate the final resume report.";
      toast.error(message);
    } finally {
      setIsAnswerEvaluating(false);
      if (resumeSessionIdRef.current) {
        const sessionId = resumeSessionIdRef.current;
        const result = await finishInterviewModeSessionAction({
          sessionId,
          result: {
            focusArea: selectedFocus,
            persona: selectedPersona,
            answers: finalAnswers,
            answerEvaluation: completedAnswerEvaluation,
            atsResult: atsResult
              ? {
                  final_score: atsResult.final_score ?? null,
                  skills_score: atsResult.skills_score ?? null,
                  experience_score: atsResult.experience_score ?? null,
                  projects_score: atsResult.projects_score ?? null,
                  education_score: atsResult.education_score ?? null,
                }
              : null,
          },
        });
        if (!result.success) {
          toast.error(result.error || "Resume report is ready, but the session could not be released.");
        } else {
          resumeSessionIdRef.current = null;
        }
      }
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer.");
      return;
    }

    const currentQuestion = questions[currentQuestionIdx];
    if (!currentQuestion) {
      alert("The next question is still being generated. Please wait a moment.");
      return;
    }

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
      return;
    }

    if (isGeneratingQuestions && currentQuestionIdx < targetQuestionCount - 1) {
      return;
    }

    await generateFinalReport(newAnswers);
  };

  const resetAll = () => {
    setFile(null);
    setJobDescription("");
    setParsedResume(null);
    setAtsResult(null);
    setQuestions([]);
    setFeedback("");
    setIsFeedbackStreaming(false);
    setOptimizedResume(null);
    setCurrentQuestionIdx(0);
    setCurrentAnswer("");
    setAnswers([]);
    setAnswerEvaluation(null);
    setIsAnswerEvaluating(false);
    setAnswerEvaluationError("");
    setAnswerEvaluationStream("");
    setTopicScores([]);
    setAnswerEvaluations([]);
    setOverallSuggestions([]);
    setIsAtsProcessing(false);
    setIsProcessing(false);
    setIsGeneratingQuestions(false);
    setProcessingStage("");
    setCurrentStep("setup");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    if (score >= 60) return "text-amber-500 border-amber-500/20 bg-amber-500/10";
    return "text-rose-500 border-rose-500/20 bg-rose-500/10";
  };

  const progressPercent = targetQuestionCount > 0
    ? Math.min(100, ((questions.length || 1) / targetQuestionCount) * 100)
    : 0;
  const isWaitingForNextQuestion = isGeneratingQuestions && currentQuestionIdx >= questions.length - 1 && currentQuestionIdx < targetQuestionCount - 1;
  const currentQuestion = questions[currentQuestionIdx];

  const processingStages = [
    { key: "validating", label: "Validating resume", active: processingStage === "validating", done: ["parsing", "ats", "feedback"].includes(processingStage) },
    { key: "parsing", label: "Parsing resume", active: processingStage === "parsing", done: ["ats", "feedback"].includes(processingStage) },
    { key: "ats", label: "ATS score calculated", active: processingStage === "ats", done: processingStage === "feedback" },
    { key: "feedback", label: "Generating feedback", active: processingStage === "feedback", done: false },
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
            {(isProcessing || isAtsProcessing) && (
              <div className="lg:col-span-2 mb-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                    Resume workflow
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {processingStage === "validating" && "Validating resume..."}
                    {processingStage === "parsing" && "Parsing resume..."}
                    {processingStage === "ats" && "ATS score calculated successfully"}
                    {processingStage === "feedback" && "Generating feedback..."}
                    {!processingStage && "Preparing..."}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {processingStages.map((stage) => {
                    const isActive = stage.active;
                    const isDone = stage.done;
                    return (
                      <div
                        key={stage.key}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          isActive
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                            : isDone
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                        }`}
                      >
                        {isDone ? "✓ " : isActive ? "● " : "○ "}{stage.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Upload Zone & JD */}
            <div className="flex flex-col gap-6">
              <FileUploadDropzone
                file={file}
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setUploadError(null);
                }}
                onFileRemove={() => {
                  setFile(null);
                  setUploadError(null);
                  setParsedResume(null);
                }}
                accept=".pdf"
                acceptedBadges={["PDF"]}
                maxSizeMB={15}
                isUploading={isProcessing || isAtsProcessing}
                uploadStage={
                  processingStage === "validating"
                    ? "Validating resume..."
                    : processingStage === "parsing"
                    ? "Parsing resume..."
                    : processingStage === "ats"
                      ? "ATS score calculated successfully"
                      : processingStage === "feedback"
                        ? "Generating feedback..."
                        : ""
                }
                error={uploadError}
                onRetry={handleRetryAction}
                title="Drop your resume here"
                subtitle="Upload a PDF resume (Up to 15MB)"
              />

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
                      {processingStage === "validating" && "Validating resume..."}
                      {processingStage === "parsing" && "Parsing resume..."}
                      {processingStage === "ats" && "ATS score calculated successfully"}
                      {processingStage === "feedback" && "Generating feedback..."}
                      {!processingStage && "Analyzing ATS Score..."}
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
                      {processingStage === "validating" && "Validating resume..."}
                      {processingStage === "parsing" && "Parsing resume..."}
                      {processingStage === "ats" && "ATS score calculated successfully"}
                      {processingStage === "feedback" && "Generating feedback..."}
                      {!processingStage && "Ollama Parsing & Analyzing..."}
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
              Question {Math.min(currentQuestionIdx + 1, questions.length || 1)} of {targetQuestionCount || questions.length || 1}
            </span>
            <div className="w-48 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
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
                {typeof currentQuestion === "string"
                  ? currentQuestion
                  : currentQuestion?.question || "Generating the next question..."}
              </p>
              {currentQuestion?.expectedKeywords && (
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-slate-400 mr-1">Recommended topics:</span>
                  {currentQuestion.expectedKeywords.map((kw, i) => (
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
              disabled={isWaitingForNextQuestion}
              className="mt-2 w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isWaitingForNextQuestion ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating next question...
                </>
              ) : currentQuestionIdx < questions.length - 1 ? (
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
          {lastAction === "ats" && (
            <>
              {/* ATS Score */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-semibold text-slate-500 mb-2">ATS Score</span>
                  <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center font-bold ${getScoreColor(atsResult?.final_score || 0)}`}>
                    <span className="text-4xl">{atsResult?.final_score || 0}%</span>
                  </div>
                  <div className="mt-4 text-xs text-slate-400">
                    Based on resume match with the job description
                  </div>
                </div>

                <div className="card-border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl md:col-span-2">
                  <h4 className="text-lg font-bold mb-4">ATS Analysis Breakdown</h4>
                  <div className="space-y-3.5">
                    {[
                      { label: "Skills Alignment", val: atsResult?.skills_score || 0 },
                      { label: "Work Experience Impact", val: atsResult?.experience_score || 0 },
                      { label: "Projects Details", val: atsResult?.projects_score || 0 },
                      { label: "Education Verification", val: atsResult?.education_score || 0 },
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

              <div className="bg-slate-900 text-slate-100 p-8 rounded-2xl border border-cyan-500/20 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 text-xs text-cyan-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Ollama Insight
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Resume ATS Feedback</h4>
                {isFeedbackStreaming && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-cyan-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating live feedback...
                  </div>
                )}
                <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                  {feedback ? renderFeedbackMarkdown(feedback) : "Calculating feedback details..."}
                </p>
              </div>
            </>
          )}

          {/* Answer Evaluation */}
          {answers.length > 0 && (
            <div className="bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-cyan-500/30 p-8 rounded-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h4 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-cyan-500" />
                    Resume Question Score &amp; Evaluation
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    AI score and evaluation of your Resume Round answers.
                  </p>
                </div>
                {answerEvaluation && (
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreColor(answerEvaluation.trustScore)}`}>
                    {answerEvaluation.verdict?.replaceAll("_", " ") || "Evaluated"}
                  </span>
                )}
              </div>

              {isAnswerEvaluating && (
                <div className="flex items-center gap-2 text-sm text-cyan-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating all interview answers...
                </div>
              )}
              {answerEvaluationError && (
                <p className="text-sm text-rose-500">{answerEvaluationError}</p>
              )}
              {answerEvaluation && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-4xl font-black ${getScoreColor(answerEvaluation.trustScore).split(" ")[0]}`}>
                      {answerEvaluation.trustScore}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/100 Resume Question Score</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {answerEvaluation.feedback}
                  </p>
                </div>
              )}
              {!answerEvaluation && answerEvaluationStream && (
                <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {answerEvaluationStream}
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-cyan-500 align-middle" />
                </p>
              )}

              {topicScores.length > 0 && (
                <div className="mt-6">
                  <h5 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                    Topic-wise Scores
                  </h5>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {topicScores.map((topic, idx) => (
                      <div key={`${topic.topic}-${idx}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{topic.topic}</span>
                          <span className={`text-lg font-black ${getScoreColor(topic.score).split(" ")[0]}`}>
                            {topic.score}/100
                          </span>
                        </div>
                        <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full bg-cyan-500" style={{ width: `${topic.score}%` }} />
                        </div>
                        {topic.reason && (
                          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{topic.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {overallSuggestions.length > 0 && (
                <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <h5 className="mb-3 text-sm font-bold text-amber-600 dark:text-amber-400">
                    Overall Improvement Suggestions
                  </h5>
                  <ul className="space-y-2">
                    {overallSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {answerEvaluations.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/60">
              <h4 className="mb-6 text-lg font-bold">Answer-by-Answer Evaluation</h4>
              <div className="space-y-5">
                {answerEvaluations.map((evaluation, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <p className="text-xs font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                          Question {idx + 1}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                          {evaluation.question || answers[idx]?.question}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${getScoreColor(evaluation.score).split(" ")[0]}`}>
                          {evaluation.score}/100
                        </span>
                        {evaluation.verdict && (
                          <span className="rounded-full border border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                            {String(evaluation.verdict).replaceAll("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          What Was Good
                        </h5>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {evaluation.whatWasGood || "No clear strengths were demonstrated."}
                        </p>
                      </div>
                      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                        <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                          Why This Answer Was Weak
                        </h5>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {evaluation.whyNotGood || "The answer lacked specific evidence and technical depth."}
                        </p>
                      </div>
                    </div>

                    {evaluation.suggestions?.length > 0 && (
                      <div className="mt-4">
                        <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          How to Improve
                        </h5>
                        <ul className="space-y-2">
                          {evaluation.suggestions.map((suggestion, suggestionIdx) => (
                            <li key={suggestionIdx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.improvedAnswer && (
                      <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                        <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                          Stronger Example Answer
                        </h5>
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {evaluation.improvedAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
              <h4 className="text-lg font-bold mb-6">Resume Questions &amp; Your Answers</h4>
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