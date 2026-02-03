// components/StatsOverview.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";

const StatsOverview = async () => {
  const user = await getCurrentUser();
  const interviews = user ? await getInterviewsByUserId(user.id) : [];
  const feedbacks = user ? await getUserFeedbacks(user.id) : [];

  const stats = [
    { label: "Interviews Taken", value: interviews.length, icon: "🎤" },
    { label: "Avg Score", value: feedbacks.length > 0 
      ? Math.round(feedbacks.reduce((acc, f) => acc + (f.totalScore || 0), 0) / feedbacks.length) 
      : 0, icon: "⭐" },
    { label: "Skills Improved", value: 12, icon: "📈" },
    { label: "Hours Practiced", value: Math.round(interviews.length * 0.5), icon: "⏱️" },
  ];

  return (
    <section>
      <h2 className="text-3xl font-bold mb-6">Your Progress Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-border">
            <div className="card p-5 text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-light-100">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsOverview;