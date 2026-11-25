import Link from "next/link";
import { Award, BarChart3, BriefcaseBusiness, Code2, GraduationCap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import UpdateProfileForm from "@/components/UpdateProfileForm";
import ProfileIdentityCard from "@/components/ProfileIdentityCard";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";
import { getProfileAchievements } from "@/lib/actions/profile-achievements.action";
import { buildAnalyticsSummary } from "@/lib/profile-summary";

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

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section id="profile-edit-form" className="card-border w-full scroll-mt-6">
          <div className="card p-6">
            <UpdateProfileForm user={user} />
          </div>
        </section>

        <aside className="space-y-4 order-first xl:order-last w-full max-w-[440px] mx-auto xl:max-w-none">
          <ProfileIdentityCard user={user} summary={summary} achievements={achievements} />

          <section className="premium-card-glass p-4 sm:p-5 w-full max-w-[440px] mx-auto xl:mx-0">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Rewards &amp; goals
                </h2>
                <p className="text-xs text-muted-foreground">Progress toward your next milestones</p>
              </div>
            </div>

            {achievements.success ? (
              <div className="space-y-3">
                {achievements.rewards.map((reward) => {
                  const Icon = rewardIcons[reward.category] || Award;
                  const progressPercent = Math.min(100, Math.round((reward.progress / reward.target) * 100));
                  return (
                    <div key={reward.id}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${reward.unlocked ? "text-amber-500" : "text-muted-foreground"}`} />
                          <span className="truncate text-xs sm:text-sm font-medium text-foreground">{reward.title}</span>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {reward.unlocked ? "Earned" : `${reward.progress}/${reward.target}`}
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-secondary"
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
              className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline"
            >
              Continue the 100 Days challenge
              <Code2 className="h-3.5 w-3.5" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
