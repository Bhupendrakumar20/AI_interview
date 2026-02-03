import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default async function Feedback({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user?.id,
  });

  if (!feedback) {
    redirect(`/interview/${id}`);
  }

  const createdAtText = feedback.createdAt
    ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
    : "N/A";

  const transcript = feedback.transcript || [];

  return (
    <section className="section-feedback">
      {/* Header */}
      <div className="flex flex-row justify-center text-center">
        <h1 className="text-4xl font-semibold">
          Feedback on the Interview –{" "}
          <span className="capitalize">{interview.role}</span>
        </h1>
      </div>

      {/* Summary Row */}
      <div className="flex flex-row justify-center">
        <div className="flex flex-row gap-5 flex-wrap justify-center">
          {/* Overall Impression */}
          <div className="flex flex-row gap-2 items-center">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            <p>
              Overall Impression:{" "}
              <span className="text-primary-200 font-bold">
                {feedback.totalScore}
              </span>
              /100
            </p>
          </div>

          {/* Date */}
          <div className="flex flex-row gap-2 items-center">
            <Image src="/calendar.svg" width={22} height={22} alt="calendar" />
            <p>{createdAtText}</p>
          </div>
        </div>
      </div>

      <hr />

      {/* Final assessment */}
      <p>{feedback.finalAssessment}</p>

      {/* Interview Breakdown */}
      <div className="flex flex-col gap-4">
        <h2>Breakdown of the Interview:</h2>
        {feedback.categoryScores?.map((category, index) => (
          <div key={index}>
            <p className="font-bold">
              {index + 1}. {category.name} ({category.score}/100)
            </p>
            <p>{category.comment}</p>
          </div>
        ))}
      </div>

      {/* Strengths */}
      <div className="flex flex-col gap-3">
        <h3>Strengths</h3>
        <ul>
          {feedback.strengths?.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div className="flex flex-col gap-3">
        <h3>Areas for Improvement</h3>
        <ul>
          {feedback.areasForImprovement?.map((area, index) => (
            <li key={index}>{area}</li>
          ))}
        </ul>
      </div>

      {/* . NEW: Transcript section */}
      <div className="flex flex-col gap-3">
        <h3>Interview Transcript</h3>
        {transcript.length === 0 ? (
          <p className="text-sm text-light-100">
            Transcript is not available for this interview.
          </p>
        ) : (
          <div className="border-gradient p-0.5 rounded-2xl">
            <div className="dark-gradient rounded-2xl max-h-[360px] overflow-y-auto p-4 flex flex-col gap-2">
              {transcript.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary-200 text-dark-100"
                        : "bg-dark-200 text-light-100"
                    }`}
                  >
                    <span className="block text-[10px] opacity-70 mb-1 uppercase">
                      {msg.role === "user" ? "You" : "AI Interviewer"}
                    </span>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="buttons">
        <Button className="btn-secondary flex-1">
          <Link href="/" className="flex w-full justify-center">
            <p className="text-sm font-semibold text-primary-200 text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button className="btn-primary flex-1">
          <Link
            href={`/interview/${id}`}
            className="flex w-full justify-center"
          >
            <p className="text-sm font-semibold text-black text-center">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
}
