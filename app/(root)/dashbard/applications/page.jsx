// app/(root)/dashboard/applications/page.jsx
import { Button } from "@/components/ui/button";

export default function ApplicationsPage() {
  const applications = [
    {
      id: 1,
      title: "Software Engineer Intern",
      company: "Google",
      logo: "/google.png",
      status: "Under Review",
      date: "2024-03-15",
      type: "internship",
      location: "Mountain View, CA",
      salary: "$8,000/month",
      progress: [
        { stage: "Applied", completed: true, date: "Mar 15", details: "Application submitted" },
        { stage: "OA", completed: true, date: "Mar 20", details: "Online assessment completed" },
        { stage: "Technical", completed: false, date: "Pending", details: "Scheduled for Mar 28" },
        { stage: "HR", completed: false, date: "Pending", details: "To be scheduled" },
        { stage: "Offer", completed: false, date: "Pending", details: "Decision pending" },
      ]
    },
    {
      id: 2,
      title: "Frontend Developer",
      company: "Microsoft",
      logo: "/microsoft.png",
      status: "Interview Scheduled",
      date: "2024-03-10",
      type: "job",
      location: "Redmond, WA",
      salary: "$160,000/year",
      progress: [
        { stage: "Applied", completed: true, date: "Mar 10", details: "Application submitted" },
        { stage: "Screening", completed: true, date: "Mar 15", details: "Phone screen passed" },
        { stage: "Technical", completed: true, date: "Mar 18", details: "Technical round completed" },
        { stage: "System Design", completed: false, date: "Mar 25", details: "Scheduled" },
        { stage: "Final", completed: false, date: "Pending", details: "To be scheduled" },
      ]
    },
    {
      id: 3,
      title: "Full Stack Developer",
      company: "StartupX",
      logo: "/startupx.png",
      status: "Offer Received",
      date: "2024-03-05",
      type: "job",
      location: "Remote",
      salary: "$120,000/year",
      progress: [
        { stage: "Applied", completed: true, date: "Mar 5", details: "Application submitted" },
        { stage: "Interview", completed: true, date: "Mar 10", details: "Initial interview" },
        { stage: "Technical", completed: true, date: "Mar 12", details: "Technical challenge" },
        { stage: "Culture Fit", completed: true, date: "Mar 14", details: "Culture interview" },
        { stage: "Offer", completed: true, date: "Mar 15", details: "Offer letter received" },
      ]
    },
    {
      id: 4,
      title: "Data Science Intern",
      company: "Amazon",
      logo: "/amazon.png",
      status: "Rejected",
      date: "2024-02-28",
      type: "internship",
      location: "Seattle, WA",
      salary: "$9,000/month",
      progress: [
        { stage: "Applied", completed: true, date: "Feb 28", details: "Application submitted" },
        { stage: "OA", completed: true, date: "Mar 5", details: "Online assessment" },
        { stage: "Interview", completed: true, date: "Mar 10", details: "Technical interview" },
        { stage: "Case Study", completed: true, date: "Mar 12", details: "Case study review" },
        { stage: "Rejected", completed: true, date: "Mar 12", details: "Not selected" },
      ]
    },
    {
      id: 5,
      title: "Product Manager",
      company: "Meta",
      logo: "/meta.png",
      status: "Under Review",
      date: "2024-03-18",
      type: "job",
      location: "Menlo Park, CA",
      salary: "$180,000/year",
      progress: [
        { stage: "Applied", completed: true, date: "Mar 18", details: "Application submitted" },
        { stage: "Screening", completed: false, date: "Pending", details: "Awaiting review" },
        { stage: "Case Study", completed: false, date: "Pending", details: "To be assigned" },
        { stage: "Interviews", completed: false, date: "Pending", details: "Multiple rounds" },
        { stage: "Decision", completed: false, date: "Pending", details: "Final decision" },
      ]
    },
  ];

  const stats = {
    total: applications.length,
    active: applications.filter(app => ["Under Review", "Interview Scheduled"].includes(app.status)).length,
    offers: applications.filter(app => app.status === "Offer Received").length,
    rejected: applications.filter(app => app.status === "Rejected").length,
    interviews: applications.filter(app => app.status === "Interview Scheduled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Applications</h1>
          <p className="text-light-100">Track all your job and internship applications</p>
        </div>
        <Button className="btn-primary">
          + Track New Application
        </Button>
      </div>

      {/* Stats */}
      <ApplicationStats stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button className="px-4 py-2 bg-primary-200 text-dark-100 rounded-full font-semibold">
          All ({stats.total})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Active ({stats.active})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Interviews ({stats.interviews})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Offers ({stats.offers})
        </button>
        <button className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300">
          Rejected ({stats.rejected})
        </button>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.map((application) => (
          <div key={application.id} className="card-border">
            <div className="card p-4">
              <h4 className="font-bold text-lg mb-2">{application.title} at {application.company}</h4>
              <p className="text-sm text-light-100 mb-2">Status: {application.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {applications.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⊞</div>
          <h3 className="text-xl font-bold mb-2">No applications yet</h3>
          <p className="text-light-100 mb-6">Start applying to jobs and internships to track your progress here.</p>
          <Button className="btn-primary">
            Browse Opportunities
          </Button>
        </div>
      )}
    </div>
  );
}