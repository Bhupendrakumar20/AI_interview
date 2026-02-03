// app/(root)/dashboard/watchlist/page.jsx
import WatchlistCard from "@/components/WatchlistCard";
import { Button } from "@/components/ui/button";

export default function WatchlistPage() {
  const watchlistItems = [
    {
      id: 1,
      type: "job",
      title: "Senior Frontend Engineer",
      company: "Netflix",
      addedAt: "2024-03-20",
      expiresAt: "2024-04-15",
      image: "/companies/netflix.png",
      location: "Los Gatos, CA",
      salary: "$180,000 - $250,000",
      status: "active",
      alerts: true
    },
    {
      id: 2,
      type: "course",
      title: "Advanced React Patterns",
      instructor: "Sarah Johnson",
      addedAt: "2024-03-18",
      expiresAt: "2024-06-18",
      image: "/courses/react.png",
      provider: "Frontend Masters",
      price: "$299",
      rating: 4.8,
      status: "active",
      alerts: true
    },
    {
      id: 3,
      type: "competition",
      title: "Quest Ingenium",
      organizer: "Engineering Association",
      addedAt: "2024-03-15",
      expiresAt: "2024-04-30",
      image: "/competitions/ingenium.png",
      prize: "₹2,00,000",
      participants: "50,000+",
      status: "active",
      alerts: true
    },
    {
      id: 4,
      type: "internship",
      title: "Software Engineer Intern",
      company: "Google",
      addedAt: "2024-03-10",
      expiresAt: "2024-04-15",
      image: "/companies/google.png",
      duration: "3 months",
      stipend: "$8,000/month",
      status: "expired",
      alerts: false
    },
    {
      id: 5,
      type: "mentor",
      name: "Ankit Kumar",
      role: "Senior Engineer @ Google",
      addedAt: "2024-03-05",
      image: "/mentors/ankit.png",
      rate: "$100/hour",
      rating: 4.9,
      availability: ["Mon", "Wed", "Fri"],
      status: "active",
      alerts: true
    }
  ];

  const stats = {
    total: watchlistItems.length,
    active: watchlistItems.filter(item => item.status === "active").length,
    expired: watchlistItems.filter(item => item.status === "expired").length,
    withAlerts: watchlistItems.filter(item => item.alerts).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Watchlist</h1>
          <p className="text-light-100">Track opportunities and get notified about updates</p>
        </div>
        <Button className="btn-primary">+ Add to Watchlist</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-light-100">Total Items</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-200">{stats.active}</div>
            <div className="text-sm text-light-100">Active</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.expired}</div>
            <div className="text-sm text-light-100">Expired</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-success-100">{stats.withAlerts}</div>
            <div className="text-sm text-light-100">Alerts On</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button className="px-4 py-2 bg-primary-200 text-dark-100 rounded-full font-semibold">
          All ({stats.total})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Active ({stats.active})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Jobs ({watchlistItems.filter(item => item.type === "job").length})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Courses ({watchlistItems.filter(item => item.type === "course").length})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          With Alerts ({stats.withAlerts})
        </button>
      </div>

      {/* Watchlist Items */}
      <div className="space-y-4">
        {watchlistItems.map((item) => (
          <WatchlistCard key={item.id} item={item} />
        ))}
      </div>

      {/* Empty State */}
      {watchlistItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-xl font-bold mb-2">Your watchlist is empty</h3>
          <p className="text-light-100 mb-6">Save jobs, courses, and opportunities to track them here.</p>
          <div className="flex justify-center gap-4">
            <Button className="btn-primary">Browse Jobs</Button>
            <Button className="btn-secondary">Explore Courses</Button>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      <div className="card-border">
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Notification Settings</h2>
              <p className="text-light-100">Customize how you receive updates</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost">Email Settings</Button>
              <Button className="btn-primary">Push Notifications</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" />
              <span className="text-sm">Deadline Reminders</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" />
              <span className="text-sm">Price Drops</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" />
              <span className="text-sm">New Opportunities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}