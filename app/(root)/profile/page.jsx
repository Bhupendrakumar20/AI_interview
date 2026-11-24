import Link from "next/link";
import { Award, BarChart3, BriefcaseBusiness, Code2, GraduationCap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import UpdateProfileForm from "@/components/UpdateProfileForm";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";
import { getProfileAchievements } from "@/lib/actions/profile-achievements.action";

function getCategoryScores(feedback) {
  if (Array.isArray(feedback.categoryScores)) return feedback.categoryScores;
  if (feedback.categoryScores && typeof feedback.categoryScores === "object") {
    return Object.entries(feedback.categoryScores).map(([name, value]) => ({
      name,
      score: typeof value === "number" ? value : value?.score,
    }));
  }
  return [];
}

function buildAnalyticsSummary(feedbacks, interviews) {
  const scoreRecords = feedbacks.filter((feedback) => typeof feedback.totalScore === "number");
  const averageScore = scoreRecords.length
    ? Math.round(scoreRecords.reduce((total, feedback) => total + feedback.totalScore, 0) / scoreRecords.length)
    : null;
  const categoryTotals = new Map();

  feedbacks.forEach((feedback) => {
    getCategoryScores(feedback).forEach((category) => {
      if (!category?.name || typeof category.score !== "number") return;
      const current = categoryTotals.get(category.name) || { total: 0, count: 0 };
      categoryTotals.set(category.name, { total: current.total + category.score, count: current.count + 1 });
    });
  });

  const strongestCategory = [...categoryTotals.entries()]
    .map(([name, value]) => ({ name, score: value.total / value.count }))
    .sort((a, b) => b.score - a.score)[0]?.name || "Not enough data";
  const interviewRoles = new Map(interviews.map((interview) => [interview.id, interview.role]));
  const latestFeedback = scoreRecords[0];

  return {
    completedRounds: feedbacks.length,
    averageScore,
    latestScore: latestFeedback?.totalScore ?? null,
    latestRole: latestFeedback?.interviewId
      ? interviewRoles.get(latestFeedback.interviewId) || "Interview"
      : "Interview",
    strongestCategory,
  };
}

const rewardIcons = {
  "Coding challenge": Code2,
  "Job applications": BriefcaseBusiness,
  "Internship applications": GraduationCap,
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const isAuthenticated = !!user && user.uid !== "dummy-user-id";
  const [interviews, feedbacks, achievements] = isAuthenticated
    ? await Promise.all([
        getInterviewsByUserId(user.id),
        getUserFeedbacks(user.id),
        getProfileAchievements(),
      ])
    : [[], [], { success: false, error: "Sign in to save progress and earn rewards." }];
  const summary = buildAnalyticsSummary(feedbacks, interviews);

  return (
    <div className="flex flex-col gap-8">
      <section className="soft-indigo-header flex flex-wrap items-center justify-between gap-5 rounded-3xl px-8 py-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Your Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 dark:text-slate-300">
            Update your details, follow your interview progress, and collect rewards as you build your career.
          </p>
        </div>
        <Link href="/analytics">
          <Button variant="secondary">
            <BarChart3 className="mr-2 h-4 w-4" />
            View full analytics
          </Button>
        </Link>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.8fr)]">
        <section className="card-border w-full">
          <div className="card p-6">
            <UpdateProfileForm user={user} />
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Career snapshot</h2>
                <p className="text-xs text-muted-foreground">Your recent interview progress</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Completed rounds", value: summary.completedRounds },
                { label: "Average score", value: summary.averageScore === null ? "—" : `${summary.averageScore}/100` },
                { label: "Latest score", value: summary.latestScore === null ? "—" : `${summary.latestScore}/100`, detail: summary.latestScore === null ? "" : summary.latestRole },
                { label: "Strongest area", value: summary.strongestCategory },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 truncate text-lg font-bold text-foreground" title={metric.value}>
                    {metric.value}
                  </p>
                  {metric.detail && <p className="truncate text-xs text-muted-foreground">{metric.detail}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="font-semibold text-foreground">Rewards & goals</h2>
                <p className="text-xs text-muted-foreground">Progress toward your next milestones</p>
              </div>
            </div>

            {achievements.success ? (
              <div className="space-y-4">
                {achievements.rewards.map((reward) => {
                  const Icon = rewardIcons[reward.category] || Award;
                  const progressPercent = Math.min(100, Math.round((reward.progress / reward.target) * 100));
                  return (
                    <div key={reward.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className={`h-4 w-4 shrink-0 ${reward.unlocked ? "text-amber-500" : "text-muted-foreground"}`} />
                          <span className="truncate text-sm font-medium text-foreground">{reward.title}</span>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {reward.unlocked ? "Earned" : `${reward.progress}/${reward.target}`}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-secondary"
                        role="progressbar"
                        aria-valuenow={progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${reward.title} progress`}
                      >
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{achievements.error}</p>
            )}

            <Link
              href="/100-days-of-code"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Continue the 100 Days challenge
              <Code2 className="h-4 w-4" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
