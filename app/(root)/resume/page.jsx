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
  FileCode
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

      if (!response.ok) throw new Error("Failed to generate resume template.");
      const data = await response.json();

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
                {/* LaTeX Code Box */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                  <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      <Code className="w-4 h-4 text-cyan-400" />
                      LaTeX Source Code (Overleaf Compatible)
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
                          Copy LaTeX
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-5 text-[11px] font-mono text-cyan-300 max-h-96 overflow-y-auto leading-relaxed scrollbar-thin">
                    <code>{generatedLatex}</code>
                  </pre>
                </div>

                {/* Email Delivery Warning Card */}
                <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/25 p-6 rounded-2xl">
                  <div className="flex gap-4">
                    <Mail className="w-6 h-6 text-cyan-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-950 dark:text-white">LaTeX Compiler Queue</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                        Your LaTeX source code has been structured successfully. Since compiling PDFs with LaTeX packages is resource-intensive, a compiled version will automatically be delivered directly to your email in the background (email feature integrations coming soon).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
