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
      Behavioral: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      Mixed: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      Technical: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    }[normalizedType] || "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";

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
    <div className="card-border w-full max-w-[380px] min-h-[470px] flex flex-col group transition-all duration-300 hover:shadow-2xl hover:shadow-primary-200/15">
      <div className="card p-6 flex flex-col justify-between h-full gap-5 relative overflow-hidden bg-gradient-to-b from-dark-200/90 to-dark-100/95 border border-white/5">
        <div className="flex flex-col gap-4">
          {/* Top Header Row: Status Badge & Type Badge */}
          <div className="flex items-center justify-between gap-2">
            {feedback ? (
              isCompleted ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Completed ({answeredCount}/{totalQuestions} Qs)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Quit at Q{quitAtQuestion} ({answeredCount}/{totalQuestions}{" "}
                    Qs)
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Ready to Start</span>
              </div>
            )}

            <div
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border",
                typeBadgeStyle
              )}
            >
              <span>{normalizedType}</span>
            </div>
          </div>

          {/* Role & Cover Section */}
          <div className="flex items-start gap-3.5 mt-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:border-cyan-400/50 transition-colors">
              <Briefcase className="w-6 h-6 text-cyan-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white capitalize truncate tracking-tight">
                {role} Interview
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-light-100/70">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-light-100/60" />
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Score & Progress Highlight Card */}
          <div className="rounded-xl bg-dark-200/60 border border-white/5 p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-wider text-light-100/70">
                  {feedback
                    ? isCompleted
                      ? "Final Score"
                      : `Partial Score (Till Q${quitAtQuestion})`
                    : "Score"}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span
                    className={cn(
                      "text-2xl font-black tracking-tight",
                      scoreColor
                    )}
                  >
                    {hasScore ? score : "--"}
                  </span>
                  <span className="text-xs text-light-100/50 font-medium">
                    / 100
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5 rounded-md border",
                    scoreBadgeColor
                  )}
                >
                  {hasScore ? scoreLabel : "Not Taken"}
                </span>
                <span className="text-[11px] text-light-100/60">
                  {answeredCount} of {totalQuestions} answered
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full">
              <div className="w-full h-1.5 bg-dark-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : answeredCount > 0
                      ? "bg-gradient-to-r from-amber-500 to-cyan-400"
                      : "bg-light-100/20"
                  )}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Category Scores Mini Breakdown (if available) */}
          {categoryScores.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {categoryScores.slice(0, 4).map((cat, idx) => (
                <div
                  key={idx}
                  className="bg-dark-200/40 border border-white/5 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs"
                >
                  <span className="text-[11px] text-light-100/80 truncate pr-1">
                    {cat.name
                      ? cat.name
                          .replace(" Skills", "")
                          .replace(" and Clarity", "")
                      : `Skill ${idx + 1}`}
                  </span>
                  <span className="text-[11px] font-bold text-white shrink-0">
                    {typeof cat.score === "number" ? `${cat.score}%` : "--"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Assessment Summary Box */}
          <div className="p-3 rounded-xl bg-dark-200/30 border border-white/5 min-h-[58px] flex items-center">
            <p className="text-xs text-light-100/90 leading-relaxed line-clamp-2">
              {feedback?.finalAssessment ||
                "You haven't taken this interview yet. Take it now to test your skills and get personalized AI feedback."}
            </p>
          </div>
        </div>

        {/* Footer: Tech Stack & Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5 mt-auto">
          <div className="shrink-0">
            <DisplayTechIcons techStack={techstack} />
          </div>

          <div className="flex items-center gap-2">
            {feedback ? (
              <>
                <Link
                  href={`/interview/${interviewId}`}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full bg-dark-200 text-light-100 hover:text-white hover:bg-dark-250 border border-white/10 transition-all flex items-center gap-1.5"
                  title={
                    isCompleted
                      ? "Retake Interview"
                      : "Resume / Retake Interview"
                  }
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">
                    {isCompleted ? "Retake" : "Resume"}
                  </span>
                </Link>

                <Link
                  href={`/interview/${interviewId}/feedback`}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-primary-200 to-cyan-400 text-dark-100 hover:brightness-110 shadow-md shadow-primary-200/20 transition-all flex items-center gap-1.5"
                >
                  <span>Feedback</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </>
            ) : (
              <Link
                href={`/interview/${interviewId}`}
                className="px-4 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-primary-200 to-cyan-400 text-dark-100 hover:brightness-110 shadow-md shadow-primary-200/20 transition-all flex items-center gap-1.5"
              >
                <span>Start Interview</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
