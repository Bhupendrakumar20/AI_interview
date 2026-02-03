// components/Sidebar.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const Sidebar = ({ user }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const mainMenu = [
    { label: "Home", href: "/", icon: "🏠" },
    { label: "Internships", href: "/internships", icon: "💼" },
    { label: "Jobs", href: "/jobs", icon: "💰" },
    { label: "Competitions", href: "/competitions", icon: "🏆" },
    { label: "Mock Tests", href: "/mock-tests", icon: "📝" },
    { label: "Mock Interviews", href: "/interview", icon: "🎤" },
    { label: "Mentorship", href: "/mentorship", icon: "👥" },
    { label: "100 Days to Code", href: "/100-days-code", icon: "👨‍💻" },
    { label: "Courses", href: "/courses", icon: "📚" },
    { label: "Question Bank", href: "/question-bank", icon: "📖" },
    { label: "Analytics", href: "/analytics", icon: "📊" },
    { label: "Profile", href: "/profile", icon: "👤" },
    { label: "Settings", href: "/settings", icon: "⚙️" },
    { label: "Salary Negotiate", href: "/salary-negotiation", icon: "💬" },
    { label: "Upgrade", href: "/upgrade", icon: "⭐" },
  ];

  const dashboardItems = [
    { label: "My Activity", href: "/dashboard/activity" },
    { label: "My Applications", href: "/dashboard/applications" },
    { label: "My Rounds", href: "/dashboard/rounds" },
    { label: "My Courses", href: "/dashboard/courses" },
    { label: "My Sessions", href: "/dashboard/sessions" },
    { label: "My Certificates", href: "/dashboard/certificates" },
    { label: "Recently Viewed", href: "/dashboard/recent" },
    { label: "Watchlist", href: "/dashboard/watchlist" },
    { label: "Bookmarked Qs", href: "/dashboard/bookmarked" },
  ];

  return (
    <aside className={cn(
      "sticky top-0 h-screen border-r border-dark-200 bg-dark-100 transition-all duration-300 z-40",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-dark-200">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="logo" width={32} height={32} />
            {!collapsed && (
              <div>
                <h2 className="text-primary-100 font-bold">PrepWise</h2>
                <p className="text-xs text-light-100">Career Platform</p>
              </div>
            )}
          </Link>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-dark-200">
          <div className="flex items-center gap-3">
            <div className="bg-primary-200 rounded-full size-10 flex items-center justify-center">
              <span className="text-dark-100 font-bold">
                {user?.name?.charAt(0) || "U"}
              </span>
            </div>
            {!collapsed && (
              <div>
                <p className="font-medium truncate">{user?.name || "User"}</p>
                <p className="text-xs text-light-100">Student</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {mainMenu.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary-200 text-dark-100 font-semibold"
                      : "hover:bg-dark-200 text-light-100"
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Dashboard Section */}
          {!collapsed && (
            <>
              <div className="mt-6 mb-2 px-3">
                <h3 className="text-sm font-semibold text-light-400">Your Dashboards</h3>
              </div>
              <div className="space-y-1">
                {dashboardItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                        isActive
                          ? "bg-primary-200/20 text-primary-200 font-semibold"
                          : "hover:bg-dark-200 text-light-100"
                      )}
                    >
                      <span className="text-xs">•</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="m-4 p-2 rounded-lg bg-dark-200 hover:bg-dark-300 text-center text-light-100"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;