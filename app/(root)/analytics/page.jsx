import { getCurrentUser } from "@/lib/actions/auth.action";
import { getUserFeedbacks } from "@/lib/actions/general.action";

function computeAverages(feedbacks) {
  if (!feedbacks || feedbacks.length === 0) return null;

  const totals = {};
  const counts = {};

  feedbacks.forEach((fb) => {
    (fb.categoryScores || []).forEach((cat) => {
      if (!totals[cat.name]) {
        totals[cat.name] = 0;
        counts[cat.name] = 0;
      }
      totals[cat.name] += cat.score || 0;
      counts[cat.name] += 1;
    });
  });

  return Object.keys(totals).map((name) => ({
    name,
    score: Math.round(totals[name] / counts[name]),
  }));
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const feedbacks = await getUserFeedbacks(user?.id);
  const categoryAverages = computeAverages(feedbacks);

  const totalInterviews = feedbacks.length;

  return (
    <div className="flex flex-col gap-8">
      <section className="blue-gradient-dark rounded-3xl px-8 py-8 md:px-10 md:py-10">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3">
          Analytics &amp; Performance
        </h1>
        <p className="text-light-100 max-w-2xl text-sm md:text-base">
          Track your progress across interviews. See how your communication,
          technical skills, and problem-solving are improving over time.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="card-border">
          <div className="card p-5 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-light-100">
              Total Interviews
            </p>
            <p className="text-3xl font-semibold">{totalInterviews}</p>
            <p className="text-xs text-light-100">
              Number of completed mock interviews with AI feedback.
            </p>
          </div>
        </div>

        <div className="card-border">
          <div className="card p-5 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-light-100">
              Latest Score
            </p>
            <p className="text-3xl font-semibold">
              {feedbacks[0]?.totalScore ?? "--"}/100
            </p>
            <p className="text-xs text-light-100">
              Overall impression from your most recent interview.
            </p>
          </div>
        </div>

        <div className="card-border">
          <div className="card p-5 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-light-100">
              Best Category
            </p>
            <p className="text-lg font-semibold">
              {categoryAverages
                ? categoryAverages.reduce((best, current) =>
                    current.score > best.score ? current : best
                  ).name
                : "--"}
            </p>
            <p className="text-xs text-light-100">
              The area where you&apos;re currently performing strongest.
            </p>
          </div>
        </div>
      </section>

      {/* Simple radial-style chart substitute */}
      <section className="card-border">
        <div className="card p-6 flex flex-col gap-4">
          <h2>Performance Breakdown</h2>
          {categoryAverages && categoryAverages.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {categoryAverages.map((cat) => (
                <div key={cat.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{cat.name}</span>
                    <span>{cat.score}/100</span>
                  </div>
                  <div className="w-full h-2 bg-dark-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-200 rounded-full"
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-light-100">
              No feedback data yet. Complete a mock interview to see your
              analytics here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
