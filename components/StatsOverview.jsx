// components/StatsOverview.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";
import { Video, Star, TrendingUp, Clock } from "lucide-react";

const StatsOverview = async () => {
  const user = await getCurrentUser();
  const interviews = user ? await getInterviewsByUserId(user.id) : [];
  const feedbacks = user ? await getUserFeedbacks(user.id) : [];

  const stats = [
    { label: "Interviews Taken", value: interviews.length, icon: Video },
    { label: "Avg Score", value: feedbacks.length > 0 
      ? Math.round(feedbacks.reduce((acc, f) => acc + (f.totalScore || 0), 0) / feedbacks.length) 
      : 0, icon: Star },
    { label: "Skills Improved", value: 12, icon: TrendingUp },
    { label: "Hours Practiced", value: Math.round(interviews.length * 0.5), icon: Clock },
  ];

  return (
    <section className="py-6">
      <h2 className="text-xl font-bold tracking-tight text-foreground mb-6" style={{ letterSpacing: "-0.02em" }}>Your Progress Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card-featured-lift-glow p-5 flex flex-col justify-between items-center text-center">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary mb-3">
                <Icon size={24} />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StatsOverview;