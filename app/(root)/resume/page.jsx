"use client";

import React, { useState, useRef } from "react";
import { 
  FileText, 
  Sparkles, 
  Upload, 
  User, 
  Mail, 
  Code, 
  Copy, 
  Check, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Eye,
  Settings,
  RefreshCw,
  FileCode,
  Download,
  FileDown,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award
} from "lucide-react";
import { toast } from "sonner";
import ResumeRoundSection from "@/components/Resume RoundSection";

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState("ats-match"); // "ats-match" | "builder"
  const [builderMethod, setBuilderMethod] = useState("description"); // "description" | "document"
  
  // Builder form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [docFile, setDocFile] = useState(null);
  
  // States for generation results
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJson, setGeneratedJson] = useState(null);
  const [generatedLatex, setGeneratedLatex] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [outputTab, setOutputTab] = useState("latex"); // "latex" | "preview"
  const [isCompilingPdf, setIsCompilingPdf] = useState(false);
  
  const docFileInputRef = useRef(null);

  const handleDocFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
    }
  };

  const handleCopyLatex = () => {
    if (!generatedLatex) return;
    navigator.clipboard.writeText(generatedLatex);
    setIsCopied(true);
    toast.success("LaTeX code copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!generatedLatex) return;
    setIsCompilingPdf(true);
    const toastId = toast.loading("Compiling LaTeX into downloadable PDF...");
    try {
      const baseName = (name || generatedJson?.name || "Resume").trim().replace(/[^a-zA-Z0-9_\-]/g, "_");
      const filename = `${baseName}_Resume.pdf`;

      const response = await fetch("/api/resume/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latexCode: generatedLatex,
          filename,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "Failed to compile PDF.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Resume PDF compiled & downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to compile PDF. You can also export to Overleaf.", { id: toastId });
    } finally {
      setIsCompilingPdf(false);
    }
  };

  const handleDownloadTex = () => {
    if (!generatedLatex) return;
    const baseName = (name || generatedJson?.name || "Resume").trim().replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filename = `${baseName}_Resume.tex`;
    const blob = new Blob([generatedLatex], { type: "text/x-tex;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("LaTeX .tex file saved!");
  };

  const handleOpenOverleaf = () => {
    if (!generatedLatex) return;
    try {
      const form = document.createElement("form");
      form.action = "https://www.overleaf.com/docs";
      form.method = "POST";
      form.target = "_blank";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "snip";
      input.value = generatedLatex;
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      toast.success("Opening in Overleaf editor...");
    } catch (e) {
      window.open("https://www.overleaf.com", "_blank");
    }
  };

  const handleGenerateResume = async () => {
    if (builderMethod === "description" && !description.trim()) {
      toast.error("Please enter a description or details about yourself.");
      return;
    }
    if (builderMethod === "document" && !docFile) {
      toast.error("Please upload a document to proceed.");
      return;
    }

    setIsGenerating(true);
    setGeneratedJson(null);
    setGeneratedLatex("");

    try {
      let sourceText = description;

      // If document method is selected, we upload and parse the document first
      if (builderMethod === "document") {
        const uploadFormData = new FormData();
        uploadFormData.append("resume", docFile);

        const parseRes = await fetch("/api/resume/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!parseRes.ok) throw new Error("Failed to parse uploaded document.");
        const parseData = await parseRes.json();
        
        // Use raw text from PDF to prevent heuristic parser losses (falling back to parsed JSON string if unavailable)
        sourceText = parseData.rawText || JSON.stringify(parseData.parsedResume);
      }

      // Generate resume JSON & LaTeX code
      const response = await fetch("/api/resume/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: builderMethod,
          text: sourceText,
          name,
          email,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate resume template.");
      }

      setGeneratedJson(data.resumeJson);
      setGeneratedLatex(data.latexCode);
      toast.success("Resume LaTeX template generated successfully!");

    } catch (error) {
      console.error(error);
      toast.error(error.message || "An error occurred during resume generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetBuilder = () => {
    setName("");
    setEmail("");
    setDescription("");
    setDocFile(null);
    setGeneratedJson(null);
    setGeneratedLatex("");
    setOutputTab("latex");
  };

  return (
    <div className="flex flex-col gap-8 min-h-screen pb-16">
      {/* Top Banner / Hero */}
      <section className="relative overflow-hidden bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-indigo-600/10 border border-cyan-500/20 rounded-2xl p-8 shadow-sm">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-cyan-400" />
              Resume Suite
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
              Verify your claims, test your ATS score, or build a professionally optimized LaTeX resume using state-of-the-art AI.
            </p>
          </div>
          
          {/* Custom Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto shrink-0 shadow-inner">
            <button
              onClick={() => setActiveTab("ats-match")}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "ats-match"
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              ATS Match & Interview
            </button>
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "builder"
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI LaTeX Resume Builder
            </button>
          </div>
        </div>
      </section>

      {/* Tab Contents */}
      {activeTab === "ats-match" ? (
        <ResumeRoundSection />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fadeIn">
          {/* Builder Form Config */}
          <div className="bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-cyan-500/20 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Make Your Resume</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Provide details about yourself or upload a document to generate a high-performing LaTeX template.
              </p>
            </div>

            {/* Selector: Method */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setBuilderMethod("description")}
                className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  builderMethod === "description"
                    ? "bg-white dark:bg-slate-800 text-cyan-500 shadow-sm border border-slate-200/60 dark:border-slate-700/60"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                With Description / About Yourself
              </button>
              <button
                onClick={() => setBuilderMethod("document")}
                className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  builderMethod === "document"
                    ? "bg-white dark:bg-slate-800 text-cyan-500 shadow-sm border border-slate-200/60 dark:border-slate-700/60"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                By Document / Raw Resume
              </button>
            </div>

            {/* Inputs: Personal Profile Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            {/* Method Inputs */}
            {builderMethod === "description" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  About Yourself & Experience Details
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your profile, previous jobs (titles, companies, metrics achieved), projects, tech stack, and education. The more details you provide, the better the optimized LaTeX resume output will be..."
                  className="w-full h-48 px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors text-sm leading-relaxed"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Upload Current / Draft Document
                </label>
                <div 
                  onClick={() => docFileInputRef.current?.click()}
                  className={`border-2 border-dashed border-cyan-500/20 dark:border-cyan-500/30 rounded-xl p-8 text-center hover:border-cyan-500/60 transition-all duration-300 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer ${
                    docFile ? "border-cyan-500 bg-cyan-500/10" : ""
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <Upload className="w-10 h-10 text-cyan-500 dark:text-cyan-400 mb-3" />
                    <p className="text-slate-950 dark:text-white font-bold text-sm mb-1">
                      {docFile ? docFile.name : "Drop document here"}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      {docFile ? `${(docFile.size / 1024).toFixed(1)} KB` : "Click to select a draft resume (PDF or TXT)"}
                    </p>
                    <input 
                      type="file"
                      ref={docFileInputRef}
                      onChange={handleDocFileChange}
                      accept=".pdf,.txt"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mt-2">
              <button
                onClick={handleGenerateResume}
                disabled={isGenerating}
                className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white text-sm font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Formatting Resume LaTeX...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate LaTeX Resume
                  </>
                )}
              </button>
              {(generatedJson || generatedLatex) && (
                <button
                  onClick={resetBuilder}
                  className="px-4 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Builder Output Panel */}
          <div className="flex flex-col gap-6">
            {!generatedJson && !isGenerating && (
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[460px]">
                <FileCode className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="font-bold text-slate-400 dark:text-slate-500 text-lg">No Resume Template Generated</h3>
                <p className="text-xs text-slate-500 dark:text-slate-600 mt-1 max-w-xs">
                  Fill in your experience or upload a document and click generate to build your structured JSON & LaTeX.
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[460px]">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">Formatting Resume Structures</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Gemini is normalizing coordinates, optimizing summaries, formatting skills lists, and building LaTeX packages...
                </p>
              </div>
            )}

            {generatedJson && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                {/* Actions & Download Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadPdf}
                      disabled={isCompilingPdf}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all duration-300 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCompilingPdf ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Compiling PDF...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadTex}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 transition-colors flex items-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                      Save .tex
                    </button>

                    <button
                      onClick={handleOpenOverleaf}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 transition-colors flex items-center gap-1.5"
                      title="Open directly in Overleaf online editor"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                      Overleaf
                    </button>
                  </div>

                  {/* Output Switcher Tabs */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
                    <button
                      onClick={() => setOutputTab("latex")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        outputTab === "latex"
                          ? "bg-cyan-500 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      LaTeX Code
                    </button>
                    <button
                      onClick={() => setOutputTab("preview")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        outputTab === "preview"
                          ? "bg-cyan-500 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Live Preview
                    </button>
                  </div>
                </div>

                {/* Tab 1: LaTeX Code View */}
                {outputTab === "latex" && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl animate-fadeIn">
                    <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                        <Code className="w-4 h-4 text-cyan-400" />
                        LaTeX Source Code (Standard TeX Live / Overleaf Format)
                      </span>
                      <button
                        onClick={handleCopyLatex}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Code
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-5 text-[11px] font-mono text-cyan-300 max-h-[500px] overflow-y-auto leading-relaxed scrollbar-thin selection:bg-cyan-900 selection:text-white">
                      <code>{generatedLatex}</code>
                    </pre>
                  </div>
                )}

                {/* Tab 2: Visual Resume Preview */}
                {outputTab === "preview" && (
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl max-h-[560px] overflow-y-auto scrollbar-thin text-slate-900 dark:text-slate-100 flex flex-col gap-6 animate-fadeIn">
                    {/* Header */}
                    <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {generatedJson.name || "Your Name"}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {generatedJson.location && <span>{generatedJson.location}</span>}
                        {generatedJson.phone && <span>• {generatedJson.phone}</span>}
                        {generatedJson.email && <span>• {generatedJson.email}</span>}
                        {generatedJson.linkedin && (
                          <span>
                            • <a href={generatedJson.linkedin.startsWith("http") ? generatedJson.linkedin : `https://${generatedJson.linkedin}`} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline">LinkedIn</a>
                          </span>
                        )}
                        {generatedJson.github && (
                          <span>
                            • <a href={generatedJson.github.startsWith("http") ? generatedJson.github : `https://${generatedJson.github}`} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline">GitHub</a>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    {generatedJson.summary && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                          Professional Summary
                        </h3>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {generatedJson.summary}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    {generatedJson.skills && generatedJson.skills.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                          Technical Skills
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(Array.isArray(generatedJson.skills) ? generatedJson.skills : [generatedJson.skills]).map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[11px] rounded font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {generatedJson.experience && generatedJson.experience.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 border-b border-slate-200 dark:border-slate-800 pb-1 mb-3">
                          Work Experience
                        </h3>
                        <div className="flex flex-col gap-4">
                          {generatedJson.experience.map((exp, idx) => (
                            <div key={idx} className="flex flex-col gap-1">
                              <div className="flex justify-between items-baseline text-xs">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {exp.title} <span className="text-slate-500 dark:text-slate-400 font-normal">-- {exp.company}</span>
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px]">{exp.duration}</span>
                              </div>
                              {exp.responsibilities && (
                                <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 mt-1 ml-1">
                                  {exp.responsibilities.map((r, rIdx) => (
                                    <li key={rIdx}>{r}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {generatedJson.projects && generatedJson.projects.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 border-b border-slate-200 dark:border-slate-800 pb-1 mb-3">
                          Projects
                        </h3>
                        <div className="flex flex-col gap-4">
                          {generatedJson.projects.map((proj, idx) => (
                            <div key={idx} className="flex flex-col gap-1">
                              <div className="flex justify-between items-baseline text-xs">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{proj.name}</span>
                                <span className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                                  {Array.isArray(proj.technologies) ? proj.technologies.join(", ") : proj.technologies}
                                </span>
                              </div>
                              {proj.description && (
                                <p className="text-[11px] italic text-slate-500 dark:text-slate-400">{proj.description}</p>
                              )}
                              {proj.highlights && (
                                <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 mt-0.5 ml-1">
                                  {proj.highlights.map((h, hIdx) => (
                                    <li key={hIdx}>{h}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {generatedJson.education && generatedJson.education.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                          Education
                        </h3>
                        <div className="flex flex-col gap-2">
                          {generatedJson.education.map((edu, idx) => (
                            <div key={idx} className="flex justify-between items-baseline text-xs">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{edu.degree}</span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{edu.institution} {edu.gpa ? `• GPA: ${edu.gpa}` : ""}</p>
                              </div>
                              <span className="text-slate-500 dark:text-slate-400 text-[11px]">{edu.year}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Achievements & Certifications */}
                    {((generatedJson.achievements && generatedJson.achievements.length > 0) || (generatedJson.certifications && generatedJson.certifications.length > 0)) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {generatedJson.achievements && generatedJson.achievements.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1.5">
                              Achievements
                            </h3>
                            <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                              {generatedJson.achievements.map((ach, idx) => (
                                <li key={idx}>{ach}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {generatedJson.certifications && generatedJson.certifications.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1.5">
                              Certifications
                            </h3>
                            <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                              {generatedJson.certifications.map((cert, idx) => (
                                <li key={idx}>{cert}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PDF & Export Info Card */}
                <div className="bg-gradient-to-br from-cyan-900/20 via-blue-900/15 to-indigo-900/20 border border-cyan-500/25 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        ATS-Optimized LaTeX & PDF Template
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Ready to download as a compiled PDF, exportable directly to Overleaf, or usable with local LaTeX distributions (<code className="text-cyan-400">pdflatex</code> / <code className="text-cyan-400">xelatex</code>).
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isCompilingPdf}
                    className="shrink-0 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isCompilingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
