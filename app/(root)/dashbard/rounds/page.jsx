// app/(root)/dashboard/rounds/page.jsx
import { getInterviewsByUserId, getUserFeedbacks } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";

export default async function RoundsPage() {
  const user = await getCurrentUser();
  const interviews = await getInterviewsByUserId(user.id);
  const feedbacks = await getUserFeedbacks(user.id);

  const rounds = [
    {
      id: 1,
      title: "Google Technical Round",
      company: "Google",
      type: "Technical",
      date: "2024-03-28",
      time: "10:00 AM",
      duration: "45 mins",
      status: "upcoming",
      interviewer: "John Doe (Senior Engineer)",
      preparation: [
        "Review system design concepts",
        "Practice LeetCode problems",
        "Prepare for behavioral questions"
      ],
      link: "https://meet.google.com/xyz-abc-def"
    },
    {
      id: 2,
      title: "Microsoft System Design",
      company: "Microsoft",
      type: "System Design",
      date: "2024-03-25",
      time: "2:00 PM",
      duration: "60 mins",
      status: "upcoming",
      interviewer: "Jane Smith (Principal Architect)",
      preparation: [
        "Study scalability patterns",
        "Review database design",
        "Prepare for trade-off discussions"
      ],
      link: "https://teams.microsoft.com/l/meetup-join"
    },
    {
      id: 3,
      title: "Amazon Leadership Principles",
      company: "Amazon",
      type: "Behavioral",
      date: "2024-03-20",
      time: "11:00 AM",
      duration: "30 mins",
      status: "completed",
      result: "Passed",
      feedback: "Strong communication skills demonstrated",
      score: 85
    },
    {
      id: 4,
      title: "StartupX Coding Round",
      company: "StartupX",
      type: "Coding",
      date: "2024-03-18",
      time: "3:00 PM",
      duration: "90 mins",
      status: "completed",
      result: "Passed",
      feedback: "Excellent problem-solving approach",
      score: 92
    },
    {
      id: 5,
      title: "Meta Product Sense",
      company: "Meta",
      type: "Product",
      date: "2024-03-15",
      time: "9:00 AM",
      duration: "45 mins",
      status: "completed",
      result: "Needs Improvement",
      feedback: "Work on product thinking framework",
      score: 68
    }
  ];

  const stats = {
    total: rounds.length,
    upcoming: rounds.filter(r => r.status === "upcoming").length,
    completed: rounds.filter(r => r.status === "completed").length,
    passed: rounds.filter(r => r.result === "Passed").length,
    averageScore: Math.round(rounds.filter(r => r.score).reduce((a, b) => a + b.score, 0) / rounds.filter(r => r.score).length)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Interview Rounds</h1>
          <p className="text-light-100">Track and prepare for your upcoming interviews</p>
        </div>
        <div className="flex gap-3">
          <Button className="btn-secondary">Schedule Mock Interview</Button>
          <Button className="btn-primary">+ Add Round</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-light-100">Total Rounds</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-200">{stats.upcoming}</div>
            <div className="text-sm text-light-100">Upcoming</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-success-100">{stats.passed}</div>
            <div className="text-sm text-light-100">Passed</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.averageScore || 0}/100</div>
            <div className="text-sm text-light-100">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button className="px-4 py-2 bg-primary-200 text-dark-100 rounded-full font-semibold">
          All Rounds
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Upcoming
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Completed
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Technical
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Behavioral
        </button>
      </div>

      {/* Rounds List */}
      <div className="space-y-4">
        {rounds.map((round) => (
          <div key={round.id} className="card-border">
            <div className="card p-4">
              <h4 className="font-bold text-lg mb-2">{round.title}</h4>
              <p className="text-sm text-light-100 mb-2">Status: {round.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Preparation Tips */}
      <div className="card-border">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Interview Preparation Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Technical Rounds</h3>
              <ul className="text-sm text-light-100 space-y-1">
                <li>• Practice LeetCode daily</li>
                <li>• Review system design fundamentals</li>
                <li>• Study company-specific questions</li>
                <li>• Time your practice sessions</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Behavioral Rounds</h3>
              <ul className="text-sm text-light-100 space-y-1">
                <li>• Prepare STAR method stories</li>
                <li>• Research company culture</li>
                <li>• Practice with mock interviews</li>
                <li>• Prepare questions to ask</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Day Before</h3>
              <ul className="text-sm text-light-100 space-y-1">
                <li>• Get good sleep</li>
                <li>• Test your equipment</li>
                <li>• Review key concepts</li>
                <li>• Plan your outfit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}