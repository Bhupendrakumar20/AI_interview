import Link from "next/link";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import InterviewSetup from "@/components/InterviewSetup";

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
    <div className="flex flex-col gap-10">
      {/* Setup section */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch">
        <div className="card-border w-full">
          <div className="card p-6 flex flex-col gap-4">
            <h2>Set Up Your Mock Interview</h2>
            <p className="text-sm text-light-100">
              Choose a role, target company, and difficulty level. PrepWise will
              generate a tailored set of questions and start a live AI
              interview.
            </p>

            <InterviewSetup userId={user?.id} />
          </div>
        </div>

        <div className="card-border w-full">
          <div className="card p-6 flex flex-col gap-4">
            <h3>How It Works</h3>
            <ol className="list-decimal list-inside text-sm text-light-100 space-y-1">
              <li>Fill in the role, company, and difficulty.</li>
              <li>PrepWise generates 5–7 targeted questions.</li>
              <li>
                You&apos;re taken to the live AI interview screen to answer in
                real time.
              </li>
              <li>Once finished, you&apos;ll receive a detailed feedback report.</li>
            </ol>

            <p className="text-xs text-light-100 mt-2">
              You can revisit your previous interviews and feedback anytime from
              the Dashboard or Analytics pages.
            </p>
          </div>
        </div>
      </section>

      {/* Your Interviews */}
      <section className="flex flex-col gap-4 mt-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <h2>Your Interviews</h2>
          {hasPastInterviews && (
            <Button asChild className="btn-secondary">
              <Link href="/">Back to Dashboard</Link>
            </Button>
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
            <p>You haven&apos;t taken any interviews yet.</p>
          )}
        </div>
      </section>

      {/* Recommended Interviews */}
      <section className="flex flex-col gap-4 mt-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <h2>Recommended Interviews</h2>
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
            <p>There are no interviews available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default InterviewPage;
