// app/(root)/dashboard/activity/page.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";
import ActivityTimeline from "@/components/ActivityTimeline";
import StatsCard from "@/components/StatsCard";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  const interviews = await getInterviewsByUserId(user.id);
  const feedbacks = await getUserFeedbacks(user.id);

  const recentActivities = [
    {
      id: 1,
      type: "interview",
      title: "Completed Frontend Developer Interview",
      description: "Scored 85/100 - Excellent communication skills noted",
      time: "2 hours ago",
      icon: "🎤",
      color: "bg-purple-500/20",
      action: "View Feedback"
    },
    {
      id: 2,
      type: "application",
      title: "Applied for Software Engineer Internship",
      description: "Google Summer Internship 2024 - Status: Under Review",
      time: "1 day ago",
      icon: "💼",
      color: "bg-blue-500/20",
      action: "Track Application"
    },
    {
      id: 3,
      type: "certificate",
      title: "Earned React Advanced Certificate",
      description: "Completed Advanced React Patterns course with 95% score",
      time: "3 days ago",
      icon: "📜",
      color: "bg-yellow-500/20",
      action: "View Certificate"
    },
    {
      id: 4,
      type: "test",
      title: "Completed DSA Mock Test",
      description: "Score: 92% - Improved by 15% from last attempt",
      time: "1 week ago",
      icon: "📝",
      color: "bg-green-500/20",
      action: "Review Answers"
    },
    {
      id: 5,
      type: "mentorship",
      title: "Booked Mentorship Session",
      description: "With Ankit Kumar (Google) - Scheduled for March 25",
      time: "2 weeks ago",
      icon: "👥",
      color: "bg-pink-500/20",
      action: "Join Session"
    }
  ];

  const monthlyData = [
    { month: "Jan", interviews: 3, score: 70 },
    { month: "Feb", interviews: 5, score: 75 },
    { month: "Mar", interviews: 8, score: 85 },
    { month: "Apr", interviews: 6, score: 82 },
    { month: "May", interviews: 10, score: 88 },
    { month: "Jun", interviews: 12, score: 90 },
  ];

  const averageScore = feedbacks.length > 0 
    ? Math.round(feedbacks.reduce((acc, f) => acc + (f.totalScore || 0), 0) / feedbacks.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Interviews"
          value={interviews.length}
          change="+3 this month"
          icon="🎤"
          trend="up"
        />
        <StatsCard
          title="Average Score"
          value={averageScore}
          change="+8% improvement"
          icon="⭐"
          trend="up"
        />
        <StatsCard
          title="Applications"
          value={8}
          change="+2 active"
          icon="📄"
          trend="up"
        />
        <StatsCard
          title="Certificates"
          value={3}
          change="Earned 1 new"
          icon="📜"
          trend="up"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Chart */}
        <div className="lg:col-span-2">
          <div className="card-border">
            <div className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Performance Trend</h2>
                <select className="bg-dark-200 text-light-100 text-sm px-3 py-1 rounded-lg">
                  <option>Last 6 months</option>
                  <option>Last 3 months</option>
                  <option>Last year</option>
                </select>
              </div>
              <ProgressChart data={monthlyData} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <div className="card-border">
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6">Quick Stats</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Interview Performance</span>
                    <span className="text-sm font-bold">85%</span>
                  </div>
                  <div className="w-full bg-dark-200 rounded-full h-2">
                    <div className="bg-success-100 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Profile Completion</span>
                    <span className="text-sm font-bold">70%</span>
                  </div>
                  <div className="w-full bg-dark-200 rounded-full h-2">
                    <div className="bg-primary-200 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Skill Coverage</span>
                    <span className="text-sm font-bold">60%</span>
                  </div>
                  <div className="w-full bg-dark-200 rounded-full h-2">
                    <div className="bg-primary-200 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Network Strength</span>
                    <span className="text-sm font-bold">45%</span>
                  </div>
                  <div className="w-full bg-dark-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card-border">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <button className="text-sm text-primary-200 hover:underline">
              View All Activity
            </button>
          </div>
          <ActivityTimeline activities={recentActivities} />
        </div>
      </div>

      {/* Skills Overview */}
      <div className="card-border">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6">Skills Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { skill: "React", level: 85, color: "bg-blue-500" },
              { skill: "Node.js", level: 75, color: "bg-green-500" },
              { skill: "System Design", level: 65, color: "bg-purple-500" },
              { skill: "DSA", level: 80, color: "bg-yellow-500" },
              { skill: "Communication", level: 90, color: "bg-pink-500" },
              { skill: "Problem Solving", level: 85, color: "bg-indigo-500" },
              { skill: "Leadership", level: 70, color: "bg-red-500" },
              { skill: "Teamwork", level: 88, color: "bg-teal-500" },
            ].map((item) => (
              <div key={item.skill} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{item.skill}</span>
                  <span className="text-sm text-light-100">{item.level}%</span>
                </div>
                <div className="w-full bg-dark-200 rounded-full h-2">
                  <div 
                    className={`${item.color} h-2 rounded-full`} 
                    style={{ width: `${item.level}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}