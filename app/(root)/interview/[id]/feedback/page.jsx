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

// Helper function to ensure categoryScores is an array
function getCategoryScoresArray(categoryScores) {
  if (!categoryScores) return [];
  if (Array.isArray(categoryScores)) return categoryScores;
  if (typeof categoryScores === "object") {
    // Convert object to array if it's an object with numeric keys
    return Object.values(categoryScores).filter(item => item && typeof item === "object");
  }
  return [];
}

// Helper function to ensure array fields are arrays
function getArrayField(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "object") {
    return Object.values(field).filter(item => typeof item === "string" || typeof item === "object");
  }
  return [];
}

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
  const categoryScoresArray = getCategoryScoresArray(feedback.categoryScores);
  const strengthsArray = getArrayField(feedback.strengths);
  const areasArray = getArrayField(feedback.areasForImprovement);

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
        {categoryScoresArray && categoryScoresArray.length > 0 ? (
          categoryScoresArray.map((category, index) => (
            <div key={index}>
              <p className="font-bold">
                {index + 1}. {category.name} ({category.score}/100)
              </p>
              <p>{category.comment}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-light-400">No category scores available.</p>
        )}
      </div>

      {/* Strengths */}
      <div className="flex flex-col gap-3">
        <h3>Strengths</h3>
        {strengthsArray && strengthsArray.length > 0 ? (
          <ul>
            {strengthsArray.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-light-400">No strengths data available.</p>
        )}
      </div>

      {/* Areas for Improvement */}
      <div className="flex flex-col gap-3">
        <h3>Areas for Improvement</h3>
        {areasArray && areasArray.length > 0 ? (
          <ul>
            {areasArray.map((area, index) => (
              <li key={index}>{area}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-light-400">No areas for improvement data available.</p>
        )}
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
