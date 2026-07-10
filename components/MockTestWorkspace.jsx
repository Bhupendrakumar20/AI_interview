"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Play,
  RotateCcw,
  Volume2,
  Mic,
  MicOff,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Send,
  Code,
  Layout,
  BarChart,
  Trophy,
  Undo2,
  Trash2,
  Sparkles,
  Download,
  Square,
  Circle,
  PenTool,
  Type,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  User,
  ExternalLink
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";
import { getAiNudge, evaluateMockTest, runCodeAction } from "@/lib/actions/mock-test-ai.action";

const INITIAL_CODE_TEMPLATES = {
  javascript: `// Write your JavaScript solution here\nfunction solve(input) {\n  console.log("Hello PrepWise JS");\n  return true;\n}\n\nsolve();`,
  python: `# Write your Python solution here\ndef solve():\n    print("Hello PrepWise Python")\n    return True\n\nsolve()`,
  cpp: `// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello PrepWise C++" << endl;\n    return 0;\n}`,
  java: `// Write your Java solution here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello PrepWise Java");\n    }\n}`
};

export default function MockTestWorkspace({ filters, questions, onClose }) {
  const [activeTab, setActiveTab] = useState("code"); // code, whiteboard, feedback, leaderboard
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [editorCode, setEditorCode] = useState(INITIAL_CODE_TEMPLATES.javascript);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [consoleError, setConsoleError] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Timer state (45 minutes)
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Web Speech API
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Custom Whiteboard State
  const canvasRef = useRef(null);
  const [whiteboardTool, setWhiteboardTool] = useState("pencil"); // pencil, rect, circle, line, text
  const [strokeColor, setStrokeColor] = useState("#3b82f6"); // blue
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [whiteboardText, setWhiteboardText] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapes, setShapes] = useState([]); // Save vector history for RAG and undo
  const [currentShape, setCurrentShape] = useState(null);

  // AI Nudges
  const [nudges, setNudges] = useState([]);
  const [loadingNudge, setLoadingNudge] = useState(false);

  // Final evaluation feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState([
    { rank: 1, name: "Sujata Gunale", score: 990, speed: "28 min" },
    { rank: 2, name: "TEAM SEVEN", score: 985, speed: "30 min" },
    { rank: 3, name: "HARSHIT KUMAR", score: 940, speed: "35 min" },
    { rank: 4, name: "bhole_Chature", score: 910, speed: "41 min" },
    { rank: 5, name: "You (Pending)", score: "-", speed: "-" }
  ]);

  const currentQuestion = questions[currentQuestionIndex] || {
    question: "Design a system...",
    expectedAnswer: "Rubric...",
    tips: []
  };

  // Sync templates on language selection change
  useEffect(() => {
    setEditorCode(INITIAL_CODE_TEMPLATES[selectedLanguage] || "");
  }, [selectedLanguage]);

  // Countdown timer logic
  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      toast.warning("Time is up! Submitting your answers.");
      handleSubmitTest();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ----------------------------------------------------
  // Speech Recognition (Web Speech API)
  // ----------------------------------------------------
  useEffect(() => {
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
            setTranscript((prev) => prev + finalTranscript);
          }
        };

        rec.onerror = (e) => {
          console.error("Speech recognition error:", e);
        };

        rec.onend = () => {
          if (isRecording) {
            // Keep active if it stopped unexpectedly
            try { rec.start(); } catch (err) {}
          }
        };

        recognitionRef.current = rec;
      }
    }
  }, [isRecording]);

  const toggleSpeechRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success("Stopped voice recording.");
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success("Started continuous voice transcription. Speak your thoughts!");
    }
  };

  // ----------------------------------------------------
  // Whiteboard Canvas Drawing Logic
  // ----------------------------------------------------
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw all completed shapes
    shapes.forEach((shape) => {
      ctx.strokeStyle = shape.color;
      ctx.fillStyle = shape.color;
      ctx.lineWidth = shape.width;

      if (shape.type === "pencil") {
        ctx.beginPath();
        shape.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (shape.type === "rect") {
        ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      } else if (shape.type === "circle") {
        ctx.beginPath();
        ctx.arc(shape.x + shape.w / 2, shape.y + shape.h / 2, Math.abs(shape.w) / 2, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (shape.type === "line") {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
        ctx.stroke();
      } else if (shape.type === "text") {
        ctx.font = `${shape.width * 5 + 12}px sans-serif`;
        ctx.fillText(shape.text, shape.x, shape.y);
      }
    });

    // Draw current active shape
    if (currentShape) {
      ctx.strokeStyle = currentShape.color;
      ctx.fillStyle = currentShape.color;
      ctx.lineWidth = currentShape.width;

      if (currentShape.type === "pencil") {
        ctx.beginPath();
        currentShape.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (currentShape.type === "rect") {
        ctx.strokeRect(currentShape.x, currentShape.y, currentShape.w, currentShape.h);
      } else if (currentShape.type === "circle") {
        ctx.beginPath();
        ctx.arc(currentShape.x + currentShape.w / 2, currentShape.y + currentShape.h / 2, Math.abs(currentShape.w) / 2, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentShape.type === "line") {
        ctx.beginPath();
        ctx.moveTo(currentShape.x, currentShape.y);
        ctx.lineTo(currentShape.x + currentShape.w, currentShape.y + currentShape.h);
        ctx.stroke();
      }
    }
  }, [shapes, currentShape]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasMousePos(e);
    setIsDrawing(true);

    if (whiteboardTool === "pencil") {
      setCurrentShape({
        type: "pencil",
        color: strokeColor,
        width: strokeWidth,
        points: [pos]
      });
    } else if (whiteboardTool === "text") {
      if (!whiteboardText.trim()) {
        toast.info("Please enter text in the input box first.");
        setIsDrawing(false);
        return;
      }
      setShapes((prev) => [
        ...prev,
        {
          type: "text",
          color: strokeColor,
          width: strokeWidth,
          x: pos.x,
          y: pos.y,
          text: whiteboardText
        }
      ]);
      setWhiteboardText("");
      setIsDrawing(false);
    } else {
      setCurrentShape({
        type: whiteboardTool,
        color: strokeColor,
        width: strokeWidth,
        x: pos.x,
        y: pos.y,
        w: 0,
        h: 0
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentShape) return;
    const pos = getCanvasMousePos(e);

    if (currentShape.type === "pencil") {
      setCurrentShape((prev) => ({
        ...prev,
        points: [...prev.points, pos]
      }));
    } else {
      setCurrentShape((prev) => ({
        ...prev,
        w: pos.x - prev.x,
        h: pos.y - prev.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentShape) {
      setShapes((prev) => [...prev, currentShape]);
      setCurrentShape(null);
    }
  };

  const handleUndo = () => {
    setShapes((prev) => prev.slice(0, -1));
  };

  const handleClearCanvas = () => {
    setShapes([]);
    toast.success("Canvas cleared.");
  };

  const handleDownloadWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `whiteboard-${filters.company}.png`;
    link.href = url;
    link.click();
    toast.success("Whiteboard image downloaded!");
  };

  // ----------------------------------------------------
  // Remote Code Execution (RCE)
  // ----------------------------------------------------
  const handleRunCode = async () => {
    setIsExecuting(true);
    setConsoleOutput("Compiling and executing code...");
    setConsoleError("");
    try {
      const result = await runCodeAction({
        sourceCode: editorCode,
        language: selectedLanguage
      });

      if (result.success) {
        setConsoleOutput(result.output || "Execution finished successfully with no stdout.");
        toast.success("Code executed successfully!");
      } else {
        setConsoleError(result.error || "Execution failed.");
        setConsoleOutput(result.output || "");
        toast.error("Execution error.");
      }
    } catch (err) {
      console.error(err);
      setConsoleError(err.message || "Failed to execute code.");
      toast.error("RCE Connection error.");
    } finally {
      setIsExecuting(false);
    }
  };

  // ----------------------------------------------------
  // Contextual AI Nudges
  // ----------------------------------------------------
  const handleRequestNudge = async () => {
    setLoadingNudge(true);
    try {
      const result = await getAiNudge({
        question: currentQuestion.question,
        code: editorCode,
        language: selectedLanguage,
        transcript: transcript,
        company: filters.company,
        role: filters.role
      });

      if (result.success) {
        setNudges((prev) => [...prev, result.nudge]);
        toast.success("AI Nudge received!");
      } else {
        toast.error("Failed to generate nudge.");
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Assistant connection error.");
    } finally {
      setLoadingNudge(false);
    }
  };

  // ----------------------------------------------------
  // Structured AI Diagnostics Evaluation Submission
  // ----------------------------------------------------
  const handleSubmitTest = async () => {
    setIsTimerRunning(false);
    setIsSubmitting(true);
    setActiveTab("feedback");
    toast.loading("Analyzing your submission...", { id: "eval-toast" });

    // Generate drawing summary
    const shapesSummary = shapes.map((s, idx) => `Shape ${idx + 1}: ${s.type} (color: ${s.color})`).join(", ");
    const whiteboardSummary = shapesSummary || "No whiteboard drawings submitted.";

    try {
      const result = await evaluateMockTest({
        question: currentQuestion.question,
        code: editorCode,
        language: selectedLanguage,
        transcript: transcript,
        whiteboardSummary,
        company: filters.company,
        role: filters.role
      });

      if (result.success) {
        setEvaluation(result.evaluation);
        toast.success("Evaluation complete!", { id: "eval-toast" });
        
        // Update user rank in leaderboard
        setLeaderboard((prev) =>
          prev.map((item) =>
            item.name.startsWith("You")
              ? {
                  rank: 5,
                  name: `You (${filters.role})`,
                  score: result.evaluation.score,
                  speed: `${Math.round((45 * 60 - timeLeft) / 60)} min`
                }
              : item
          ).sort((a, b) => {
            const scoreA = typeof a.score === "number" ? a.score : 0;
            const scoreB = typeof b.score === "number" ? b.score : 0;
            return scoreB - scoreA;
          }).map((item, idx) => ({ ...item, rank: idx + 1 }))
        );
      } else {
        toast.error(`Evaluation failed: ${result.error}`, { id: "eval-toast" });
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Evaluation server error.", { id: "eval-toast" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Radar data format helper
  // ----------------------------------------------------
  const getRadarData = () => {
    if (!evaluation || !evaluation.categories) return [];
    return [
      { subject: "Correctness", value: evaluation.categories.correctness, fullMark: 100 },
      { subject: "Efficiency", value: evaluation.categories.efficiency, fullMark: 100 },
      { subject: "Communication", value: evaluation.categories.communication, fullMark: 100 },
      { subject: "Design", value: evaluation.categories.design, fullMark: 100 }
    ];
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f19] flex flex-col text-slate-100 font-sans overflow-hidden">
      {/* HEADERBAR */}
      <header className="px-6 py-4 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
            PW
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <span>{filters.company} Mock Interview</span>
              <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                {filters.role}
              </span>
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span>Type:</span>
              <span className="text-blue-400 font-semibold">{filters.type}</span>
              <span className="mx-1">•</span>
              <span>Level:</span>
              <span className="text-amber-400 font-semibold">{filters.difficulty}</span>
            </p>
          </div>
        </div>

        {/* TIMER & QUICK SUBMIT */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-[#172237] px-4 py-1.5 rounded-lg border border-slate-700 shadow-inner">
            <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span className="font-mono text-lg font-bold text-slate-200">
              {formatTime(timeLeft)}
            </span>
            <Button
              size="xs"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="bg-transparent hover:bg-slate-700 text-slate-400 hover:text-slate-100 px-1 py-0.5 rounded ml-1"
            >
              {isTimerRunning ? "Pause" : "Resume"}
            </Button>
          </div>

          <Button
            onClick={handleSubmitTest}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center gap-1.5 px-4"
          >
            {isSubmitting ? (
              <>
                <Sparkles size={16} className="animate-spin" /> Evaluating...
              </>
            ) : (
              <>
                <Send size={16} /> Submit Test
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            Exit Workspace
          </Button>
        </div>
      </header>

      {/* WORKSPACE CONTENT */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: QUESTION & AI NUDGES */}
        <section className="w-[32%] border-r border-slate-800 bg-[#0a0e1a] p-5 flex flex-col gap-5 overflow-y-auto">
          {/* Question card */}
          <div className="bg-[#0e1526] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="h-7 w-7 border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex((p) => Math.min(questions.length - 1, p + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="h-7 w-7 border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-100 leading-snug">
              {currentQuestion.question || currentQuestion.title}
            </h3>

            {currentQuestion.tips && currentQuestion.tips.length > 0 && (
              <div className="mt-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Lightbulb size={14} className="text-amber-500" /> Key Considerations
                </h4>
                <ul className="text-xs text-slate-400 space-y-1 pl-1">
                  {currentQuestion.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* continuous voice transcription */}
          <div className="bg-[#0e1526] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Mic size={14} className={isRecording ? "text-rose-500 animate-pulse" : "text-slate-400"} />
                Thought Process Transcriber
              </h4>
              <Button
                size="sm"
                onClick={toggleSpeechRecording}
                className={`text-xs px-2.5 py-1 ${isRecording ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"}`}
              >
                {isRecording ? <><MicOff size={12} className="inline mr-1" /> Stop</> : <><Mic size={12} className="inline mr-1" /> Talk</>}
              </Button>
            </div>
            <div className="h-28 bg-[#090d16] rounded-lg border border-slate-800 p-2.5 text-xs text-slate-400 overflow-y-auto font-mono scrollbar-thin">
              {transcript || <span className="italic text-slate-600">Start talking to capture your thought process dynamically...</span>}
            </div>
          </div>

          {/* AI Nudges Panel */}
          <div className="bg-[#0e1526] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-500" /> AI Interview Nudges
              </h4>
              <Button
                size="sm"
                onClick={handleRequestNudge}
                disabled={loadingNudge}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 border border-slate-700"
              >
                {loadingNudge ? "Thinking..." : "Get Hint"}
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {nudges.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No nudges requested yet. Stuck? Click "Get Hint" for subtle directions.</p>
              ) : (
                nudges.map((n, idx) => (
                  <div key={idx} className="bg-blue-950/20 border border-blue-900/30 p-2.5 rounded-lg text-xs text-blue-300 flex items-start gap-1.5">
                    <Lightbulb className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>{n}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: WORKSPACE TABS */}
        <section className="flex-1 flex flex-col bg-[#080b14] overflow-hidden">
          {/* TABS SELECTOR */}
          <nav className="bg-[#0d1424] px-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex gap-1.5 py-2">
              <button
                onClick={() => setActiveTab("code")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === "code" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Code size={14} /> Coding IDE
              </button>
              <button
                onClick={() => setActiveTab("whiteboard")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === "whiteboard" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Layout size={14} /> System Whiteboard
              </button>
              <button
                onClick={() => setActiveTab("feedback")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === "feedback" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                <BarChart size={14} /> AI Diagnostics
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === "leaderboard" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Trophy size={14} /> Leaderboard
              </button>
            </div>
          </nav>

          {/* TAB 1: CODING IDE */}
          {activeTab === "code" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="px-4 py-2 bg-[#090d16] border-b border-slate-800/80 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Select Language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-[#172237] border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                </div>

                <Button
                  onClick={handleRunCode}
                  disabled={isExecuting}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-7 px-3 py-1 flex items-center gap-1"
                >
                  <Play size={12} /> {isExecuting ? "Executing..." : "Run Code"}
                </Button>
              </div>

              {/* Code Editor */}
              <div className="flex-1 min-h-[300px]">
                <Editor
                  height="100%"
                  language={selectedLanguage}
                  value={editorCode}
                  theme="vs-dark"
                  onChange={(val) => setEditorCode(val || "")}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    fontFamily: "var(--font-mono, monospace)"
                  }}
                />
              </div>

              {/* Console Output */}
              <div className="h-44 bg-[#0a0e1a] border-t border-slate-800 flex flex-col font-mono">
                <div className="px-4 py-1.5 bg-[#0c101d] border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
                  <span>Console Terminal Output</span>
                  <Button
                    onClick={() => { setConsoleOutput(""); setConsoleError(""); }}
                    size="xs"
                    className="bg-transparent hover:bg-slate-800 text-slate-400"
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex-1 p-3.5 text-xs overflow-y-auto select-text scrollbar-thin">
                  {consoleError ? (
                    <pre className="text-rose-400 font-bold whitespace-pre-wrap">{consoleError}</pre>
                  ) : (
                    <pre className="text-slate-300 whitespace-pre-wrap">{consoleOutput || "No stdout. Click \"Run Code\" to run."}</pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM WHITEBOARD */}
          {activeTab === "whiteboard" && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Whiteboard toolbar */}
              <div className="px-4 py-2 bg-[#090d16] border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  {/* Tools */}
                  <Button
                    size="xs"
                    variant={whiteboardTool === "pencil" ? "default" : "outline"}
                    onClick={() => setWhiteboardTool("pencil")}
                    className="h-7 px-2.5 flex items-center gap-1 text-xs"
                  >
                    <PenTool size={12} /> Pencil
                  </Button>
                  <Button
                    size="xs"
                    variant={whiteboardTool === "rect" ? "default" : "outline"}
                    onClick={() => setWhiteboardTool("rect")}
                    className="h-7 px-2.5 flex items-center gap-1 text-xs"
                  >
                    <Square size={12} /> Rectangle
                  </Button>
                  <Button
                    size="xs"
                    variant={whiteboardTool === "circle" ? "default" : "outline"}
                    onClick={() => setWhiteboardTool("circle")}
                    className="h-7 px-2.5 flex items-center gap-1 text-xs"
                  >
                    <Circle size={12} /> Circle
                  </Button>
                  <Button
                    size="xs"
                    variant={whiteboardTool === "text" ? "default" : "outline"}
                    onClick={() => setWhiteboardTool("text")}
                    className="h-7 px-2.5 flex items-center gap-1 text-xs"
                  >
                    <Type size={12} /> Text
                  </Button>
                </div>

                {/* Text Tool Inputs */}
                {whiteboardTool === "text" && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Type text to place..."
                      value={whiteboardText}
                      onChange={(e) => setWhiteboardText(e.target.value)}
                      className="bg-[#172237] border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 w-44"
                    />
                  </div>
                )}

                {/* Colors & Actions */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 items-center bg-slate-900 border border-slate-800 rounded p-0.5">
                    {["#3b82f6", "#ef4444", "#10b981", "#eab308", "#ffffff"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setStrokeColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-4 h-4 rounded-full border ${strokeColor === c ? "border-white scale-110" : "border-transparent"}`}
                      />
                    ))}
                  </div>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleUndo}
                    className="h-7 px-2 border-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    <Undo2 size={12} />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleClearCanvas}
                    className="h-7 px-2 border-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    <Trash2 size={12} />
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleDownloadWhiteboard}
                    className="h-7 px-2 bg-blue-600 text-white"
                  >
                    <Download size={12} /> Export
                  </Button>
                </div>
              </div>

              {/* Drawing Area */}
              <div className="flex-1 overflow-auto bg-[#0a0f1d] flex items-center justify-center p-4">
                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={600}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="bg-[#0b101f] border border-slate-800/80 rounded-xl shadow-inner cursor-crosshair"
                />
              </div>
            </div>
          )}

          {/* TAB 3: AI DIAGNOSTICS */}
          {activeTab === "feedback" && (
            <div className="flex-1 p-6 overflow-y-auto bg-[#080c18] space-y-6">
              {!evaluation ? (
                <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                  <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-2xl mb-4">
                    <Sparkles className="h-10 w-10 text-blue-500 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold">Diagnostics Awaiting Submission</h3>
                  <p className="text-sm text-slate-400 max-w-md mt-2">
                    Complete your interview mock test and click "Submit Test" to trigger RAG-powered automated evaluation and detailed diagnostics reports.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Score overview header */}
                  <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Award className="text-blue-500" /> Evaluation Diagnostics Report
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">
                        Here is the deep architectural and conceptual diagnostics computed by Gemini.
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <span className="text-xs uppercase text-slate-500 font-bold block">Overall Score</span>
                        <span className="text-5xl font-black text-blue-400 font-mono">
                          {evaluation.score}
                        </span>
                        <span className="text-slate-500 font-bold">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Graph and categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Radar chart */}
                    <div className="bg-[#0f1526] border border-slate-800 rounded-xl p-5 flex flex-col items-center">
                      <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4 w-full text-left">
                        Domain Proficiency Map
                      </h3>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
                            <Radar name="Proficiency" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Breakdown details */}
                    <div className="bg-[#0f1526] border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                        Diagnostics Metrics Breakdown
                      </h3>
                      <div className="space-y-3.5">
                        {[
                          { label: "Correctness", val: evaluation.categories.correctness, color: "bg-blue-600" },
                          { label: "Execution Efficiency", val: evaluation.categories.efficiency, color: "bg-indigo-600" },
                          { label: "Communication Flow", val: evaluation.categories.communication, color: "bg-purple-600" },
                          { label: "System Design", val: evaluation.categories.design, color: "bg-pink-600" }
                        ].map((m) => (
                          <div key={m.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-300">{m.label}</span>
                              <span className="text-slate-200">{m.val}/100</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className={`${m.color} h-full`} style={{ width: `${m.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Analogy module */}
                  <div className="bg-gradient-to-r from-indigo-950/20 to-blue-950/20 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Sparkles size={120} className="text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5 mb-2.5">
                      <Sparkles size={16} /> Analogy-Based Conceptual Feedback
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed font-sans">
                      {evaluation.analogyFeedback}
                    </p>
                  </div>

                  {/* Detailed strengths & improvements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0f1526] border border-slate-800 rounded-xl p-5">
                      <h3 className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-3 flex items-center gap-1">
                        <CheckCircle size={14} /> Observed Strengths
                      </h3>
                      <ul className="text-xs text-slate-300 space-y-2">
                        {evaluation.strengths.map((s, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#0f1526] border border-slate-800 rounded-xl p-5">
                      <h3 className="text-xs uppercase font-bold text-rose-400 tracking-wider mb-3 flex items-center gap-1">
                        <AlertTriangle size={14} /> Recommended Improvements
                      </h3>
                      <ul className="text-xs text-slate-300 space-y-2">
                        {evaluation.improvements.map((imp, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Detailed technical review */}
                  <div className="bg-[#0f1526] border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 flex items-center gap-1">
                      <BookOpen size={14} /> Comprehensive Technical Review
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {evaluation.detailedReview}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LEADERBOARD */}
          {activeTab === "leaderboard" && (
            <div className="flex-1 p-6 overflow-y-auto bg-[#080c18]">
              <div className="max-w-xl mx-auto bg-[#0f1526] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/20 to-indigo-950/20">
                  <div>
                    <h3 className="font-bold flex items-center gap-1.5">
                      <Trophy size={16} className="text-amber-500 animate-bounce" /> PrepWise Global Event Leaderboard
                    </h3>
                    <p className="text-xs text-slate-400">Weekly platform mock interview rankings</p>
                  </div>
                  <TrendingUp size={16} className="text-blue-500" />
                </div>

                <div className="divide-y divide-slate-800">
                  {leaderboard.map((item, index) => {
                    const isUser = item.name.includes("You");
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                          isUser ? "bg-blue-950/20 text-blue-300 font-semibold" : "hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              item.rank === 1
                                ? "bg-amber-500 text-[#0f1526]"
                                : item.rank === 2
                                ? "bg-slate-300 text-[#0f1526]"
                                : item.rank === 3
                                ? "bg-amber-700 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {item.rank}
                          </span>
                          <span className="text-sm flex items-center gap-1">
                            <User size={12} className="opacity-60" /> {item.name}
                          </span>
                        </div>

                        <div className="flex gap-4 items-center">
                          <span className="text-xs text-slate-400 font-mono">{item.speed}</span>
                          <span className="text-sm font-bold font-mono text-blue-400">{item.score}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

