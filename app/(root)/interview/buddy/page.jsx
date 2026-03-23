import InterviewBuddy from "@/components/InterviewBuddy";
import { getCurrentUser } from "@/lib/actions/auth.action";

export const metadata = {
  title: "Interview Buddy - PrepPath",
  description: "Practice interviews with a human partner or AI interviewer",
};

async function InterviewBuddyPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <InterviewBuddy userId={user?.id} />
    </div>
  );
}

export default InterviewBuddyPage;
