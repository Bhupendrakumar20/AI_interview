// app/(root)/jobs/page.jsx
import JobCard from "@/components/JobCard";

export default function JobsPage() {
  const jobs = [
    {
      id: 1,
      title: "Senior Frontend Engineer",
      company: "Netflix",
      location: "Los Gatos, CA",
      salary: "$180,000 - $250,000",
      experience: "5+ years",
      type: "Full-time",
      posted: "2 days ago",
      skills: ["React", "TypeScript", "Next.js", "GraphQL"],
    },
    {
      id: 2,
      title: "Backend Developer",
      company: "Stripe",
      location: "San Francisco, CA",
      salary: "$160,000 - $220,000",
      experience: "3+ years",
      type: "Full-time",
      posted: "1 week ago",
      skills: ["Node.js", "Python", "AWS", "PostgreSQL"],
    },
    {
      id: 3,
      title: "Machine Learning Engineer",
      company: "OpenAI",
      location: "Remote",
      salary: "$200,000 - $300,000",
      experience: "4+ years",
      type: "Full-time",
      posted: "3 days ago",
      skills: ["Python", "PyTorch", "TensorFlow", "MLOps"],
    },
    {
      id: 4,
      title: "DevOps Engineer",
      company: "GitHub",
      location: "Remote",
      salary: "$150,000 - $200,000",
      experience: "3+ years",
      type: "Full-time",
      posted: "1 day ago",
      skills: ["Kubernetes", "Docker", "AWS", "CI/CD"],
    },
    {
      id: 5,
      title: "Product Designer",
      company: "Figma",
      location: "San Francisco, CA",
      salary: "$140,000 - $190,000",
      experience: "4+ years",
      type: "Full-time",
      posted: "5 days ago",
      skills: ["Figma", "UI/UX", "Prototyping", "Design Systems"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Job Opportunities</h1>
        <p className="text-light-100">
          Find your dream job from top tech companies
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}