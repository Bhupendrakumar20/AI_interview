import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

async function Home() {
  const user = await getCurrentUser();

  const [userInterviews, allInterview] = await Promise.all([
    user?.id ? getInterviewsByUserId(user.id) : [],
    user?.id ? getLatestInterviews({ userId: user.id }) : [],
  ]);

  const hasPastInterviews = (userInterviews?.length || 0) > 0;
  const hasUpcomingInterviews = (allInterview?.length || 0) > 0;

  return (
    <>
      {/* Hero CTA */}
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice &amp; Feedback</h2>
          <p className="text-lg">
            Practice real interview questions &amp; get instant feedback.
          </p>

          <div className="flex flex-wrap gap-3 items-center">
            <Button asChild className="btn-primary max-sm:w-full">
              <Link href="/interview">Start an Interview</Link>
            </Button>

            <Button asChild className="btn-secondary max-sm:w-full">
              <Link href="/question-bank">Browse Question Bank</Link>
            </Button>
          </div>

          <p className="text-sm text-light-100">
            Use the AI interviewer for live practice, or prepare first using our
            curated question bank by role.
          </p>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {/* Your Interviews */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Interviews</h2>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews?.map((interview) => (
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
            <p>You haven&apos;t taken any interviews yet</p>
          )}
        </div>
      </section>

      {/* Available / Public Interviews */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Take Interviews</h2>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            allInterview?.map((interview) => (
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
            <p>There are no interviews available</p>
          )}
        </div>
      </section>

      {/* Question Bank teaser section */}
      <section className="flex flex-col gap-4 mt-10">
        <div className="card-border w-full">
          <div className="card px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-2 max-w-2xl">
              <h3>Question Bank by Role</h3>
              <p className="text-sm text-light-100">
                Explore curated interview questions for different roles like
                Software Engineer, Data Analyst, IT Support, Project Manager,
                Product Manager, and more. Perfect for quick revision before
                starting a mock interview.
              </p>
            </div>

            <Button asChild className="btn-primary">
              <Link href="/question-bank">Open Question Bank</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
