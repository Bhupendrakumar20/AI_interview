"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  X,
  Play,
  Save,
  LogOut,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createFeedback } from "@/lib/actions/general.action";

const InterviewRunner = ({ interview, user, existingFeedback }) => {
  const router = useRouter();

  const questions = Array.isArray(interview.questions)
    ? interview.questions
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(questions.map(() => ""));
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSubmitting, startTransition] = useTransition();
  const [showExitModal, setShowExitModal] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const answerTextAreaRef = useRef(null);

  // ---------- Camera setup ----------
  const enableCamera = async () => {
    try {
      // Guard: browser + mediaDevices support
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        toast.error(
          "Camera/microphone not supported in this environment or blocked by the browser."
        );
        return;
      }

      // already active
      if (mediaStreamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true; // autoplay ko allow karne ke liye

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.log("Video play error:", err);
          });
        }
      }

      setIsCameraOn(true);
      setIsMicOn(true);
    } catch (err) {
      console.error("enableCamera error:", err);
      toast.error("Unable to access camera/microphone. Check permissions.");
    }
  };

  const disableCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  const toggleMic = () => {
    if (!mediaStreamRef.current) return;
    const audioTracks = mediaStreamRef.current.getAudioTracks();
    audioTracks.forEach((t) => {
      t.enabled = !t.enabled;
      setIsMicOn(t.enabled);
    });
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // ---------- Text-to-Speech ----------
  const speakQuestion = () => {
    if (typeof window === "undefined") return;
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }

    const question = questions[currentIndex];
    if (!question) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(question);
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  // ---------- Voice-to-Text ----------
  const startVoiceToText = () => {
    if (typeof window === "undefined") {
      console.error("❌ [Speech Recognition] Window not available - SSR environment");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("❌ [Speech Recognition] Not supported in this browser");
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    console.log("🎤 [Speech Recognition] Initializing...");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("✅ [Speech Recognition] Started");
      toast.success("Listening... Speak clearly into your microphone");
    };

    recognition.onresult = (event) => {
      console.log(`📝 [Speech Recognition] Got ${event.results.length} results`);
      
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        console.log(`  Result ${i}: "${transcript}" (confidence: ${(confidence * 100).toFixed(2)}%)`);
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        }
      }

      if (finalTranscript.trim()) {
        console.log(`✅ Final transcript: "${finalTranscript}"`);
        
        setAnswers((prev) => {
          const copy = [...prev];
          const newAnswer = (copy[currentIndex] || "") + " " + finalTranscript;
          copy[currentIndex] = newAnswer;
          console.log(`📌 Answer updated for Q${currentIndex + 1}: "${newAnswer}"`);
          return copy;
        });

        if (answerTextAreaRef.current) {
          answerTextAreaRef.current.scrollTop =
            answerTextAreaRef.current.scrollHeight;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("❌ [Speech Recognition Error]:", event.error);
      
      let errorMsg = "Speech recognition error";
      switch (event.error) {
        case "no-speech":
          errorMsg = "No speech detected. Please check your microphone and try again.";
          break;
        case "audio-capture":
          errorMsg = "No microphone found or permission denied. Check browser settings.";
          break;
        case "network":
          errorMsg = "Network error. Check your internet connection.";
          break;
        case "not-allowed":
          errorMsg = "Microphone permission denied. Allow access in browser settings.";
          break;
        default:
          errorMsg = `Speech error: ${event.error}`;
      }
      
      toast.error(errorMsg);
      setIsRecordingVoice(false);
    };

    recognition.onend = () => {
      console.log("⏹️ [Speech Recognition] Stopped");
      setIsRecordingVoice(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecordingVoice(true);
      console.log("✅ [Speech Recognition] Started successfully");
    } catch (err) {
      console.error("❌ [Speech Recognition] Failed to start:", err);
      toast.error("Failed to start speech recognition");
      setIsRecordingVoice(false);
    }
  };

  const stopVoiceToText = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecordingVoice(false);
  };

  const toggleVoiceToText = () => {
    if (isRecordingVoice) {
      stopVoiceToText();
    } else {
      startVoiceToText();
    }
  };

  // ---------- Answer handlers ----------
  const handleAnswerChange = (e) => {
    const value = e.target.value;
    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = value;
      return copy;
    });
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      if (answerTextAreaRef.current) {
        answerTextAreaRef.current.focus();
      }
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      if (answerTextAreaRef.current) {
        answerTextAreaRef.current.focus();
      }
    }
  };

  const cleanupMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Recognition stop error:", e);
      }
      recognitionRef.current = null;
    }
    setIsCameraOn(false);
    setIsRecordingVoice(false);
    setIsSpeaking(false);
  };

  const handleExitWithoutSave = () => {
    cleanupMedia();
    setShowExitModal(false);
    toast.info("Exited interview without saving.");
    router.push("/interview");
    router.refresh();
  };

  // ---------- Submit & Feedback ----------
  const handleFinish = (isEarlyExit = false) => {
    if (!questions.length) {
      toast.error("No questions available for this interview.");
      return;
    }

    const totalQuestions = questions.length;
    const answeredCount = answers.filter((a) => a && a.trim().length > 0).length;

    // If candidate clicks Exit & Save without answering any questions, exit cleanly
    if (isEarlyExit && answeredCount === 0) {
      cleanupMedia();
      setShowExitModal(false);
      toast.info("Exited interview. No answers were saved.");
      router.push("/interview");
      router.refresh();
      return;
    }

    if (answeredCount === 0) {
      toast.error("Please answer at least one question before finishing.");
      return;
    }

    const isCompleted = !isEarlyExit && answeredCount === totalQuestions;
    const quitAtQuestion = isCompleted ? null : currentIndex + 1;

    console.log("🏁 [Interview] Finishing interview...");
    console.log(`📊 Total questions: ${totalQuestions}`);
    console.log(`✅ Answered: ${answeredCount}`);
    console.log(`🚪 Is early exit: ${isEarlyExit}`);
    console.log(`🎯 Is completed: ${isCompleted}`);
    console.log(`📍 Quit at question: ${quitAtQuestion}`);

    startTransition(async () => {
      try {
        const transcript = [];

        questions.forEach((q, idx) => {
          transcript.push({
            role: "system",
            content: `Question ${idx + 1}: ${q}`,
          });

          const answerText = answers[idx]?.trim();
          if (answerText) {
            transcript.push({
              role: "user",
              content: answerText,
            });
          } else if (isEarlyExit && idx >= currentIndex) {
            transcript.push({
              role: "user",
              content: "[Candidate exited interview early - Question not reached]",
            });
          } else {
            transcript.push({
              role: "user",
              content: "[No answer provided]",
            });
          }
        });

        console.log("📝 [Interview] Calling createFeedback with:");
        console.log(`  - interviewId: ${interview.id}`);
        console.log(`  - userId: ${user.id}`);
        console.log(`  - isCompleted: ${isCompleted}`);
        console.log(`  - quitAtQuestion: ${quitAtQuestion}`);
        console.log(`  - answeredCount: ${answeredCount}`);
        console.log(`  - totalQuestions: ${totalQuestions}`);

        const result = await createFeedback({
          interviewId: interview.id,
          userId: user.id,
          transcript,
          feedbackId: existingFeedback?.id,
          isCompleted,
          quitAtQuestion,
          answeredCount,
          totalQuestions,
        });

        console.log("🎯 [Interview] Feedback result:", result);

        cleanupMedia();
        setShowExitModal(false);

        if (result?.success && result.feedbackId) {
          console.log(`✅ [Interview] Feedback saved with ID: ${result.feedbackId}`);
          if (isCompleted) {
            toast.success("Interview completed! Check your feedback card.");
          } else {
            toast.success(
              `Progress saved! Scored up to Question ${quitAtQuestion} (${answeredCount}/${totalQuestions} answered).`
            );
          }
          router.push(`/interview`);
          router.refresh();
        } else {
          console.error("❌ [Interview] Feedback generation failed:", result);
          toast.error(result?.error || "Failed to save feedback.");
          router.push("/interview");
          router.refresh();
        }
      } catch (err) {
        console.error("❌ [Interview] Exception during feedback generation:", err);
        toast.error("Something went wrong while finishing interview.");
      }
    });
  };

  const currentQuestion = questions[currentIndex] || "";
  const answeredCount = answers.filter((a) => a && a.trim().length > 0).length;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showExitModal && !isSubmitting) {
        setShowExitModal(false);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showExitModal, isSubmitting]);

  return (
    <div className="flex flex-col gap-6">
      {/* top info */}
      <section className="blue-gradient-dark rounded-3xl px-6 py-5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">
              {interview.role} Interview
            </h2>
            <p className="text-sm text-light-100">
              Question {currentIndex + 1} of {questions.length || 1}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {existingFeedback && (
              <p className="text-xs text-light-100 max-w-xs text-right hidden sm:block">
                You&apos;ve already completed this interview. Finishing again will
                update your feedback report.
              </p>
            )}
            <Button
              type="button"
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-xs px-3.5 py-1.5 h-auto rounded-full flex items-center gap-1.5 transition-all"
              onClick={() => setShowExitModal(true)}
              disabled={isSubmitting}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Interview</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        {/* LEFT: Question + Answer */}
        <div className="flex flex-col gap-4">
          {/* Question card */}
          <div className="card-border w-full">
            <div className="card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h3>
                  Question {currentIndex + 1} of {questions.length}
                </h3>
                <button
                  type="button"
                  onClick={speakQuestion}
                  className="rounded-full border border-input px-3 py-1 text-sm flex items-center gap-1 hover:bg-dark-200"
                >
                  {isSpeaking ? "Playing..." : "Read aloud"}
                </button>
              </div>
              <p className="text-light-100 text-sm md:text-base leading-relaxed">
                {currentQuestion}
              </p>
            </div>
          </div>

          {/* Answer card */}
          <div className="card-border w-full">
            <div className="card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3>Your Answer</h3>
                <p className="text-xs text-light-100">
                  Speak using the mic or type below.
                </p>
              </div>

              <textarea
                ref={answerTextAreaRef}
                className="w-full min-h-[180px] max-h-[260px] rounded-xl bg-dark-200 border border-input px-4 py-3 text-sm outline-none resize-vertical"
                placeholder="Your answer will appear here..."
                value={answers[currentIndex] || ""}
                onChange={handleAnswerChange}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                <Button
                  type="button"
                  className="btn-secondary flex items-center gap-2"
                  onClick={toggleVoiceToText}
                >
                  {isRecordingVoice ? "Stop Recording" : "Start Recording"}
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20"
                    onClick={() => setShowExitModal(true)}
                    disabled={isSubmitting}
                  >
                    Exit & Save
                  </Button>
                  <Button
                    type="button"
                    className="btn-secondary"
                    onClick={goToPrev}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button
                      type="button"
                      className="btn-primary"
                      onClick={goToNext}
                    >
                      Next Question →
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleFinish(false)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Finishing & Generating Feedback..."
                        : "Finish Interview"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Camera + controls */}
        <div className="flex flex-col gap-4">
          <div className="card-border w-full">
            <div className="card p-4 flex flex-col gap-3 items-center justify-center min-h-[220px]">
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-2xl bg-black max-h-[260px] object-cover"
                />
              ) : (
                <div className="w-full rounded-2xl bg-black flex flex-col items-center justify-center gap-2 py-10">
                  <span className="text-3xl">♫</span>
                  <p className="text-sm text-light-100">Camera is off</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-2">
                <Button
                  type="button"
                  className="btn-secondary"
                  onClick={isCameraOn ? disableCamera : enableCamera}
                >
                  {isCameraOn ? "Turn Camera Off" : "Enable Camera & Mic"}
                </Button>

                <Button
                  type="button"
                  className="btn-secondary"
                  onClick={toggleMic}
                  disabled={!isCameraOn}
                >
                  {isMicOn ? "Mute Mic" : "Unmute Mic"}
                </Button>
              </div>

              <p className="text-[11px] text-light-100 text-center mt-1">
                Video is used for practice and body language awareness only in
                this version. It is not uploaded or stored on the server.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* Exit Confirmation Modal (Glassmorphism Transparent Card with Blurred Backdrop) */}
      {/* ========================================================================= */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Blurred Background Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
            onClick={() => !isSubmitting && setShowExitModal(false)}
          />

          {/* Transparent Glassmorphism Card */}
          <div className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-[#0d0f17]/85 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.85)] z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-6 text-center">
            {/* Ambient amber glow in background */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close (X) button */}
            <button
              type="button"
              onClick={() => !isSubmitting && setShowExitModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-light-100/50 hover:text-white hover:bg-white/5 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Alert Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title & Progress Headline */}
            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Do you really want to exit?
              </h3>
              <p className="text-sm text-light-100/80 leading-relaxed">
                You are currently at{" "}
                <span className="text-white font-semibold">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                .
              </p>
            </div>

            {/* Progress & Status Box */}
            <div className="rounded-2xl bg-dark-200/60 border border-white/5 p-4 text-left flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-light-100/70">
                <span>Interview Progress</span>
                <span className="font-semibold text-white">
                  {answeredCount} of {questions.length} answered
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-dark-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (answeredCount / (questions.length || 1)) * 100
                    )}%`,
                  }}
                />
              </div>

              <p className="text-xs text-light-100/90 leading-relaxed mt-1">
                {answeredCount > 0 ? (
                  <>
                    If you exit now, your answers up to this point will be saved
                    and evaluated. You will receive a{" "}
                    <span className="text-amber-300 font-semibold">
                      partial score till Question {currentIndex + 1}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    You haven&apos;t answered any questions yet. Exiting will
                    return you to the interviews dashboard without saving any score.
                  </>
                )}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-3 mt-1">
              {/* Primary: Continue Interview */}
              <Button
                type="button"
                className="btn-primary w-full py-3 h-auto font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary-200/20"
                onClick={() => setShowExitModal(false)}
                disabled={isSubmitting}
              >
                <Play className="w-4 h-4 fill-black text-black" />
                <span>Continue Interview</span>
              </Button>

              {/* Secondary: Save & Exit (Only if answered > 0) */}
              {answeredCount > 0 ? (
                <Button
                  type="button"
                  className="w-full py-2.5 h-auto text-sm font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all flex items-center justify-center gap-2"
                  onClick={() => {
                    handleFinish(true);
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span>Saving Progress & Scoring...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Progress & Exit Early</span>
                    </>
                  )}
                </Button>
              ) : null}

              {/* Tertiary: Exit Without Saving */}
              <button
                type="button"
                className="text-xs text-light-100/50 hover:text-rose-400 py-1 transition-colors flex items-center justify-center gap-1.5 mt-1"
                onClick={handleExitWithoutSave}
                disabled={isSubmitting}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Without Saving</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>


  );
};

export default InterviewRunner;
