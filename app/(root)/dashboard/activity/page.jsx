import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getUserFeedbacks, getUserApplications } from "@/lib/actions/general.action";
import ActivityClient from "@/components/ActivityClient";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  const dbInterviews = user ? await getInterviewsByUserId(user.id) : [];
  const dbFeedbacks = user ? await getUserFeedbacks(user.id) : [];
  const dbApplications = user ? await getUserApplications(user.id) : [];

  return (
    <ActivityClient 
      dbFeedbacks={dbFeedbacks} 
      dbApplications={dbApplications} 
      dbInterviewsCount={dbInterviews.length} 
    />
  );
}

