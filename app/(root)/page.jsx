import { getCurrentUser } from "@/lib/actions/auth.action";
import FeaturedCard from "@/components/FeaturedCard";
import QuickAccess from "@/components/QuickAccess";
import ChallengeSection from "@/components/ChallengeSection";
import StatsOverview from "@/components/StatsOverview";
import LandingPage from "@/components/LandingPage";
import { getFeaturedItems } from "@/lib/actions/featured.action";

export default async function HomePage() {
  const user = await getCurrentUser();
  
  const isLoggedIn = user && user.email !== "guest@example.com";

  if (!isLoggedIn) {
    return <LandingPage />;
  }
  
  const featuredItems = await getFeaturedItems();

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
    </div>
  );
}