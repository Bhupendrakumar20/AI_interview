"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        }
      }

      if (finalTranscript.trim()) {
        setAnswers((prev) => {
          const copy = [...prev];
          copy[currentIndex] =
            (copy[currentIndex] || "") + " " + finalTranscript;
          return copy;
        });

        if (answerTextAreaRef.current) {
          answerTextAreaRef.current.scrollTop =
            answerTextAreaRef.current.scrollHeight;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      toast.error("Speech recognition error.");
      setIsRecordingVoice(false);
    };

    recognition.onend = () => {
      setIsRecordingVoice(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecordingVoice(true);
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

  // ---------- Submit & Feedback ----------
  const handleFinish = () => {
    if (!questions.length) {
      toast.error("No questions available for this interview.");
      return;
    }

    const emptyCount = answers.filter((a) => !a || !a.trim()).length;
    if (emptyCount === questions.length) {
      toast.error("Please answer at least one question.");
      return;
    }

    startTransition(async () => {
      try {
        const transcript = [];

        questions.forEach((q, idx) => {
          transcript.push({
            role: "system",
            content: `Question ${idx + 1}: ${q}`,
          });
          transcript.push({
            role: "user",
            content: answers[idx] || "",
          });
        });

        const result = await createFeedback({
          interviewId: interview.id,
          userId: user.id,
          transcript,
          feedbackId: existingFeedback?.id,
        });

        if (result?.success && result.feedbackId) {
          toast.success("Interview finished! Generating feedback...");
          router.push(`/interview/${interview.id}/feedback`);
        } else {
          toast.error("Failed to save feedback. Returning to dashboard.");
          router.push("/");
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong while finishing interview.");
      }
    });
  };

  const currentQuestion = questions[currentIndex] || "";

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

          {existingFeedback && (
            <p className="text-xs text-light-100 max-w-xs text-right">
              You&apos;ve already completed this interview. Finishing again will
              update your feedback report.
            </p>
          )}
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
                  {isSpeaking ? "Playing..." : "🔊 Read aloud"}
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
                  {isRecordingVoice ? "⏹ Stop Recording" : "🎙 Start Recording"}
                </Button>

                <div className="flex gap-2">
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
                      onClick={handleFinish}
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
                  <span className="text-3xl">📷</span>
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
    </div>


  );
};

export default InterviewRunner;
