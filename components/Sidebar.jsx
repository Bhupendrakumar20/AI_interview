// components/Sidebar.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Icon component
const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    home: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11L9 7" /></svg>,
    briefcase: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4m0 0H8m0 0v2M3 21h18M3 3h18v10c0 .621-.504 1.235-1.738 2.082C18.565 17.495 15.828 18.5 12 18.5c-3.828 0-6.565-1.005-8.262-2.418C4.504 15.235 4 14.621 4 14V3z" /></svg>,
    trophy: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    clipboard: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    phone: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
    users: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.048M12 4.354V2m6.354 6.354h2.048m-2.048 0a4 4 0 110-8.048M12 20v2m6.354-2.646h2.048m-2.048 0a4 4 0 110-8.048M12 20a8 8 0 100-16" /></svg>,
    zap: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    book: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.228 6.228 2 7.486 2 8.25v10.5C2 19.478 6.228 20.75 12 20.75c5.771 0 10-1.272 10-2.5V8.25c0-.764-4.228-2.022-10-2.022zm0 13l9-4.5" /></svg>,
    database: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
    "trending-up": <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    user: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    settings: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>,
    "message-circle": <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    star: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>,
    default: <span className="w-5 h-5">•</span>,
  };
  return icons[name] || icons.default;
};

const Sidebar = ({ user }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const mainMenu = [
    { label: "Home", href: "/", icon: "home" },
    { label: "Internships", href: "/internships", icon: "briefcase" },
    { label: "Jobs", href: "/jobs", icon: "briefcase" },
    { label: "Competitions", href: "/competitions", icon: "trophy" },
    { label: "Mock Tests", href: "/mock-test", icon: "clipboard" },
    { label: "Mock Interviews", href: "/interview", icon: "phone" },
    { label: "Mentorship", href: "/mentorship", icon: "users" },
    { label: "100 Days to Code", href: "/100-days-of-code", icon: "zap" },
    { label: "Courses", href: "/courses", icon: "book" },
    { label: "Question Bank", href: "/question-bank", icon: "database" },
    { label: "Analytics", href: "/analytics", icon: "trending-up" },
    { label: "Profile", href: "/profile", icon: "user" },
    { label: "Settings", href: "/settings", icon: "settings" },
    { label: "Salary Negotiate", href: "/salary-negotiation", icon: "message-circle" },
    { label: "Upgrade", href: "/upgrade", icon: "star" },
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
    { label: "Saved Internships", href: "/saved-internships" },
  ];

  return (
    <aside className={cn(
      "sticky top-0 h-screen border-r border-dark-300 bg-linear-to-b from-dark-100 to-dark-200 transition-all duration-300 z-40 shadow-lg",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-dark-300 bg-dark-150">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/prepwise_logo.png" alt="logo" width={32} height={32} className="rounded-md" />
            {!collapsed && (
              <div>
                <h2 className="text-primary-100 font-bold text-lg">PrepWise</h2>
                <p className="text-xs text-light-300">Career Platform</p>
              </div>
            )}
          </Link>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-dark-300">
          <div className="flex items-center gap-3">
            <div className="bg-linear-to-br from-primary-200 to-primary-300 rounded-full size-10 flex items-center justify-center shadow-md">
              <span className="text-dark-100 font-bold text-sm">
                {user?.name?.charAt(0) || "U"}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-light-50 truncate text-sm">{user?.name || "User"}</p>
                <p className="text-xs text-light-300">Student</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {mainMenu.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group hover:scale-[1.02]",
                    isActive
                      ? "bg-primary-200 text-dark-100 font-semibold shadow-md hover:shadow-lg"
                      : "hover:bg-dark-200 text-light-200 hover:text-light-50 hover:shadow-md hover:shadow-primary-200/10"
                  )}
                >
                  <div className={cn(
                    "shrink-0 transition-transform duration-200",
                    !isActive && "group-hover:scale-110"
                  )}>
                    <Icon name={item.icon} className="w-5 h-5" />
                  </div>
                  {!collapsed && <span className="truncate text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Dashboard Section */}
          {!collapsed && (
            <>
              <div className="mt-6 mb-3 px-4">
                <h3 className="text-xs font-bold text-light-400 uppercase tracking-wider">Your Dashboards</h3>
              </div>
              <div className="space-y-1 px-2">
                {dashboardItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-300 group hover:scale-[1.02]",
                        isActive
                          ? "bg-primary-200/20 text-primary-100 font-semibold hover:bg-primary-200/30"
                          : "hover:bg-dark-200 text-light-300 hover:text-light-100 hover:shadow-md hover:shadow-primary-200/5"
                      )}
                    >
                      <span className="text-xs opacity-60">›</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Collapse Button */}
        <div className="p-3 border-t border-dark-300 bg-dark-150">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full p-2 rounded-lg bg-dark-200 hover:bg-dark-300 text-light-200 hover:text-primary-100 transition-all duration-200 flex items-center justify-center font-semibold text-sm"
          >
            {collapsed ? "»" : "«"}
            {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;