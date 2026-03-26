import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import InterviewSetup from "@/components/InterviewSetup";
import ResumeRound from "@/components/ResumeRound";
import InterviewModeTabs from "@/components/InterviewModeTabs";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

async function InterviewPage() {
  const user = await getCurrentUser();

  const [userInterviews, allInterviews] = await Promise.all([
    getInterviewsByUserId(user?.id),
    getLatestInterviews({ userId: user?.id }),
  ]);

  const hasPastInterviews = userInterviews && userInterviews.length > 0;
  const hasUpcomingInterviews = allInterviews && allInterviews.length > 0;

  return (
    <InterviewPageContent 
      user={user}
      userInterviews={userInterviews}
      allInterviews={allInterviews}
      hasPastInterviews={hasPastInterviews}
      hasUpcomingInterviews={hasUpcomingInterviews}
    />
  );
}

"use client";

function InterviewPageContent({ user, userInterviews, allInterviews, hasPastInterviews, hasUpcomingInterviews }) {
  const [activeMode, setActiveMode] = React.useState("mock-interview");

  return (
    <div className="flex flex-col gap-10">
      {/* Interview Buddy CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-8 animate-fadeInDown">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2 text-white">Interview Buddy</h3>
            <p className="text-slate-300 mb-4 max-w-md text-sm">
              Practice with a human partner or AI interviewer. Get real-time coaching, adaptive questions, and detailed performance reports.
            </p>
            <Link href="/interview/buddy" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
              Try Interview Buddy
            </Link>
          </div>
          <div className="text-2xl opacity-20">▲</div>
        </div>
      </section>

      {/* Mode Tabs */}
      <InterviewModeTabs activeMode={activeMode} setActiveMode={setActiveMode} />

      {/* Mock Interview Mode */}
      {activeMode === "mock-interview" && (
        <div className="space-y-6 animate-fadeInUp">
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch">
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-white">Set Up Your Mock Interview</h2>
                <p className="text-sm text-slate-400">
                  Choose a role, target company, and difficulty level. PrepWise will
                  generate a tailored set of questions and start a live AI interview.
                </p>
                <InterviewSetup userId={user?.id} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 flex flex-col gap-4">
                <h3 className="text-xl font-bold text-white">How It Works</h3>
                <ol className="space-y-2 text-sm">
                  {[
                    "Fill in the role, company, and difficulty.",
                    "PrepWise generates 5–7 targeted questions.",
                    "Answer in real-time on the live interview screen.",
                    "Receive detailed feedback and performance analysis.",
                  ].map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-300">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-300 text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-slate-500 mt-4 border-t border-slate-700/50 pt-4">
                  Revisit previous interviews and feedback anytime from the Dashboard or Analytics pages.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Resume Round Mode */}
      {activeMode === "resume-round" && (
        <ResumeRound />
      )}

      {/* Your Interviews */}
      <section className="flex flex-col gap-4 mt-2 animate-fadeInUp">
        <div className="flex flex-row items-center justify-between gap-2">
          <h2 className="text-2xl font-bold text-white">Your Interviews</h2>
          {hasPastInterviews && (
            <Link href="/" className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 transition-all duration-200">
              Back to Dashboard
            </Link>
          )}
        </div>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p className="text-slate-400 text-sm">You haven&apos;t taken any interviews yet.</p>
          )}
        </div>
      </section>

      {/* Recommended Interviews */}
      <section className="flex flex-col gap-4 mt-2 animate-fadeInUp">
        <div className="flex flex-row items-center justify-between gap-2">
          <h2 className="text-2xl font-bold text-white">Recommended Interviews</h2>
        </div>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            allInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p className="text-slate-400 text-sm">There are no interviews available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default InterviewPage;
