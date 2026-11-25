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
  CheckCircle2,
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
  ExternalLink,
  Loader2,
  Flag,
  CircleHelp
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
import { getQuestionAnswer, getQuestionTips } from "@/lib/actions/mock-test.action";
import {
  finishInterviewModeSessionAction,
} from "@/lib/actions/interview-session.action";
import { SegmentBar } from "@/components/ui/ProgressSteps";
import { TypingDots, DotsGridWave, BouncingDots } from "@/components/ui/LoadingAnimations";
import { ParticleBurst } from "@/components/ui/MicroInteractions";

const INITIAL_CODE_TEMPLATES = {
  javascript: `// Write your JavaScript solution here\nfunction solve(input) {\n  console.log("Hello PrepWise JS");\n  return true;\n}\n\nsolve();`,
  python: `# Write your Python solution here\ndef solve():\n    print("Hello PrepWise Python")\n    return True\n\nsolve()`,
  cpp: `// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello PrepWise C++" << endl;\n    return 0;\n}`,
  java: `// Write your Java solution here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello PrepWise Java");\n    }\n}`
};

const WORKSPACE_TOUR_STEPS = [
  {
    target: "timer",
    title: "Keep an eye on time",
    description: "The 45-minute timer is here. Pause it if you need a short break.",
  },
  {
    target: "review",
    title: "Mark questions for review",
    description: "Flag a question to find it quickly when you review your work.",
  },
  {
    target: "navigation",
    title: "Move through the test",
    description: "Use the arrows to go back or move forward. Submit your current answer to unlock the next question.",
  },
  {
    target: "palette",
    title: "Use the whiteboard palette",
    description: "Choose a drawing tool and color to sketch your approach on the whiteboard.",
  },
];

export default function MockTestWorkspace({
  filters,
  questions,
  questionCount = questions.length,
  isLoadingQuestions = false,
  sessionId,
  onResumeQuestions,
  onClose,
  onSessionComplete,
}) {
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
  const [markedForReviewByIndex, setMarkedForReviewByIndex] = useState({});
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

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

  // Expected Answer / Tips — keyed by question index so results persist
  // when navigating between questions and each question fetches independently.
  const [answersByIndex, setAnswersByIndex] = useState({}); // { [index]: string }
  const [candidateAnswersByIndex, setCandidateAnswersByIndex] = useState({});
  const [submittedAnswersByIndex, setSubmittedAnswersByIndex] = useState({});
  const [codeByIndex, setCodeByIndex] = useState({});
  const [transcriptByIndex, setTranscriptByIndex] = useState({});
  const [whiteboardByIndex, setWhiteboardByIndex] = useState({});
  const [languageByIndex, setLanguageByIndex] = useState({});
  const [tipsByIndex, setTipsByIndex] = useState({}); // { [index]: string[] }
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const [tipsError, setTipsError] = useState(false);

  // Final evaluation feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const onCloseRef = useRef(onClose);
  const hasHandledRemoteCloseRef = useRef(false);

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

  const currentAnswer = answersByIndex[currentQuestionIndex];
  const currentTips = tipsByIndex[currentQuestionIndex];
  const submittedAnswerCount = questions.filter((_, index) => submittedAnswersByIndex[index]).length;
  const allAnswersSubmitted = !isLoadingQuestions &&
    questions.length === questionCount &&
    questionCount > 0 &&
    submittedAnswerCount === questionCount;
  const activeTutorialStep = isTutorialOpen ? WORKSPACE_TOUR_STEPS[tutorialStep] : null;

  useEffect(() => {
    if (window.sessionStorage.getItem("mock-test-workspace-tour-complete") !== "true") {
      setIsTutorialOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!activeTutorialStep) return undefined;
    if (activeTutorialStep.target === "palette" && activeTab !== "whiteboard") {
      setActiveTab("whiteboard");
      return undefined;
    }

    const target = document.querySelector(`[data-tour-target="${activeTutorialStep.target}"]`);
    if (!target) return undefined;

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    target.classList.add("outline", "outline-2", "outline-cyan-400", "outline-offset-4");
    return () => {
      target.classList.remove("outline", "outline-2", "outline-cyan-400", "outline-offset-4");
    };
  }, [activeTutorialStep, activeTab]);

  const closeTutorial = () => {
    setIsTutorialOpen(false);
    setActiveTab("code");
    window.sessionStorage.setItem("mock-test-workspace-tour-complete", "true");
  };

  const startTutorial = () => {
    setTutorialStep(0);
    setIsTutorialOpen(true);
  };

  const moveTutorialForward = () => {
    if (tutorialStep === WORKSPACE_TOUR_STEPS.length - 1) {
      closeTutorial();
      return;
    }
    setTutorialStep((current) => current + 1);
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!sessionId || evaluation) return undefined;
    let active = true;
    let sessionActive = true;
    let checking = false;
    let intervalId;

    const checkSessionStatus = async () => {
      if (!active || !sessionActive || checking) return;
      checking = true;
      try {
        const response = await fetch(
          `/api/interview-sessions?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch session status");
        if (!active) return;

        if (data.session && data.session.status !== "active") {
          sessionActive = false;
          clearInterval(intervalId);

          if (
            data.session.status === "abandoned" &&
            !hasHandledRemoteCloseRef.current
          ) {
            hasHandledRemoteCloseRef.current = true;
            toast.warning("This mock test was ended from another device.");
            await onCloseRef.current?.();
          } else if (
            data.session.status === "completed" &&
            data.session.result?.evaluation
          ) {
            setEvaluation(data.session.result.evaluation);
            setIsTimerRunning(false);
          }
        }
      } catch (error) {
        if (active) console.error("Failed to check mock test session status:", error);
      } finally {
        checking = false;
      }
    };

    checkSessionStatus();
    intervalId = setInterval(() => {
      if (document.visibilityState === "visible") checkSessionStatus();
    }, 60000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [evaluation, sessionId]);

  const handleLanguageChange = (language) => {
    const starterCode = INITIAL_CODE_TEMPLATES[language] || "";
    markCurrentAnswerIncomplete();
    setSelectedLanguage(language);
    setLanguageByIndex((previous) => ({
      ...previous,
      [currentQuestionIndex]: language,
    }));
    setEditorCode(starterCode);
    setCodeByIndex((previous) => ({
      ...previous,
      [currentQuestionIndex]: starterCode,
    }));
  };

  const handleQuestionChange = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= questions.length || nextIndex === currentQuestionIndex) {
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setCodeByIndex((previous) => ({ ...previous, [currentQuestionIndex]: editorCode }));
    setTranscriptByIndex((previous) => ({ ...previous, [currentQuestionIndex]: transcript }));
    setWhiteboardByIndex((previous) => ({ ...previous, [currentQuestionIndex]: shapes }));
    setLanguageByIndex((previous) => ({ ...previous, [currentQuestionIndex]: selectedLanguage }));

    const nextLanguage = languageByIndex[nextIndex] || selectedLanguage;
    setCurrentQuestionIndex(nextIndex);
    setSelectedLanguage(nextLanguage);
    setEditorCode(codeByIndex[nextIndex] ?? INITIAL_CODE_TEMPLATES[nextLanguage] ?? "");
    setTranscript(transcriptByIndex[nextIndex] || "");
    setShapes(whiteboardByIndex[nextIndex] || []);
  };

  const buildQuestionsAndAnswers = () => questions.map((question, index) => {
    const code = index === currentQuestionIndex
      ? editorCode
      : codeByIndex[index] || "";
    const answerText = candidateAnswersByIndex[index] || "";
    const answerTranscript = index === currentQuestionIndex
      ? transcript
      : transcriptByIndex[index] || "";
    const whiteboard = index === currentQuestionIndex
      ? shapes
      : whiteboardByIndex[index] || [];
    const language = index === currentQuestionIndex
      ? selectedLanguage
      : languageByIndex[index] || selectedLanguage;

    return {
      questionNumber: index + 1,
      question: question.question || question.title || "",
      difficulty: question.difficulty || filters.difficulty,
      answer: {
        text: answerText,
        transcript: answerTranscript,
        code,
        language,
        whiteboard,
      },
    };
  });

  const hasAnswerContent = (submission) => {
    const starterCode = INITIAL_CODE_TEMPLATES[submission.answer.language] || "";
    return Boolean(
      submission.answer.text.trim() ||
      submission.answer.transcript.trim() ||
      submission.answer.whiteboard.length ||
      (submission.answer.code.trim() && submission.answer.code.trim() !== starterCode.trim())
    );
  };

  const markCurrentAnswerIncomplete = () => {
    setSubmittedAnswersByIndex((previous) => {
      if (!previous[currentQuestionIndex]) return previous;
      const next = { ...previous };
      delete next[currentQuestionIndex];
      return next;
    });
  };

  const handleEditorChange = (value) => {
    const code = value || "";
    markCurrentAnswerIncomplete();
    setEditorCode(code);
    setCodeByIndex((previous) => ({ ...previous, [currentQuestionIndex]: code }));
  };

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
            markCurrentAnswerIncomplete();
            setTranscript((prev) => prev + finalTranscript);
          }
        };

        rec.onerror = (e) => {
          console.error("Speech recognition error:", e.error, e.message);
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setIsRecording(false);
            toast.error("Microphone permission denied or not available. Please allow access in browser settings.");
          } else if (e.error === "network") {
            setIsRecording(false);
            toast.error("Network error during speech recognition. Please check your connection.");
          }
        };

        rec.onend = () => {
          // Only attempt restart if it was not stopped due to a fatal error
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
      toast.error("Web Speech API is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success("Stopped voice recording.");
    } else {
      markCurrentAnswerIncomplete();
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
      markCurrentAnswerIncomplete();
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
      markCurrentAnswerIncomplete();
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
      markCurrentAnswerIncomplete();
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
    markCurrentAnswerIncomplete();
    setShapes((prev) => prev.slice(0, -1));
  };

  const handleClearCanvas = () => {
    markCurrentAnswerIncomplete();
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
  // Expected Answer / Tips — fetched on demand per question
  // ----------------------------------------------------
  const handleShowExpectedAnswer = async () => {
    if (answersByIndex[currentQuestionIndex] || loadingAnswer) return;
    setLoadingAnswer(true);
    setAnswerError(false);
    try {
      const res = await getQuestionAnswer({
        question: currentQuestion.question,
        company: filters.company,
        role: filters.role,
        difficulty: filters.difficulty,
      });
      if (res.success) {
        setAnswersByIndex((prev) => ({ ...prev, [currentQuestionIndex]: res.answer }));
      } else {
        setAnswerError(true);
        toast.error("Failed to generate expected answer.");
      }
    } catch (err) {
      console.error(err);
      setAnswerError(true);
      toast.error("AI Assistant connection error.");
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleShowTips = async () => {
    if (tipsByIndex[currentQuestionIndex] || loadingTips) return;
    setLoadingTips(true);
    setTipsError(false);
    try {
      const res = await getQuestionTips({
        question: currentQuestion.question,
        company: filters.company,
        role: filters.role,
        difficulty: filters.difficulty,
      });
      if (res.success) {
        setTipsByIndex((prev) => ({ ...prev, [currentQuestionIndex]: res.tips }));
      } else {
        setTipsError(true);
        toast.error("Failed to generate tips.");
      }
    } catch (err) {
      console.error(err);
      setTipsError(true);
      toast.error("AI Assistant connection error.");
    } finally {
      setLoadingTips(false);
    }
  };

  const handleSubmitAnswer = () => {
    const questionIndex = currentQuestionIndex;
    if (isSubmitting || submittedAnswersByIndex[questionIndex]) return;

    const submission = buildQuestionsAndAnswers()[questionIndex];
    if (!hasAnswerContent(submission)) {
      toast.error("Add an answer, code solution, transcript, or whiteboard work before submitting.");
      return;
    }

    setSubmittedAnswersByIndex((previous) => ({ ...previous, [questionIndex]: true }));
    toast.success(`Answer ${questionIndex + 1} submitted`);
  };

  // ----------------------------------------------------
  // Structured AI Diagnostics Evaluation Submission
  // ----------------------------------------------------
  const handleSubmitTest = async () => {
    if (!allAnswersSubmitted) {
      setIsTimerRunning(false);
      toast.error(
        isLoadingQuestions
          ? "Please wait for all questions to finish loading before submitting."
          : `Submit an answer for every question first (${submittedAnswerCount}/${questionCount} submitted).`
      );
      return;
    }

    setIsTimerRunning(false);
    setIsSubmitting(true);
    setActiveTab("feedback");
    toast.loading("Analyzing your submission...", { id: "eval-toast" });

    try {
      const questionsAndAnswers = buildQuestionsAndAnswers();
      const result = await evaluateMockTest({
        submissions: questionsAndAnswers.map((submission) => ({
          ...submission,
          whiteboardSummary: submission.answer.whiteboard
            .map((shape, index) => `Shape ${index + 1}: ${shape.type} (color: ${shape.color})`)
            .join(", ") || "No whiteboard drawings submitted.",
        })),
        company: filters.company,
        role: filters.role,
      });

      if (result.success) {
        setEvaluation(result.evaluation);
        const savedSession = await finishInterviewModeSessionAction({
          sessionId,
          result: {
            company: filters.company,
            role: filters.role,
            questionsAndAnswers,
            evaluation: result.evaluation,
          },
        });
        if (savedSession.success) {
          toast.success("Evaluation complete and saved to your account.", { id: "eval-toast" });
          await onSessionComplete?.();
        } else {
          toast.error(
            savedSession.error || "Evaluation completed, but the result could not be saved.",
            { id: "eval-toast" }
          );
        }
        
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
          <div
            data-tour-target="timer"
            className="flex items-center gap-2.5 bg-[#172237] px-4 py-1.5 rounded-lg border border-slate-700 shadow-inner"
          >
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
            variant="outline"
            onClick={startTutorial}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            title="Take the workspace tour"
          >
            <CircleHelp size={15} /> Tour
          </Button>

          <Button
            onClick={handleSubmitTest}
            disabled={isSubmitting || !allAnswersSubmitted}
            variant="aurora"
            className="text-white font-bold flex items-center gap-1.5 px-4 relative overflow-visible shadow-lg"
            title={
              isLoadingQuestions
                ? "Wait for question generation to finish"
                : !allAnswersSubmitted
                ? "Submit every question's answer first"
                : "Evaluate all submitted answers"
            }
          >
            <ParticleBurst active={isSubmitting} count={8} color="#6366f1" />
            {isSubmitting ? (
              <>
                <BouncingDots size={5} color="#ffffff" />
                <span className="ml-1.5">Evaluating...</span>
              </>
            ) : (
              <>
                <Send size={16} /> Submit Test ({submittedAnswerCount}/{questionCount})
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => onClose?.({ questionsAndAnswers: buildQuestionsAndAnswers() })}
            className="border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            Exit Workspace
          </Button>
        </div>
      </header>

      {isLoadingQuestions ? (
        <div className="border-b border-blue-900/60 bg-blue-950/50 px-6 py-2 text-center text-xs text-blue-200">
          More questions are being prepared in the background. You can continue with the questions already loaded.
        </div>
      ) : questions.length < questionCount ? (
        <div className="flex items-center justify-center gap-3 border-b border-amber-900/60 bg-amber-950/40 px-6 py-2 text-xs text-amber-200">
          Question loading paused. Resume it to unlock the rest of the test.
          <Button size="xs" onClick={onResumeQuestions} className="bg-amber-700 text-white hover:bg-amber-600">
            Resume question loading
          </Button>
        </div>
      ) : null}

      {/* WORKSPACE CONTENT */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: QUESTION & AI NUDGES */}
        <section className="w-[32%] border-r border-slate-800 bg-[#0a0e1a] p-5 flex flex-col gap-5 overflow-y-auto">
          {/* Question card */}
          <div className="bg-[#0e1526] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Question {currentQuestionIndex + 1} of {questionCount}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {submittedAnswersByIndex[currentQuestionIndex] && (
                  <span className="rounded-full border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Submitted
                  </span>
                )}
                <Button
                  data-tour-target="review"
                  size="xs"
                  variant="outline"
                  aria-pressed={Boolean(markedForReviewByIndex[currentQuestionIndex])}
                  onClick={() => setMarkedForReviewByIndex((previous) => ({
                    ...previous,
                    [currentQuestionIndex]: !previous[currentQuestionIndex],
                  }))}
                  className={`h-7 px-2 text-[10px] ${
                    markedForReviewByIndex[currentQuestionIndex]
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                      : "border-slate-800 text-slate-400"
                  }`}
                >
                  <Flag size={12} />
                  {markedForReviewByIndex[currentQuestionIndex] ? "Marked" : "Mark for review"}
                </Button>
              </div>
              <div data-tour-target="navigation" className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleQuestionChange(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="h-7 w-7 border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleQuestionChange(currentQuestionIndex + 1)}
                  disabled={
                    currentQuestionIndex === questions.length - 1 ||
                    !submittedAnswersByIndex[currentQuestionIndex]
                  }
                  className="h-7 w-7 border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            {/* Segment Progress Bar */}
            <div className="my-1">
              <SegmentBar
                totalSegments={questionCount || 1}
                currentSegment={currentQuestionIndex + 1}
                completedSegments={Array.from({ length: questionCount }, (_, index) =>
                  Boolean(submittedAnswersByIndex[index])
                )}
              />
            </div>

            <h3 className="text-base font-bold text-slate-100 leading-snug">
              {currentQuestion.question || currentQuestion.title}
            </h3>

            {/* Expected Answer / Tips buttons — fetch from AI only on click */}
            <div className="flex flex-wrap gap-2 mt-1">
              <Button
                size="xs"
                onClick={handleShowExpectedAnswer}
                disabled={loadingAnswer}
                className="h-7 px-2.5 text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
              >
                {loadingAnswer ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Expected Answer
              </Button>
              <Button
                size="xs"
                onClick={handleShowTips}
                disabled={loadingTips}
                className="h-7 px-2.5 text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
              >
                {loadingTips ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Lightbulb size={12} className="text-amber-500" />
                )}
                Tips
              </Button>
            </div>

            {/* Expected Answer result panel */}
            {(loadingAnswer || currentAnswer || answerError) && (
              <div className="mt-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 size={14} className="text-blue-500" /> Expected Answer
                </h4>
                {loadingAnswer && (
                  <p className="text-xs text-slate-500 italic">Generating answer…</p>
                )}
                {answerError && !loadingAnswer && (
                  <p className="text-xs text-rose-400">Couldn't generate an answer. Try again.</p>
                )}
                {currentAnswer && (
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                    {currentAnswer}
                  </p>
                )}
              </div>
            )}

            {/* Tips result panel */}
            {(loadingTips || currentTips || tipsError) && (
              <div className="mt-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Lightbulb size={14} className="text-amber-500" /> Key Considerations
                </h4>
                {loadingTips && (
                  <p className="text-xs text-slate-500 italic">Generating tips…</p>
                )}
                {tipsError && !loadingTips && (
                  <p className="text-xs text-rose-400">Couldn't generate tips. Try again.</p>
                )}
                {currentTips && currentTips.length > 0 && (
                  <ul className="text-xs text-slate-400 space-y-1 pl-1">
                    {currentTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#0e1526] border border-slate-800 rounded-xl p-4">
            <label
              htmlFor="mock-test-answer"
              className="mb-2 block text-xs font-bold text-slate-300"
            >
              Your answer for this question
            </label>
            <textarea
              id="mock-test-answer"
              value={candidateAnswersByIndex[currentQuestionIndex] || ""}
              onChange={(event) => {
                const answer = event.target.value;
                markCurrentAnswerIncomplete();
                setCandidateAnswersByIndex((previous) => ({
                  ...previous,
                  [currentQuestionIndex]: answer,
                }));
              }}
              placeholder="Write your answer here..."
              className="min-h-24 w-full resize-y rounded-lg border border-slate-800 bg-[#090d16] p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <Button
              onClick={handleSubmitAnswer}
              disabled={submittedAnswersByIndex[currentQuestionIndex] || isSubmitting}
              className="mt-3 flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500"
            >
              {submittedAnswersByIndex[currentQuestionIndex]
                ? <><CheckCircle2 size={14} /> Answer Submitted</>
                : <><Send size={14} /> Submit Answer</>}
            </Button>
            <p className="mt-2 text-xs text-slate-500">
              Evaluation runs once after every question has been submitted.
            </p>
            {submittedAnswersByIndex[currentQuestionIndex] &&
              currentQuestionIndex < questions.length - 1 && (
                <Button
                  onClick={() => handleQuestionChange(currentQuestionIndex + 1)}
                  className="mt-3 flex w-full items-center justify-center gap-2 bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  Next Question <ChevronRight size={16} />
                </Button>
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
                    onChange={(e) => handleLanguageChange(e.target.value)}
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
                  onChange={handleEditorChange}
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
                  <div
                    data-tour-target="palette"
                    className="flex gap-1 items-center bg-slate-900 border border-slate-800 rounded p-0.5"
                  >
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
                    Submit each answer, then click "Submit Test" for one AI evaluation of the complete interview.
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
                        Here is the deep architectural and conceptual diagnostics computed by AI.
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

      {activeTutorialStep && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="mock-test-tour-title"
          className="fixed bottom-5 right-5 z-[70] w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-cyan-500/30 bg-[#101a2d] p-5 shadow-2xl shadow-black/40"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              Workspace tour · {tutorialStep + 1}/{WORKSPACE_TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={closeTutorial}
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              Skip
            </button>
          </div>
          <h3 id="mock-test-tour-title" className="text-base font-bold text-white">
            {activeTutorialStep.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {activeTutorialStep.description}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1" aria-hidden="true">
              {WORKSPACE_TOUR_STEPS.map((step, index) => (
                <span
                  key={step.target}
                  className={`h-1.5 w-5 rounded-full ${index === tutorialStep ? "bg-cyan-400" : "bg-slate-700"}`}
                />
              ))}
            </div>
            <Button onClick={moveTutorialForward} size="sm" className="bg-cyan-600 text-white hover:bg-cyan-500">
              {tutorialStep === WORKSPACE_TOUR_STEPS.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}