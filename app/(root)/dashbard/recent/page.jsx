// app/(root)/dashboard/recent/page.jsx
import { Button } from "@/components/ui/button";

export default function RecentPage() {
  const recentItems = [
    {
      id: 1,
      type: "job",
      title: "Senior Frontend Engineer",
      company: "Netflix",
      viewedAt: "2 hours ago",
      image: "/companies/netflix.png",
      location: "Los Gatos, CA",
      salary: "$180,000 - $250,000"
    },
    {
      id: 2,
      type: "course",
      title: "Advanced React Patterns",
      instructor: "Sarah Johnson",
      viewedAt: "1 day ago",
      image: "/courses/react.png",
      rating: 4.8,
      students: "15K"
    },
    {
      id: 3,
      type: "mentor",
      name: "Ankit Kumar",
      role: "Senior Engineer @ Google",
      viewedAt: "2 days ago",
      image: "/mentors/ankit.png",
      rating: 4.9,
      sessions: 245
    },
    {
      id: 4,
      type: "competition",
      title: "Quest Ingenium",
      organizer: "Engineering Association",
      viewedAt: "3 days ago",
      image: "/competitions/ingenium.png",
      prize: "₹2,00,000",
      deadline: "2024-04-30"
    },
    {
      id: 5,
      type: "internship",
      title: "Software Engineer Intern",
      company: "Google",
      viewedAt: "1 week ago",
      image: "/companies/google.png",
      duration: "3 months",
      stipend: "$8,000/month"
    },
    {
      id: 6,
      type: "article",
      title: "System Design Interview Guide",
      author: "Alex Xu",
      viewedAt: "2 weeks ago",
      image: "/articles/system-design.png",
      readTime: "15 min",
      category: "Interview Prep"
    }
  ];

  const categories = [
    { label: "All", count: recentItems.length },
    { label: "Jobs", count: recentItems.filter(item => item.type === "job").length },
    { label: "Courses", count: recentItems.filter(item => item.type === "course").length },
    { label: "Mentors", count: recentItems.filter(item => item.type === "mentor").length },
    { label: "Competitions", count: recentItems.filter(item => item.type === "competition").length },
    { label: "Internships", count: recentItems.filter(item => item.type === "internship").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Recently Viewed</h1>
          <p className="text-light-100">Quickly access items you've viewed recently</p>
        </div>
        <Button 
          variant="ghost" 
          className="text-primary-200"
          onClick={() => {
            // Clear recent items logic
          }}
        >
          Clear All
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.label}
            className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300"
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Recent Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentItems.map((item) => (
          <div key={item.id} className="card-border">
            <div className="card p-4">
              <h4 className="font-bold text-lg mb-2">{item.title}</h4>
              <p className="text-sm text-light-100 mb-2">Viewed {item.viewedAt}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {recentItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👀</div>
          <h3 className="text-xl font-bold mb-2">No recent items</h3>
          <p className="text-light-100 mb-6">Start browsing jobs, courses, and mentors to see them here.</p>
          <div className="flex justify-center gap-4">
            <Button className="btn-primary">Browse Jobs</Button>
            <Button className="btn-secondary">Explore Courses</Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card-border">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-dark-200 rounded-lg text-center hover:bg-dark-300">
              <div className="text-2xl mb-2">💼</div>
              <div className="text-sm">Apply to Jobs</div>
            </button>
            <button className="p-4 bg-dark-200 rounded-lg text-center hover:bg-dark-300">
              <div className="text-2xl mb-2">📚</div>
              <div className="text-sm">Continue Course</div>
            </button>
            <button className="p-4 bg-dark-200 rounded-lg text-center hover:bg-dark-300">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-sm">Book Session</div>
            </button>
            <button className="p-4 bg-dark-200 rounded-lg text-center hover:bg-dark-300">
              <div className="text-2xl mb-2">🏆</div>
              <div className="text-sm">Join Competition</div>
            </button>
          </div>
        </div>
      </div>

      {/* Viewing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-lg font-bold">{recentItems.length}</div>
            <div className="text-sm text-light-100">Items Viewed</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">⏱️</div>
            <div className="text-lg font-bold">Today</div>
            <div className="text-sm text-light-100">Most Active Day</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-lg font-bold">Jobs</div>
            <div className="text-sm text-light-100">Most Viewed Category</div>
          </div>
        </div>
      </div>
    </div>
  );
}