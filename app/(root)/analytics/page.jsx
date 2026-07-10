import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";
import AnalyticsClient from "@/components/AnalyticsClient";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const dbInterviews = user ? await getInterviewsByUserId(user.id) : [];
  const dbFeedbacks = user ? await getUserFeedbacks(user.id) : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <AnalyticsClient dbInterviews={dbInterviews} dbFeedbacks={dbFeedbacks} />
    </div>
  );
}

