// app/(root)/dashboard/layout.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const navItems = [
    { label: "Activity", href: "/dashboard/activity" },
    { label: "Applications", href: "/dashboard/applications" },
    { label: "Rounds", href: "/dashboard/rounds" },
    { label: "Courses", href: "/dashboard/courses" },
    { label: "Sessions", href: "/dashboard/sessions" },
    { label: "Certificates", href: "/dashboard/certificates" },
    { label: "Recently Viewed", href: "/dashboard/recent" },
    { label: "Watchlist", href: "/dashboard/watchlist" },
    { label: "Bookmarked", href: "/dashboard/bookmarked" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Dashboard</h1>
          <p className="text-light-100">Welcome back, {user.name}! Track your progress here.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-light-100">Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
          <p className="text-xs text-light-400">Premium User</p>
        </div>
      </div>
      
      <DashboardNav items={navItems} />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}