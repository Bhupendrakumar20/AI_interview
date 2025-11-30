import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewById,
  getFeedbackByInterviewId,
} from "@/lib/actions/general.action";
import InterviewRunner from "@/components/InterviewRunner";

export default async function InterviewDetails({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  return (
    <div className="flex flex-col gap-6">
      <InterviewRunner
        interview={{ id, ...interview }}
        user={user}
        existingFeedback={feedback}
      />
    </div>
  );
}
