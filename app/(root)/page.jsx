import Link from "next/link";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

async function Home() {
  const user = await getCurrentUser();

  const [userInterviews, allInterviews] = await Promise.all([
    getInterviewsByUserId(user?.id),
    getLatestInterviews({ userId: user?.id }),
  ]);

  const hasPastInterviews = userInterviews && userInterviews.length > 0;
  const hasUpcomingInterviews = allInterviews && allInterviews.length > 0;

  const userName = user?.name || "there";

  return (
    <div className="flex flex-col gap-10">
      {/* Hero / Dashboard header */}
      <section className="w-full rounded-3xl blue-gradient-dark px-8 py-10 md:px-12 md:py-12">
        <div className="flex flex-col gap-5 items-start text-left">
          <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-primary-200">
            PrepWise · AI Interview Coach
          </p>

          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Unlock Your Career Potential
          </h1>

          <p className="text-base md:text-lg text-light-100 max-w-2xl">
            Welcome, {userName}! PrepWise provides personalized interview
            coaching, real-time feedback, and insights to help you land your
            dream job.
          </p>

          <div className="flex flex-wrap gap-4 mt-2">
            <Button asChild className="btn-primary">
              <Link href="/interview">Start Mock Interview</Link>
            </Button>

            <Button className="btn-secondary">
              <Link href="#features">Explore Features</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature cards section */}
      <section
        id="features"
        className="grid gap-6 md:grid-cols-2 w-full items-stretch"
      >
        <div className="card-border w-full">
          <div className="card p-6 flex flex-col gap-3">
            <h3>AI Interview Engine</h3>
            <p className="text-light-100 text-sm md:text-base">
              Practice with an AI interviewer that adapts to your performance,
              asks realistic questions, and helps you grow with every session.
            </p>
          </div>
        </div>

        <div className="card-border w-full">
          <div className="card p-6 flex flex-col gap-3">
            <h3>Evaluation &amp; Feedback</h3>
            <p className="text-light-100 text-sm md:text-base">
              Get a comprehensive report on your communication, technical
              skills, and overall readiness after every mock interview.
            </p>
          </div>
        </div>
      </section>

      {/* Your Interviews */}
      <section className="flex flex-col gap-4 mt-4">
        <div className="flex flex-row items-center justify-between gap-2">
          <h2>Your Recent Interviews</h2>
          {hasPastInterviews && (
            <p className="text-xs md:text-sm text-light-100">
              {userInterviews.length} completed
            </p>
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

      {/* Recommended / Available Interviews */}
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
            <p>
              There are no interviews available yet. Start one to see it here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
