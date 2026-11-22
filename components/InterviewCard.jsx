import dayjs from "dayjs";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import DisplayTechIcons from "./DisplayTechIcons";
import { cn } from "@/lib/utils";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";

const InterviewCard = async ({
  interviewId,
  userId,
  role = "General",
  type = "Technical",
  techstack = [],
  createdAt,
  questions = [],
  level,
}) => {
  const feedback =
    userId && interviewId
      ? await getFeedbackByInterviewId({
          interviewId,
          userId,
        })
      : null;

  // Format type & styling
  const normalizedType = /mix/gi.test(type || "")
    ? "Mixed"
    : type || "Technical";

  const typeBadgeStyle =
    {
      Behavioral: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
      Mixed: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      Technical: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    }[normalizedType] || "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";

  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now()
  ).format("MMM D, YYYY • h:mm A");

  // Determine questions and completion
  const transcript = feedback?.transcript || [];
  const systemQuestions = transcript.filter((m) => m.role === "system");
  const userValidAnswers = transcript.filter(
    (m) =>
      m.role === "user" &&
      m.content &&
      m.content.trim().length > 0 &&
      !m.content.includes("[Candidate exited") &&
      !m.content.includes("[Interview exited") &&
      !m.content.includes("[No answer")
  );

  const totalQuestions =
    feedback?.totalQuestions ||
    (Array.isArray(questions) && questions.length > 0
      ? questions.length
      : null) ||
    systemQuestions.length ||
    5;

  const answeredCount =
    feedback?.answeredCount ?? (feedback ? userValidAnswers.length : 0);

  // Completion determination (handles new records and legacy records)
  const isCompleted = feedback
    ? feedback.isCompleted !== undefined
      ? Boolean(feedback.isCompleted)
      : feedback.status === "completed" ||
        (totalQuestions > 0 &&
          answeredCount >= totalQuestions &&
          (feedback.totalScore || 0) > 0 &&
          !feedback.finalAssessment
            ?.toLowerCase()
            ?.includes("failed the interview by not providing"))
    : false;

  const isQuitEarly = feedback ? !isCompleted : false;

  const quitAtQuestion =
    feedback?.quitAtQuestion ||
    (isQuitEarly
      ? answeredCount > 0
        ? Math.min(answeredCount + 1, totalQuestions)
        : 1
      : null);

  const progressPercentage = Math.min(
    100,
    Math.round(((answeredCount || 0) / (totalQuestions || 1)) * 100)
  );

  // Score determination & badge coloring
  const hasScore = feedback && typeof feedback.totalScore === "number";
  const score = hasScore ? Math.round(feedback.totalScore) : null;

  let scoreColor = "text-light-100/40";
  let scoreBadgeColor = "bg-white/5 text-light-100/60 border-white/10";
  let scoreLabel = "Not Started";

  if (hasScore) {
    if (score >= 80) {
      scoreColor = "text-emerald-400";
      scoreBadgeColor =
        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      scoreLabel = "Excellent";
    } else if (score >= 60) {
      scoreColor = "text-cyan-400";
      scoreBadgeColor = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      scoreLabel = "Good";
    } else if (score >= 40) {
      scoreColor = "text-amber-400";
      scoreBadgeColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
      scoreLabel = "Needs Work";
    } else {
      scoreColor = "text-rose-400";
      scoreBadgeColor = "bg-rose-500/15 text-rose-400 border-rose-500/30";
      scoreLabel = score === 0 ? "No Score" : "Incomplete";
    }
  }

  // Category scores mini breakdown
  const categoryScores = Array.isArray(feedback?.categoryScores)
    ? feedback.categoryScores
    : typeof feedback?.categoryScores === "object" &&
      feedback?.categoryScores !== null
    ? Object.values(feedback.categoryScores).filter(
        (c) => c && typeof c === "object"
      )
    : [];

  return (
    <div className="premium-card-glass p-6 sm:p-7 flex flex-col justify-between min-h-[460px] w-full max-w-[390px] group transition-all duration-300">
      <div className="flex flex-col gap-3.5">
        {/* Top Header Row: Pill Badge & Live Indicator */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="premium-pill-badge px-3 py-1 text-xs font-semibold">
              {normalizedType} • Round 1
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {feedback ? (
              isCompleted ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Completed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Quit at Q{quitAtQuestion}
                </span>
              )
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize tracking-tight leading-snug">
            {role} Interview
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            AI-led mock round • 30 min • {totalQuestions} questions
          </p>
        </div>

        {/* Progress Bar (Matching Reference Image) */}
        <div className="mt-2">
          <div className="w-full h-2 rounded-full overflow-hidden bg-[#E0E7FF] dark:bg-[#1E293B] border border-transparent dark:border-slate-700/50">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isCompleted
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : answeredCount > 0
                  ? "bg-gradient-to-r from-indigo-500 to-[#818CF8]"
                  : "bg-indigo-500/80 dark:bg-[#818CF8]"
              )}
              style={{ width: `${Math.max(progressPercentage, answeredCount > 0 ? progressPercentage : 15)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Question {answeredCount > 0 ? answeredCount : 1} of {totalQuestions}</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Assessment / Score Inset Box (if feedback exists) */}
        {feedback && (
          <div className="premium-inset-tile p-3.5 mt-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {isCompleted ? "Overall Score" : "Partial Score"}
              </span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {hasScore ? `${score}/100` : "--"}
              </span>
            </div>
            {feedback.finalAssessment && (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {feedback.finalAssessment}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer: Status / Tech Stack & Action Button */}
      <div className="flex items-center justify-between gap-3 pt-5 mt-auto border-t border-indigo-100/70 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Mic ready</span>
          </div>
          <div className="hidden sm:block">
            <DisplayTechIcons techStack={techstack} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {feedback ? (
            <>
              <Link
                href={`/interview/${interviewId}`}
                className="px-3.5 py-2 text-xs font-bold rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1 shadow-xs"
                title={isCompleted ? "Retake Interview" : "Resume Interview"}
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>{isCompleted ? "Retake" : "Resume"}</span>
              </Link>

              <Link
                href={`/interview/${interviewId}/feedback`}
                className="btn-theme-action px-4 py-2 text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-md"
              >
                <span>Feedback</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </>
          ) : (
            <Link
              href={`/interview/${interviewId}`}
              className="btn-theme-action px-5 py-2.5 text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-1.5 shadow-md"
            >
              <span>Start Interview</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
