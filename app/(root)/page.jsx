import { getCurrentUser } from "@/lib/actions/auth.action";
import { getLatestInterviews, getInterviewsByUserId } from "@/lib/actions/general.action";
import FeaturedCard from "@/components/FeaturedCard";
import InterviewCard from "@/components/InterviewCard";
import QuickAccess from "@/components/QuickAccess";
import ChallengeSection from "@/components/ChallengeSection";
import StatsOverview from "@/components/StatsOverview";

export default async function HomePage() {
  const user = await getCurrentUser();
  
  // Fetch data
  const latestInterviews = await getLatestInterviews({ 
    userId: user?.id, 
    limit: 6 
  });
  
  const userInterviews = user ? await getInterviewsByUserId(user.id) : [];

  const featuredItems = [
    {
      title: "One Day Internship",
      company: "with Ankit",
      description: "Quick internship opportunity to gain real-world experience",
      type: "internship",
      buttonText: "Apply Now",
      badge: "One Day"
    },
    {
      title: "Quest Ingenium",
      company: "Solving the world's hardest engineering problems",
      description: "Win prizes and get engineering facility visits",
      type: "competition",
      prize: "₹2,00,000+",
      stats: ["2,00,000+ Runners-Up", "1,60,000+ Overviews", "Engineering Facility Visit"],
      buttonText: "Register Now"
    },
    {
      title: "tbo.com",
      description: "Stand a chance to win Rs 3 lacs prize money and gain interview opportunities",
      type: "competition",
      prize: "₹3,0,000",
      buttonText: "Learn More"
    },
    {
      title: "Unstop Talent Awards",
      description: "Unstoppable Talent. Unmatched Impact.",
      type: "award",
      buttonText: "View Awards"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-8">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent dark:bg-linear-to-r dark:from-primary-100 dark:to-primary-200">
          Unlock Your Career!
        </h1>
        <p className="text-slate-600 dark:text-light-100 text-lg max-w-2xl mx-auto">
          Practice interviews, find opportunities, and accelerate your career growth
        </p>
      </section>

      {/* Featured Section */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Featured</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredItems.map((item, index) => (
            <FeaturedCard key={index} {...item} />
          ))}
        </div>
      </section>

      {/* Quick Access */}
      <QuickAccess />

      {/* Stats Overview */}
      <StatsOverview />

      {/* 100 Days to Code Challenge */}
      <ChallengeSection />

      {/* Recent Interviews */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Recent Practice Sessions</h2>
          <a href="/interview" className="btn-secondary">View All</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestInterviews.slice(0, 3).map((interview) => (
            <InterviewCard
              key={interview.id}
              interviewId={interview.id}
              userId={interview.userId}
              role={interview.role}
              type={interview.type}
              techstack={interview.techstack}
              createdAt={interview.createdAt}
            />
          ))}
        </div>
      </section>

      {/* Your Interviews */}
      {user && userInterviews.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Your Interview History</h2>
            <a href="/dashboard/sessions" className="btn-secondary">View All</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userInterviews.slice(0, 3).map((interview) => (
              <InterviewCard
                key={interview.id}
                interviewId={interview.id}
                userId={interview.userId}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}