// app/(root)/dashboard/sessions/page.jsx
import { Button } from "@/components/ui/button";

export default function SessionsPage() {
  const sessions = [
    {
      id: 1,
      title: "Frontend System Design",
      type: "Mock Interview",
      mentor: "Ankit Kumar",
      company: "Google",
      date: "2024-03-25",
      time: "10:00 AM - 11:00 AM",
      duration: "60 mins",
      status: "upcoming",
      preparation: "Review React patterns and system design basics",
      meetingLink: "https://meet.google.com/xyz-abc-def"
    },
    {
      id: 2,
      title: "DSA Problem Solving",
      type: "Practice Session",
      mentor: "Priya Sharma",
      company: "Meta",
      date: "2024-03-22",
      time: "2:00 PM - 3:30 PM",
      duration: "90 mins",
      status: "completed",
      feedback: "Excellent problem-solving skills. Work on time complexity analysis.",
      score: 88,
      recording: "https://drive.google.com/recording-1"
    },
    {
      id: 3,
      title: "Behavioral Interview Prep",
      type: "Mentorship",
      mentor: "Rohan Verma",
      company: "Amazon",
      date: "2024-03-20",
      time: "4:00 PM - 4:45 PM",
      duration: "45 mins",
      status: "completed",
      feedback: "Strong communication. Prepare more STAR method examples.",
      score: 92,
      recording: "https://drive.google.com/recording-2"
    },
    {
      id: 4,
      title: "System Architecture Review",
      type: "Mock Interview",
      mentor: "Sneha Patel",
      company: "Netflix",
      date: "2024-03-18",
      time: "11:00 AM - 12:00 PM",
      duration: "60 mins",
      status: "completed",
      feedback: "Good architecture thinking. Need to consider edge cases more.",
      score: 78,
      recording: "https://drive.google.com/recording-3"
    }
  ];

  const upcomingSessions = sessions.filter(s => s.status === "upcoming");
  const completedSessions = sessions.filter(s => s.status === "completed");

  const stats = {
    total: sessions.length,
    upcoming: upcomingSessions.length,
    completed: completedSessions.length,
    averageScore: Math.round(completedSessions.reduce((a, b) => a + (b.score || 0), 0) / completedSessions.length)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Sessions</h1>
          <p className="text-light-100">Track your mentorship and practice sessions</p>
        </div>
        <Button className="btn-primary">Book New Session</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-light-100">Total Sessions</div>
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
            <div className="text-2xl font-bold text-success-100">{stats.completed}</div>
            <div className="text-sm text-light-100">Completed</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.averageScore || 0}/100</div>
            <div className="text-sm text-light-100">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Upcoming Sessions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="card-border">
                <div className="card p-4">
                  <h4 className="font-bold text-lg mb-2">{session.title}</h4>
                  <p className="text-sm text-light-100 mb-2">Status: {session.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Completed Sessions</h2>
            <Button variant="ghost" className="text-primary-200">
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedSessions.map((session) => (
              <div key={session.id} className="card-border">
                <div className="card p-4">
                  <h4 className="font-bold text-lg mb-2">{session.title}</h4>
                  <p className="text-sm text-light-100 mb-2">Status: {session.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Schedule New Session */}
      <div className="card-border">
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Need More Practice?</h2>
              <p className="text-light-100">Book a session with our expert mentors</p>
            </div>
            <div className="flex gap-3">
              <Button className="btn-secondary">Browse Mentors</Button>
              <Button className="btn-primary">Schedule Mock Interview</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Session Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">▲</div>
            <h3 className="font-semibold mb-2">Set Clear Goals</h3>
            <p className="text-sm text-light-100">Define what you want to achieve in each session</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">✍</div>
            <h3 className="font-semibold mb-2">Take Notes</h3>
            <p className="text-sm text-light-100">Document feedback and action items</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">⟳</div>
            <h3 className="font-semibold mb-2">Regular Practice</h3>
            <p className="text-sm text-light-100">Consistency is key to improvement</p>
          </div>
        </div>
      </div>
    </div>
  );
}