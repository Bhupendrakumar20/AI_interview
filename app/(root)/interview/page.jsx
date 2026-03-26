import React from "react";
import InterviewPageContent from "@/components/InterviewPageContent";
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

export default InterviewPage;
